import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { MemorySegment } from '../analysis/memory-segment.entity';
import { AppEventsService } from '../events/events.service';
import { MaskingStatus, RedactionSourceType } from '../masking/masking.constants';
import { TranscriptRedaction } from '../masking/transcript-redaction.entity';
import { VoiceProviderAsset } from '../voice-persona/voice-provider-asset.entity';
import {
  DATA_DELETION_CONFIRMATION,
  DataDeletionRequestStatus,
  DataDeletionScope,
  ProviderDeletionStatus,
} from './data-deletion.constants';
import { DataDeletionRequest } from './data-deletion-request.entity';
import {
  CreateDataDeletionRequestDto,
  UpdateDataDeletionRequestDto,
  UpdateProviderDeletionRecordDto,
} from './dto/data-deletion.dto';
import { ResearchExportPreviewQueryDto } from './dto/research-export-query.dto';
import { ProviderDeletionRecord } from './provider-deletion-record.entity';
import { ResearchExportPreference } from './research-export-preference.entity';

export type ResearchExportPreferenceState = {
  readonly optedIn: boolean;
  readonly optedInAt: string | null;
  readonly withdrawnAt: string | null;
};

export type ResearchExportPreviewRow = {
  readonly memorySegmentId: string;
  readonly ownerUserId: string;
  readonly subjectId: string;
  readonly recordingId: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly eligible: boolean;
  readonly redactedText: string | null;
  readonly exclusionReason: string | null;
};

@Injectable()
export class DataRightsService {
  constructor(
    @InjectRepository(ResearchExportPreference)
    private readonly preferencesRepository: Repository<ResearchExportPreference>,
    @InjectRepository(MemorySegment)
    private readonly memorySegmentsRepository: Repository<MemorySegment>,
    @InjectRepository(TranscriptRedaction)
    private readonly redactionsRepository: Repository<TranscriptRedaction>,
    @InjectRepository(DataDeletionRequest)
    private readonly deletionRequestsRepository: Repository<DataDeletionRequest>,
    @InjectRepository(ProviderDeletionRecord)
    private readonly providerDeletionRecordsRepository: Repository<ProviderDeletionRecord>,
    @InjectRepository(VoiceProviderAsset)
    private readonly providerAssetsRepository: Repository<VoiceProviderAsset>,
    private readonly auditService: AuditService,
    private readonly appEventsService: AppEventsService,
  ) {}

  async getResearchExportPreference(
    userId: string,
  ): Promise<ResearchExportPreferenceState> {
    return this.toPreferenceState(await this.findPreference(userId));
  }

  async optInResearchExport(
    userId: string,
  ): Promise<ResearchExportPreferenceState> {
    const preference =
      (await this.findPreference(userId)) ??
      this.preferencesRepository.create({ userId });
    const now = new Date();
    preference.optedIn = true;
    preference.optedInAt = now;
    preference.withdrawnAt = null;
    const savedPreference = await this.preferencesRepository.save(preference);

    await this.auditService.recordSensitiveWrite({
      actorUserId: userId,
      resourceType: 'research_export_preference',
      resourceId: savedPreference.id,
      metadata: { optedIn: true },
    });
    await this.appEventsService.emit({
      userId,
      name: 'research_export.opted_in',
      payload: { optedIn: true },
    });

    return this.toPreferenceState(savedPreference);
  }

  async withdrawResearchExport(
    userId: string,
  ): Promise<ResearchExportPreferenceState> {
    const preference =
      (await this.findPreference(userId)) ??
      this.preferencesRepository.create({ userId });
    const now = new Date();
    preference.optedIn = false;
    preference.withdrawnAt = now;
    const savedPreference = await this.preferencesRepository.save(preference);

    await this.auditService.recordSensitiveWrite({
      actorUserId: userId,
      resourceType: 'research_export_preference',
      resourceId: savedPreference.id,
      metadata: { optedIn: false },
    });
    await this.appEventsService.emit({
      userId,
      name: 'research_export.withdrawn',
      payload: { optedIn: false },
    });

    return this.toPreferenceState(savedPreference);
  }

  async previewRedactedResearchExport(
    actorUserId: string,
    query: ResearchExportPreviewQueryDto,
  ): Promise<{ rows: ResearchExportPreviewRow[] }> {
    const optedInPreferences = await this.preferencesRepository.find({
      where: { optedIn: true },
      take: 500,
    });
    const optedInUserIds = optedInPreferences.map((preference) => preference.userId);

    if (optedInUserIds.length === 0) {
      return { rows: [] };
    }

    const segments = await this.memorySegmentsRepository.find({
      where: {
        ownerUserId: In(optedInUserIds),
        ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      },
      order: { updatedAt: 'DESC' },
      take: query.limit ?? 50,
    });
    if (segments.length === 0) {
      return { rows: [] };
    }

    const redactions = await this.redactionsRepository.find({
      where: {
        sourceType: RedactionSourceType.MEMORY_SEGMENT,
        sourceId: In(segments.map((segment) => segment.id)),
      },
      order: { updatedAt: 'DESC' },
    });
    const latestRedactionBySegment = new Map<string, TranscriptRedaction>();
    for (const redaction of redactions) {
      if (!latestRedactionBySegment.has(redaction.sourceId)) {
        latestRedactionBySegment.set(redaction.sourceId, redaction);
      }
    }

    await this.auditService.recordSensitiveRead({
      actorUserId,
      resourceType: 'research_export_preview',
      metadata: {
        rowCount: segments.length,
        subjectId: query.subjectId ?? null,
      },
    });

    return {
      rows: segments.map((segment) =>
        this.toPreviewRow(segment, latestRedactionBySegment.get(segment.id)),
      ),
    };
  }

  async createDataDeletionRequest(ownerUserId: string, dto: CreateDataDeletionRequestDto) {
    if (dto.confirmation !== DATA_DELETION_CONFIRMATION) {
      throw new BadRequestException({
        code: 'invalid_deletion_confirmation',
        message: `Confirmation must exactly match "${DATA_DELETION_CONFIRMATION}".`,
      });
    }
    this.assertDeletionScopeTargets(dto);
    const deletionRequest = await this.deletionRequestsRepository.save(
      this.deletionRequestsRepository.create({
        ownerUserId,
        scope: dto.scope,
        subjectId: dto.subjectId ?? null,
        recordingId: dto.recordingId ?? null,
        status: DataDeletionRequestStatus.REQUESTED,
        reason: dto.reason ?? null,
        processedByUserId: null,
        processedAt: null,
      }),
    );
    const providerRecords = await this.createProviderDeletionRecords(
      deletionRequest,
    );
    await this.auditService.recordSensitiveWrite({
      actorUserId: ownerUserId,
      resourceType: 'data_deletion_request',
      resourceId: deletionRequest.id,
      subjectId: deletionRequest.subjectId,
      metadata: {
        scope: deletionRequest.scope,
        providerDeletionRecordCount: providerRecords.length,
      },
    });
    return { deletionRequest, providerDeletionRecords: providerRecords };
  }

  async updateDataDeletionRequest(
    requestId: string,
    actorUserId: string,
    dto: UpdateDataDeletionRequestDto,
  ) {
    const deletionRequest = await this.deletionRequestsRepository.findOne({
      where: { id: requestId },
    });
    if (!deletionRequest) {
      throw new NotFoundException('Data deletion request not found.');
    }
    deletionRequest.status = dto.status;
    deletionRequest.processedByUserId = actorUserId;
    deletionRequest.processedAt = new Date();
    const savedRequest = await this.deletionRequestsRepository.save(deletionRequest);
    await this.auditService.recordSensitiveWrite({
      actorUserId,
      resourceType: 'data_deletion_request',
      resourceId: savedRequest.id,
      subjectId: savedRequest.subjectId,
      metadata: { status: dto.status },
    });
    return savedRequest;
  }

  async updateProviderDeletionRecord(
    recordId: string,
    actorUserId: string,
    dto: UpdateProviderDeletionRecordDto,
  ) {
    const record = await this.providerDeletionRecordsRepository.findOne({
      where: { id: recordId },
    });
    if (!record) {
      throw new NotFoundException('Provider deletion record not found.');
    }
    record.status = dto.status;
    record.notes = dto.notes ?? record.notes;
    const savedRecord = await this.providerDeletionRecordsRepository.save(record);
    await this.auditService.recordSensitiveWrite({
      actorUserId,
      resourceType: 'provider_deletion_record',
      resourceId: savedRecord.id,
      subjectId: savedRecord.subjectId,
      metadata: { status: dto.status, providerName: savedRecord.providerName },
    });
    return savedRecord;
  }

  private async findPreference(
    userId: string,
  ): Promise<ResearchExportPreference | null> {
    return this.preferencesRepository.findOne({ where: { userId } });
  }

  private toPreferenceState(
    preference: ResearchExportPreference | null,
  ): ResearchExportPreferenceState {
    return {
      optedIn: preference?.optedIn ?? false,
      optedInAt: preference?.optedInAt?.toISOString() ?? null,
      withdrawnAt: preference?.withdrawnAt?.toISOString() ?? null,
    };
  }

  private toPreviewRow(
    segment: MemorySegment,
    redaction?: TranscriptRedaction,
  ): ResearchExportPreviewRow {
    const eligible =
      redaction?.status === MaskingStatus.SUCCEEDED ||
      redaction?.status === MaskingStatus.NOT_REQUIRED;

    return {
      memorySegmentId: segment.id,
      ownerUserId: segment.ownerUserId,
      subjectId: segment.subjectId,
      recordingId: segment.recordingId,
      startMs: segment.startMs,
      endMs: segment.endMs,
      eligible,
      redactedText: eligible ? redaction?.redactedText ?? null : null,
      exclusionReason: eligible ? null : redaction?.errorCode ?? 'missing_redaction',
    };
  }

  private assertDeletionScopeTargets(dto: CreateDataDeletionRequestDto): void {
    if (dto.scope === DataDeletionScope.SUBJECT && !dto.subjectId) {
      throw new BadRequestException({
        code: 'subject_required',
        message: 'subjectId is required for subject deletion requests.',
      });
    }
    if (dto.scope === DataDeletionScope.RECORDING && !dto.recordingId) {
      throw new BadRequestException({
        code: 'recording_required',
        message: 'recordingId is required for recording deletion requests.',
      });
    }
  }

  private async createProviderDeletionRecords(
    deletionRequest: DataDeletionRequest,
  ): Promise<ProviderDeletionRecord[]> {
    const providerAssets = await this.providerAssetsRepository.find({
      where: {
        ownerUserId: deletionRequest.ownerUserId,
        ...(deletionRequest.subjectId ? { subjectId: deletionRequest.subjectId } : {}),
      },
    });
    const records = providerAssets.map((asset) =>
      this.providerDeletionRecordsRepository.create({
        dataDeletionRequestId: deletionRequest.id,
        ownerUserId: deletionRequest.ownerUserId,
        subjectId: asset.subjectId,
        providerAssetId: asset.id,
        providerName: asset.providerName,
        externalAssetId: asset.externalAssetId,
        status: ProviderDeletionStatus.PENDING_MANUAL,
        notes: null,
      }),
    );
    return records.length > 0
      ? this.providerDeletionRecordsRepository.save(records)
      : [];
  }
}
