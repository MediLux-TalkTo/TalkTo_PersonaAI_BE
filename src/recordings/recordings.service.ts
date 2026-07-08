import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import {
  RecordingAnalysisStatus,
  RecordingUploadStatus,
} from '../common/enums/archive.enums';
import { ConsentFeature } from '../common/enums/consent.enums';
import { ConsentsService } from '../consents/consents.service';
import { AppEventsService } from '../events/events.service';
import { AudioStorageService } from '../storage/audio-storage.service';
import { SubjectsService } from '../subjects/subjects.service';
import { CompleteRecordingUploadDto } from './dto/complete-recording-upload.dto';
import { CreateRecordingUploadIntentDto } from './dto/create-upload-intent.dto';
import {
  RecordingArchiveListDto,
  RecordingDto,
  RecordingMemoriesCta,
  RecordingSummaryStatus,
} from './dto/recording-response.dto';
import { UpdateRecordingDto } from './dto/update-recording.dto';
import { RecordingUploadIntent } from './recording-upload-intent.entity';
import { Recording, RecordingArchiveStatus } from './recording.entity';
import {
  MAX_RECORDING_UPLOAD_BYTES,
  RecordingUploadFailureCode,
  RecordingUploadFailureCodeValue,
  RecordingUploadIntentStatus,
  type RecordingUploadIntentStatusValue,
  RecordingUploadPlatform,
  type RecordingUploadPlatformValue,
  recordingUploadPlatformValues,
  RecordingUploadSource,
  type RecordingUploadSourceValue,
  recordingUploadSourceValues,
  SUPPORTED_AUDIO_MIME_TYPES,
  UploadChecksumStatus,
  uploadChecksumStatusValues,
} from './upload-intent.constants';

type RecordingStats = {
  readonly recording_count: number;
  readonly total_recording_seconds: number;
  readonly status_badge: string;
  readonly memories_cta: string;
  readonly summary: null;
  readonly summary_status: string;
};

@Injectable()
export class RecordingsService {
  constructor(
    private readonly subjectsService: SubjectsService,
    private readonly audioStorageService: AudioStorageService,
    private readonly consentsService: ConsentsService,
    private readonly appEventsService: AppEventsService,
    @InjectRepository(Recording)
    private readonly recordingsRepository: Repository<Recording>,
    @InjectRepository(RecordingUploadIntent)
    private readonly uploadIntentsRepository: Repository<RecordingUploadIntent>,
    @Optional()
    private readonly auditService?: AuditService,
  ) {}

  getUploadGuide() {
    return {
      maxFileSizeBytes: MAX_RECORDING_UPLOAD_BYTES,
      max_file_size_bytes: MAX_RECORDING_UPLOAD_BYTES,
      singleFileOnly: true,
      single_file_only: true,
      supportedMimeTypes: [...SUPPORTED_AUDIO_MIME_TYPES],
      supported_mime_types: [...SUPPORTED_AUDIO_MIME_TYPES],
      sources: recordingUploadSourceValues,
      platforms: recordingUploadPlatformValues,
      lifecycle: Object.values(RecordingUploadIntentStatus),
      failureCodes: Object.values(RecordingUploadFailureCode),
      failure_codes: Object.values(RecordingUploadFailureCode),
      checksumStatuses: uploadChecksumStatusValues,
      checksum_statuses: uploadChecksumStatusValues,
    };
  }

  async createUploadIntent(ownerUserId: string, dto: CreateRecordingUploadIntentDto) {
    await this.subjectsService.getOwned(dto.subjectId, ownerUserId);
    await this.consentsService.assertRequiredConsents(
      ownerUserId,
      ConsentFeature.ARCHIVE,
      dto.subjectId,
    );
    this.assertUploadAllowed(dto.mimeType, dto.fileSizeBytes, dto.singleFile);

    const recording = await this.recordingsRepository.save(
      this.recordingsRepository.create({
        ownerUserId,
        subjectId: dto.subjectId,
        originalFilename: dto.originalFilename,
        mimeType: dto.mimeType,
        fileSizeBytes: String(dto.fileSizeBytes),
        durationSeconds: dto.durationSeconds ?? null,
        memo: dto.memo ?? null,
        conversationPartnerName: dto.conversationPartnerName ?? null,
        relatedQuestionId: dto.relatedQuestionId ?? null,
        relatedQuestionText: dto.relatedQuestionText ?? null,
        fileHash: dto.fileHash ?? null,
        archiveStatus: RecordingArchiveStatus.PENDING_UPLOAD,
        analysisStage: 'not_analyzed',
        memoriesStatus: RecordingMemoriesCta.LOCKED_UNTIL_MEMORIES,
        checksumStatus: UploadChecksumStatus.NOT_SUPPORTED,
        uploadStatus: RecordingUploadStatus.UPLOADING,
        analysisStatus: RecordingAnalysisStatus.NOT_REQUESTED,
        storageKey: null,
        uploadedAt: null,
        deletedAt: null,
      }),
    );
    const uploadIntent = await this.audioStorageService.createUploadIntent({
      ownerUserId,
      subjectId: dto.subjectId,
      recordingId: recording.id,
      filename: dto.originalFilename,
      contentType: dto.mimeType,
    });

    recording.storageKey = uploadIntent.storageKey;
    const savedRecording = await this.recordingsRepository.save(recording);
    const savedIntent = await this.uploadIntentsRepository.save(
      this.uploadIntentsRepository.create({
        recordingId: savedRecording.id,
        ownerUserId,
        subjectId: dto.subjectId,
        status: RecordingUploadIntentStatus.UPLOADING,
        failureCode: null,
        source: this.parseSource(dto.source),
        platform: this.parsePlatform(dto.platform),
        singleFile: true,
        originalFilename: dto.originalFilename,
        mimeType: dto.mimeType,
        expectedFileSizeBytes: String(dto.fileSizeBytes),
        storageKey: uploadIntent.storageKey,
        expiresAt: uploadIntent.expiresAt,
        completedAt: null,
        canceledAt: null,
      }),
    );
    await this.appEventsService.emit({
      userId: ownerUserId,
      name: 'recording.upload_intent_created',
      subjectId: dto.subjectId,
      recordingId: savedRecording.id,
      payload: {
        mimeType: dto.mimeType,
        fileSizeBytes: dto.fileSizeBytes,
        hasDuration: dto.durationSeconds !== undefined,
        hasMemo: dto.memo !== undefined,
        hasRelatedQuestionId: dto.relatedQuestionId !== undefined,
        uploadMethod: uploadIntent.method,
        expiresAt: uploadIntent.expiresAt,
      },
    });

    return {
      recording: await this.toRecordingDto(savedRecording),
      method: uploadIntent.method,
      uploadUrl: uploadIntent.uploadUrl,
      storageKey: uploadIntent.storageKey,
      expiresAt: uploadIntent.expiresAt,
      uploadIntentId: savedIntent.id,
      status: savedIntent.status,
      source: savedIntent.source,
      platform: savedIntent.platform,
      singleFile: savedIntent.singleFile,
      failureCode: savedIntent.failureCode,
    };
  }

  async completeUpload(
    recordingId: string,
    ownerUserId: string,
    dto: CompleteRecordingUploadDto,
  ): Promise<RecordingDto> {
    const recording = await this.findOwnedRecording(recordingId, ownerUserId);
    const uploadIntent = await this.findUploadIntent(recording, ownerUserId, dto);

    if (uploadIntent.status === RecordingUploadIntentStatus.COMPLETED) {
      return this.toRecordingDto(recording);
    }
    if (uploadIntent.status !== RecordingUploadIntentStatus.UPLOADING) {
      throw this.terminalUploadIntentFailure(uploadIntent);
    }
    if (!recording.storageKey) {
      throw new BadRequestException('Recording upload intent is missing storage key.');
    }
    if (uploadIntent.expiresAt.getTime() <= Date.now()) {
      uploadIntent.status = RecordingUploadIntentStatus.EXPIRED;
      await this.markUploadFailure(
        recording,
        uploadIntent,
        RecordingUploadFailureCode.UPLOAD_EXPIRED,
      );
      throw this.uploadFailure(RecordingUploadFailureCode.UPLOAD_EXPIRED);
    }

    const object = await this.audioStorageService.verifyUploadObject({
      storageKey: recording.storageKey,
      expectedSizeBytes: Number(recording.fileSizeBytes),
      expectedChecksum: dto.fileHash ?? recording.fileHash,
    });
    if (!object.exists) {
      await this.markUploadFailure(
        recording,
        uploadIntent,
        RecordingUploadFailureCode.OBJECT_MISSING,
      );
      throw this.uploadFailure(RecordingUploadFailureCode.OBJECT_MISSING);
    }
    if (
      object.sizeBytes !== null &&
      object.sizeBytes !== Number(recording.fileSizeBytes)
    ) {
      await this.markUploadFailure(
        recording,
        uploadIntent,
        RecordingUploadFailureCode.SIZE_MISMATCH,
      );
      throw this.uploadFailure(RecordingUploadFailureCode.SIZE_MISMATCH);
    }
    if (object.checksumStatus === UploadChecksumStatus.MISMATCH) {
      await this.markUploadFailure(
        recording,
        uploadIntent,
        RecordingUploadFailureCode.CHECKSUM_MISMATCH,
      );
      throw this.uploadFailure(RecordingUploadFailureCode.CHECKSUM_MISMATCH);
    }

    recording.uploadStatus = RecordingUploadStatus.UPLOADED;
    recording.archiveStatus = RecordingArchiveStatus.ARCHIVED;
    recording.analysisStage = 'not_analyzed';
    recording.memoriesStatus = RecordingMemoriesCta.LOCKED_UNTIL_MEMORIES;
    recording.checksumStatus = object.checksumStatus;
    recording.uploadedAt = new Date();
    recording.fileHash = dto.fileHash ?? recording.fileHash;
    const savedRecording = await this.recordingsRepository.save(recording);

    uploadIntent.status = RecordingUploadIntentStatus.COMPLETED;
    uploadIntent.failureCode = null;
    uploadIntent.completedAt = new Date();
    await this.uploadIntentsRepository.save(uploadIntent);
    await this.appEventsService.emit({
      userId: ownerUserId,
      name: 'recording.upload_completed',
      subjectId: savedRecording.subjectId,
      recordingId: savedRecording.id,
      payload: {
        uploadStatus: savedRecording.uploadStatus,
        analysisStatus: savedRecording.analysisStatus,
        checksumStatus: savedRecording.checksumStatus,
        hasFileHash: Boolean(savedRecording.fileHash),
      },
    });

    return this.toRecordingDto(savedRecording);
  }

  async listBySubject(
    subjectId: string,
    ownerUserId: string,
  ): Promise<RecordingArchiveListDto> {
    await this.subjectsService.getOwned(subjectId, ownerUserId);

    const recordings = await this.findSubjectRecordings(subjectId, ownerUserId);
    const stats = this.buildStats(recordings);
    return {
      recordings: recordings.map((recording) => this.mapRecording(recording, stats)),
      ...stats,
    };
  }

  async getOwned(recordingId: string, ownerUserId: string): Promise<RecordingDto> {
    return this.toRecordingDto(
      await this.findOwnedRecording(recordingId, ownerUserId),
    );
  }

  async update(
    recordingId: string,
    ownerUserId: string,
    dto: UpdateRecordingDto,
  ): Promise<RecordingDto> {
    const recording = await this.findOwnedRecording(recordingId, ownerUserId);

    if (dto.memo !== undefined) {
      recording.memo = dto.memo;
    }
    if (dto.conversationPartnerName !== undefined) {
      recording.conversationPartnerName = dto.conversationPartnerName;
    }
    if (dto.relatedQuestionId !== undefined) {
      recording.relatedQuestionId = dto.relatedQuestionId;
    }
    if (dto.relatedQuestionText !== undefined) {
      recording.relatedQuestionText = dto.relatedQuestionText;
    }

    return this.toRecordingDto(await this.recordingsRepository.save(recording));
  }

  async requestDeletion(
    recordingId: string,
    ownerUserId: string,
  ): Promise<RecordingDto> {
    const recording = await this.findOwnedRecording(recordingId, ownerUserId);
    recording.archiveStatus = RecordingArchiveStatus.DELETION_REQUESTED;
    recording.deletedAt = new Date();

    const savedRecording = await this.recordingsRepository.save(recording);
    await this.appEventsService.emit({
      userId: ownerUserId,
      name: 'recording.deletion_requested',
      subjectId: recording.subjectId,
      recordingId: recording.id,
      payload: {
        archiveStatus: recording.archiveStatus,
      },
    });
    await this.auditService?.recordSensitiveWrite({
      actorUserId: ownerUserId,
      resourceType: 'recording',
      resourceId: recording.id,
      subjectId: recording.subjectId,
      metadata: { archiveStatus: recording.archiveStatus },
    });

    return this.toRecordingDto(savedRecording);
  }

  async createPlaybackUrl(recordingId: string, ownerUserId: string) {
    const recording = await this.findOwnedRecording(recordingId, ownerUserId);

    if (
      recording.uploadStatus !== RecordingUploadStatus.UPLOADED ||
      !recording.storageKey ||
      (recording.archiveStatus !== undefined &&
        recording.archiveStatus !== RecordingArchiveStatus.ARCHIVED)
    ) {
      throw new BadRequestException('Recording is not available for playback.');
    }

    const playback = await this.audioStorageService.createPlaybackUrl(
      recording.storageKey,
    );
    await this.auditService?.recordSensitiveRead({
      actorUserId: ownerUserId,
      resourceType: 'recording',
      resourceId: recording.id,
      subjectId: recording.subjectId,
      metadata: { ttlSeconds: playback.ttlSeconds, downloadAllowed: false },
    });

    return {
      playback_url: playback.playbackUrl,
      expires_at: playback.expiresAt,
      ttl_seconds: playback.ttlSeconds,
      download_allowed: false,
    };
  }

  async cancelUploadIntent(
    recordingId: string,
    ownerUserId: string,
    uploadIntentId: string,
  ) {
    const recording = await this.findOwnedRecording(recordingId, ownerUserId);
    const uploadIntent = await this.findOwnedUploadIntent(uploadIntentId, recording);

    if (uploadIntent.status !== RecordingUploadIntentStatus.UPLOADING) {
      return uploadIntent;
    }

    uploadIntent.status = RecordingUploadIntentStatus.CANCELED;
    uploadIntent.failureCode = RecordingUploadFailureCode.UPLOAD_CANCELED;
    uploadIntent.canceledAt = new Date();
    recording.uploadStatus = RecordingUploadStatus.UPLOAD_FAILED;

    await this.recordingsRepository.save(recording);
    return this.uploadIntentsRepository.save(uploadIntent);
  }

  async retryUploadIntent(
    recordingId: string,
    ownerUserId: string,
    uploadIntentId: string,
  ) {
    const recording = await this.findOwnedRecording(recordingId, ownerUserId);
    const previousIntent = await this.findOwnedUploadIntent(uploadIntentId, recording);

    if (
      ![
        RecordingUploadIntentStatus.FAILED,
        RecordingUploadIntentStatus.CANCELED,
        RecordingUploadIntentStatus.EXPIRED,
      ].some((status) => status === previousIntent.status)
    ) {
      throw this.uploadFailure(RecordingUploadFailureCode.RETRY_NOT_ALLOWED);
    }
    await this.consentsService.assertRequiredConsents(
      ownerUserId,
      ConsentFeature.ARCHIVE,
      recording.subjectId,
    );

    const uploadIntent = await this.audioStorageService.createUploadIntent({
      ownerUserId,
      subjectId: recording.subjectId,
      recordingId,
      filename: recording.originalFilename,
      contentType: recording.mimeType,
    });
    recording.uploadStatus = RecordingUploadStatus.UPLOADING;
    recording.archiveStatus = RecordingArchiveStatus.PENDING_UPLOAD;
    recording.storageKey = uploadIntent.storageKey;
    const savedRecording = await this.recordingsRepository.save(recording);

    const savedIntent = await this.uploadIntentsRepository.save(
      this.uploadIntentsRepository.create({
        recordingId,
        ownerUserId,
        subjectId: recording.subjectId,
        status: RecordingUploadIntentStatus.UPLOADING,
        failureCode: null,
        source: previousIntent.source,
        platform: previousIntent.platform,
        singleFile: previousIntent.singleFile,
        originalFilename: recording.originalFilename,
        mimeType: recording.mimeType,
        expectedFileSizeBytes: recording.fileSizeBytes,
        storageKey: uploadIntent.storageKey,
        expiresAt: uploadIntent.expiresAt,
        completedAt: null,
        canceledAt: null,
      }),
    );

    return {
      recording: await this.toRecordingDto(savedRecording),
      method: uploadIntent.method,
      uploadUrl: uploadIntent.uploadUrl,
      storageKey: uploadIntent.storageKey,
      expiresAt: uploadIntent.expiresAt,
      uploadIntentId: savedIntent.id,
      status: savedIntent.status,
      source: savedIntent.source,
      platform: savedIntent.platform,
      singleFile: savedIntent.singleFile,
      failureCode: savedIntent.failureCode,
    };
  }

  async requestPreviewAnalysis(recordingId: string, ownerUserId: string): Promise<never> {
    const recording = await this.findOwnedRecording(recordingId, ownerUserId);
    await this.consentsService.assertRequiredConsents(
      ownerUserId,
      ConsentFeature.MEMORIES,
      recording.subjectId,
    );
    await this.appEventsService.emit({
      userId: ownerUserId,
      name: 'recording.preview_analysis_deferred',
      subjectId: recording.subjectId,
      recordingId: recording.id,
      payload: {
        feature: 'preview_analysis',
        retryable: false,
      },
    });

    throw new ConflictException({
      code: 'feature_deferred',
      message: 'Preview analysis is deferred for v1.0.',
      details: {
        feature: 'preview_analysis',
        retryable: false,
      },
    });
  }

  private async findOwnedRecording(
    recordingId: string,
    ownerUserId: string,
  ): Promise<Recording> {
    const recording = await this.recordingsRepository.findOne({
      where: { id: recordingId, ownerUserId },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found.');
    }

    return recording;
  }

  private async findUploadIntent(
    recording: Recording,
    ownerUserId: string,
    dto: CompleteRecordingUploadDto,
  ): Promise<RecordingUploadIntent> {
    const uploadIntent = await this.uploadIntentsRepository.findOne({
      where: dto.uploadIntentId
        ? { id: dto.uploadIntentId, recordingId: recording.id, ownerUserId }
        : {
            recordingId: recording.id,
            ownerUserId,
            status: RecordingUploadIntentStatus.UPLOADING,
          },
      order: { createdAt: 'DESC' },
    });

    if (!uploadIntent) {
      throw new NotFoundException('Recording upload intent not found.');
    }

    return uploadIntent;
  }

  private async findOwnedUploadIntent(
    uploadIntentId: string,
    recording: Recording,
  ): Promise<RecordingUploadIntent> {
    const uploadIntent = await this.uploadIntentsRepository.findOne({
      where: {
        id: uploadIntentId,
        recordingId: recording.id,
        ownerUserId: recording.ownerUserId,
      },
    });

    if (!uploadIntent) {
      throw new NotFoundException('Recording upload intent not found.');
    }

    return uploadIntent;
  }

  private async findSubjectRecordings(subjectId: string, ownerUserId: string) {
    const recordings = await this.recordingsRepository.find({
      where: { subjectId, ownerUserId },
      order: { createdAt: 'DESC' },
    });

    return (recordings ?? []).filter(
      (recording) => recording.archiveStatus !== RecordingArchiveStatus.DELETED,
    );
  }

  private async toRecordingDto(recording: Recording): Promise<RecordingDto> {
    const subjectRecordings = await this.findSubjectRecordings(
      recording.subjectId,
      recording.ownerUserId,
    );
    return this.mapRecording(recording, this.buildStats(subjectRecordings));
  }

  private mapRecording(recording: Recording, stats: RecordingStats): RecordingDto {
    return {
      id: recording.id,
      subject_id: recording.subjectId,
      original_filename: recording.originalFilename,
      mime_type: recording.mimeType,
      file_size_bytes: recording.fileSizeBytes,
      duration_seconds: recording.durationSeconds,
      upload_status: recording.uploadStatus,
      analysis_status: recording.analysisStatus,
      archive_status: recording.archiveStatus,
      analysis_stage: recording.analysisStage,
      memories_status: recording.memoriesStatus,
      checksum_status: recording.checksumStatus,
      memo: recording.memo,
      conversation_partner_name: recording.conversationPartnerName,
      related_question_id: recording.relatedQuestionId,
      related_question_text: recording.relatedQuestionText,
      uploaded_at: recording.uploadedAt,
      created_at: recording.createdAt,
      updated_at: recording.updatedAt,
      deleted_at: recording.deletedAt,
      ...stats,
    };
  }

  private buildStats(recordings: readonly Recording[]): RecordingStats {
    return {
      recording_count: recordings.length,
      total_recording_seconds: recordings.reduce(
        (total, recording) => total + (recording.durationSeconds ?? 0),
        0,
      ),
      status_badge: recordings.some(
        (recording) =>
          recording.archiveStatus === RecordingArchiveStatus.DELETION_REQUESTED,
      )
        ? RecordingArchiveStatus.DELETION_REQUESTED
        : 'ready',
      memories_cta: RecordingMemoriesCta.LOCKED_UNTIL_MEMORIES,
      summary: null,
      summary_status: RecordingSummaryStatus.LOCKED_UNTIL_MEMORIES,
    };
  }

  private assertUploadAllowed(
    mimeType: string,
    fileSizeBytes: number,
    singleFile?: boolean,
  ) {
    if (!this.isSupportedAudioMimeType(mimeType)) {
      throw new BadRequestException({
        code: RecordingUploadFailureCode.UNSUPPORTED_MIME_TYPE,
        message: `Unsupported audio MIME type: ${mimeType}.`,
      });
    }
    if (fileSizeBytes > MAX_RECORDING_UPLOAD_BYTES) {
      throw this.uploadFailure(RecordingUploadFailureCode.FILE_TOO_LARGE);
    }
    if (singleFile === false) {
      throw this.uploadFailure(RecordingUploadFailureCode.MULTI_FILE_NOT_SUPPORTED);
    }
  }

  private isSupportedAudioMimeType(
    mimeType: string,
  ): mimeType is (typeof SUPPORTED_AUDIO_MIME_TYPES)[number] {
    return SUPPORTED_AUDIO_MIME_TYPES.some((supported) => supported === mimeType);
  }

  private uploadFailure(code: RecordingUploadFailureCodeValue) {
    return new BadRequestException({
      code,
      message: 'Recording upload failed validation.',
      details: {
        maxFileSizeBytes: MAX_RECORDING_UPLOAD_BYTES,
        singleFileOnly: true,
      },
    });
  }

  private terminalUploadIntentFailure(uploadIntent: RecordingUploadIntent) {
    const code = this.terminalFailureCode(
      uploadIntent.status,
      uploadIntent.failureCode,
    );
    return new BadRequestException({
      code,
      status: uploadIntent.status,
      failureCode: uploadIntent.failureCode,
      message: 'Recording upload intent is already terminal.',
      details: {
        uploadIntentId: uploadIntent.id,
      },
    });
  }

  private terminalFailureCode(
    status: RecordingUploadIntentStatusValue,
    failureCode: RecordingUploadFailureCodeValue | null,
  ): RecordingUploadFailureCodeValue {
    switch (status) {
      case RecordingUploadIntentStatus.COMPLETED:
        return RecordingUploadFailureCode.ALREADY_COMPLETED;
      case RecordingUploadIntentStatus.CANCELED:
        return failureCode ?? RecordingUploadFailureCode.UPLOAD_CANCELED;
      case RecordingUploadIntentStatus.EXPIRED:
        return failureCode ?? RecordingUploadFailureCode.UPLOAD_EXPIRED;
      case RecordingUploadIntentStatus.FAILED:
      case RecordingUploadIntentStatus.UPLOADING:
        return failureCode ?? RecordingUploadFailureCode.RETRY_NOT_ALLOWED;
    }
  }

  private parseSource(source?: string): RecordingUploadSourceValue {
    return recordingUploadSourceValues.find((value) => value === source) ??
      RecordingUploadSource.APP_RECORDING;
  }

  private parsePlatform(platform?: string): RecordingUploadPlatformValue {
    return recordingUploadPlatformValues.find((value) => value === platform) ??
      RecordingUploadPlatform.IOS;
  }

  private async markUploadFailure(
    recording: Recording,
    uploadIntent: RecordingUploadIntent,
    code: RecordingUploadFailureCodeValue,
  ): Promise<void> {
    uploadIntent.status =
      uploadIntent.status === RecordingUploadIntentStatus.EXPIRED
        ? RecordingUploadIntentStatus.EXPIRED
        : RecordingUploadIntentStatus.FAILED;
    uploadIntent.failureCode = code;
    recording.uploadStatus = RecordingUploadStatus.UPLOAD_FAILED;
    await this.recordingsRepository.save(recording);
    await this.uploadIntentsRepository.save(uploadIntent);
  }
}
