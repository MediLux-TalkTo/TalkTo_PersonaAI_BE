import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { ConsentFeature } from '../common/enums/consent.enums';
import { ConsentsService } from '../consents/consents.service';
import { AppEventsService } from '../events/events.service';
import { Entitlement } from '../payments/entitlement.entity';
import { EntitlementStatus } from '../payments/payment-event.constants';
import { ProductFeature } from '../products/product.constants';
import { SubjectsService } from '../subjects/subjects.service';
import {
  RegisterVoiceProviderAssetDto,
  ReviewVoicePersonaAssetDto,
  UpdatePersonaBuildStatusDto,
  UpsertPersonaBibleDto,
} from './dto/admin-voice-persona.dto';
import { RequestPersonaBibleChangesDto } from './dto/family-review.dto';
import {
  CreateTargetVoiceSampleDto,
  CreateVoicePersonaApplicationDto,
  CreateVoicePersonaDocumentIntentDto,
  UpsertPersonaIntakeDto,
} from './dto/voice-persona.dto';
import { PersonaBuildJob } from './persona-build-job.entity';
import { PersonaBible } from './persona-bible.entity';
import {
  PersonaFamilyReview,
  PersonaFamilyReviewStatus,
} from './persona-family-review.entity';
import { PersonaIntake } from './persona-intake.entity';
import { PersonaRuntimeConfig } from './persona-runtime-config.entity';
import { TargetVoiceSample } from './target-voice-sample.entity';
import {
  VoiceProviderAsset,
  VoiceProviderAssetStatus,
} from './voice-provider-asset.entity';
import {
  REQUIRED_INTAKE_SECTION_COUNT,
  VoicePersonaApplicationStatus,
  VoicePersonaBuildStatus,
  VoicePersonaReviewStatus,
} from './voice-persona.constants';
import { VoicePersonaApplication } from './voice-persona-application.entity';
import { VoicePersonaDocument } from './voice-persona-document.entity';

@Injectable()
export class VoicePersonaService {
  constructor(
    @InjectRepository(VoicePersonaApplication)
    private readonly applicationsRepository: Repository<VoicePersonaApplication>,
    @InjectRepository(VoicePersonaDocument)
    private readonly documentsRepository: Repository<VoicePersonaDocument>,
    @InjectRepository(PersonaIntake)
    private readonly intakesRepository: Repository<PersonaIntake>,
    @InjectRepository(TargetVoiceSample)
    private readonly samplesRepository: Repository<TargetVoiceSample>,
    @InjectRepository(PersonaBuildJob)
    private readonly buildJobsRepository: Repository<PersonaBuildJob>,
    @InjectRepository(PersonaBible)
    private readonly personaBiblesRepository: Repository<PersonaBible>,
    @InjectRepository(VoiceProviderAsset)
    private readonly providerAssetsRepository: Repository<VoiceProviderAsset>,
    @InjectRepository(PersonaFamilyReview)
    private readonly familyReviewsRepository: Repository<PersonaFamilyReview>,
    @InjectRepository(PersonaRuntimeConfig)
    private readonly runtimeConfigsRepository: Repository<PersonaRuntimeConfig>,
    @InjectRepository(Entitlement)
    private readonly entitlementsRepository: Repository<Entitlement>,
    private readonly subjectsService: SubjectsService,
    private readonly consentsService: ConsentsService,
    private readonly appEventsService: AppEventsService,
    private readonly auditService: AuditService,
  ) {}

  async createApplication(ownerUserId: string, dto: CreateVoicePersonaApplicationDto) {
    await this.subjectsService.getOwned(dto.subjectId, ownerUserId);
    await this.consentsService.assertRequiredConsents(
      ownerUserId,
      ConsentFeature.VOICE_PERSONA,
      dto.subjectId,
    );
    const entitlement = await this.findActiveVoicePersonaEntitlement(ownerUserId);
    const application = await this.applicationsRepository.save(
      this.applicationsRepository.create({
        ownerUserId,
        subjectId: dto.subjectId,
        entitlementId: entitlement.id,
        status: VoicePersonaApplicationStatus.LOCKED_UNTIL_REQUIREMENTS,
        documentsStatus: VoicePersonaReviewStatus.PENDING_REVIEW,
        intakeStatus: 'draft',
        voiceSampleStatus: VoicePersonaReviewStatus.PENDING_REVIEW,
        buildStatus: VoicePersonaBuildStatus.LOCKED_UNTIL_REQUIREMENTS,
        submittedAt: null,
      }),
    );
    await this.buildJobsRepository.save(
      this.buildJobsRepository.create({
        applicationId: application.id,
        ownerUserId,
        subjectId: dto.subjectId,
        status: VoicePersonaBuildStatus.LOCKED_UNTIL_REQUIREMENTS,
      }),
    );
    await this.appEventsService.emit({
      userId: ownerUserId,
      name: 'voice_persona.application_created',
      subjectId: dto.subjectId,
      payload: { applicationId: application.id },
    });

    return application;
  }

  async createDocumentUploadIntent(
    applicationId: string,
    ownerUserId: string,
    dto: CreateVoicePersonaDocumentIntentDto,
  ) {
    const application = await this.loadOwnedApplication(applicationId, ownerUserId);
    const storageKey = [
      'voice-persona',
      'documents',
      ownerUserId,
      application.id,
      safeFilename(dto.filename),
    ].join('/');
    const document = await this.documentsRepository.save(
      this.documentsRepository.create({
        applicationId: application.id,
        ownerUserId,
        subjectId: application.subjectId,
        filename: dto.filename,
        mimeType: dto.mimeType,
        fileSizeBytes: dto.fileSizeBytes,
        storageKey,
        reviewStatus: VoicePersonaReviewStatus.PENDING_REVIEW,
      }),
    );

    return {
      document,
      uploadUrl: `local-upload://${storageKey}`,
      method: 'PUT' as const,
    };
  }

  async upsertIntake(
    applicationId: string,
    ownerUserId: string,
    dto: UpsertPersonaIntakeDto,
  ) {
    const application = await this.loadOwnedApplication(applicationId, ownerUserId);
    let intake = await this.intakesRepository.findOne({
      where: { applicationId: application.id },
    });
    if (!intake) {
      intake = this.intakesRepository.create({
        applicationId: application.id,
        ownerUserId,
        subjectId: application.subjectId,
        status: 'draft',
        submittedAt: null,
      });
    }
    intake.sections = dto.sections;
    intake.status = 'draft';
    intake.submittedAt = null;
    application.intakeStatus = 'draft';
    await this.applicationsRepository.save(application);
    return this.intakesRepository.save(intake);
  }

  async submitIntake(applicationId: string, ownerUserId: string) {
    const application = await this.loadOwnedApplication(applicationId, ownerUserId);
    const intake = await this.intakesRepository.findOne({
      where: { applicationId: application.id },
    });
    if (!intake || intake.sections.length < REQUIRED_INTAKE_SECTION_COUNT) {
      throw new BadRequestException({
        code: 'incomplete_persona_intake',
        message: 'All 8 Persona intake sections are required before submission.',
      });
    }
    const now = new Date();
    intake.status = 'submitted';
    intake.submittedAt = now;
    application.intakeStatus = 'submitted';
    application.submittedAt = now;
    await this.applicationsRepository.save(application);
    return this.intakesRepository.save(intake);
  }

  async createTargetVoiceSample(
    applicationId: string,
    ownerUserId: string,
    dto: CreateTargetVoiceSampleDto,
  ) {
    const application = await this.loadOwnedApplication(applicationId, ownerUserId);
    if (!dto.recordingId && !dto.storageKey) {
      throw new BadRequestException({
        code: 'voice_sample_source_required',
        message: 'A recordingId or storageKey is required for a voice sample.',
      });
    }
    const sample = await this.samplesRepository.save(
      this.samplesRepository.create({
        applicationId: application.id,
        ownerUserId,
        subjectId: application.subjectId,
        recordingId: dto.recordingId ?? null,
        storageKey: dto.storageKey ?? null,
        reviewStatus: VoicePersonaReviewStatus.PENDING_REVIEW,
      }),
    );
    application.voiceSampleStatus = VoicePersonaReviewStatus.PENDING_REVIEW;
    await this.applicationsRepository.save(application);
    return sample;
  }

  async getBuildStatus(applicationId: string, ownerUserId: string) {
    const application = await this.loadOwnedApplication(applicationId, ownerUserId);
    const lockedReasons = this.lockedReasons(application);
    return {
      applicationId: application.id,
      buildStatus:
        lockedReasons.length === 0
          ? VoicePersonaBuildStatus.PENDING_ADMIN_REVIEW
          : application.buildStatus,
      documentsStatus: application.documentsStatus,
      intakeStatus: application.intakeStatus,
      voiceSampleStatus: application.voiceSampleStatus,
      lockedReasons,
    };
  }

  async reviewDocument(
    documentId: string,
    actorUserId: string,
    dto: ReviewVoicePersonaAssetDto,
  ) {
    const document = await this.documentsRepository.findOne({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException('Voice Persona document not found.');
    }
    document.reviewStatus = dto.status;
    const savedDocument = await this.documentsRepository.save(document);
    const application = await this.applicationsRepository.findOne({
      where: { id: document.applicationId },
    });
    if (application) {
      application.documentsStatus = dto.status;
      await this.applicationsRepository.save(application);
    }
    await this.auditVoicePersonaAdminAction(actorUserId, 'voice_persona_document_review', {
      applicationId: document.applicationId,
      documentId: document.id,
      subjectId: document.subjectId,
      status: dto.status,
    });
    return savedDocument;
  }

  async reviewVoiceSample(
    sampleId: string,
    actorUserId: string,
    dto: ReviewVoicePersonaAssetDto,
  ) {
    const sample = await this.samplesRepository.findOne({ where: { id: sampleId } });
    if (!sample) {
      throw new NotFoundException('Target voice sample not found.');
    }
    sample.reviewStatus = dto.status;
    const savedSample = await this.samplesRepository.save(sample);
    const application = await this.applicationsRepository.findOne({
      where: { id: sample.applicationId },
    });
    if (application) {
      application.voiceSampleStatus = dto.status;
      await this.applicationsRepository.save(application);
    }
    await this.auditVoicePersonaAdminAction(actorUserId, 'target_voice_sample_review', {
      applicationId: sample.applicationId,
      sampleId: sample.id,
      subjectId: sample.subjectId,
      status: dto.status,
    });
    return savedSample;
  }

  async updateBuildStatus(
    applicationId: string,
    actorUserId: string,
    dto: UpdatePersonaBuildStatusDto,
  ) {
    const application = await this.loadApplication(applicationId);
    application.buildStatus = dto.status;
    const buildJob =
      (await this.buildJobsRepository.findOne({ where: { applicationId } })) ??
      this.buildJobsRepository.create({
        applicationId,
        ownerUserId: application.ownerUserId,
        subjectId: application.subjectId,
      });
    buildJob.status = dto.status;
    await this.applicationsRepository.save(application);
    const savedBuildJob = await this.buildJobsRepository.save(buildJob);
    await this.auditVoicePersonaAdminAction(actorUserId, 'persona_build_status_update', {
      applicationId,
      subjectId: application.subjectId,
      status: dto.status,
    });
    return savedBuildJob;
  }

  async upsertPersonaBible(
    applicationId: string,
    actorUserId: string,
    dto: UpsertPersonaBibleDto,
  ) {
    const application = await this.loadApplication(applicationId);
    let bible = await this.personaBiblesRepository.findOne({
      where: { applicationId },
    });
    if (!bible) {
      bible = this.personaBiblesRepository.create({
        applicationId,
        ownerUserId: application.ownerUserId,
        subjectId: application.subjectId,
        reviewStatus: VoicePersonaReviewStatus.PENDING_REVIEW,
        reviewerUserId: null,
        reviewedAt: null,
      });
    }
    bible.contentSummary = dto.contentSummary;
    bible.safetyNotes = dto.safetyNotes ?? null;
    const savedBible = await this.personaBiblesRepository.save(bible);
    await this.auditVoicePersonaAdminAction(actorUserId, 'persona_bible_upsert', {
      applicationId,
      subjectId: application.subjectId,
      bibleId: savedBible.id,
    });
    return savedBible;
  }

  async reviewPersonaBible(
    bibleId: string,
    actorUserId: string,
    dto: ReviewVoicePersonaAssetDto,
  ) {
    const bible = await this.personaBiblesRepository.findOne({ where: { id: bibleId } });
    if (!bible) {
      throw new NotFoundException('Persona Bible not found.');
    }
    bible.reviewStatus = dto.status;
    bible.reviewerUserId = actorUserId;
    bible.reviewedAt = new Date();
    const savedBible = await this.personaBiblesRepository.save(bible);
    await this.auditVoicePersonaAdminAction(actorUserId, 'persona_bible_review', {
      applicationId: bible.applicationId,
      subjectId: bible.subjectId,
      bibleId: bible.id,
      status: dto.status,
    });
    return savedBible;
  }

  async registerProviderAsset(
    applicationId: string,
    actorUserId: string,
    dto: RegisterVoiceProviderAssetDto,
  ) {
    const application = await this.loadApplication(applicationId);
    const asset = await this.providerAssetsRepository.save(
      this.providerAssetsRepository.create({
        applicationId,
        ownerUserId: application.ownerUserId,
        subjectId: application.subjectId,
        providerName: dto.providerName,
        externalAssetId: dto.externalAssetId,
        status: dto.status ?? VoiceProviderAssetStatus.REGISTERED,
        reviewerUserId: actorUserId,
        notes: dto.notes ?? null,
      }),
    );
    if (asset.status === VoiceProviderAssetStatus.REGISTERED) {
      await this.updateBuildStatus(applicationId, actorUserId, {
        status: VoicePersonaBuildStatus.PENDING_MANUAL_PROVIDER_ASSET,
      });
    }
    await this.auditVoicePersonaAdminAction(actorUserId, 'voice_provider_asset_register', {
      applicationId,
      subjectId: application.subjectId,
      assetId: asset.id,
      providerName: dto.providerName,
      status: asset.status,
    });
    return asset;
  }

  async getFamilyReview(applicationId: string, ownerUserId: string) {
    const application = await this.loadOwnedApplication(applicationId, ownerUserId);
    const bible = await this.personaBiblesRepository.findOne({
      where: { applicationId },
    });
    if (!bible || bible.reviewStatus !== VoicePersonaReviewStatus.APPROVED) {
      throw new BadRequestException({
        code: 'persona_bible_not_approved',
        message: 'Approved Persona Bible is required before family review.',
      });
    }

    return {
      applicationId: application.id,
      subjectId: application.subjectId,
      personaBibleId: bible.id,
      contentSummary: bible.contentSummary,
      safetyNotes: bible.safetyNotes,
      reviewStatus: bible.reviewStatus,
    };
  }

  async approveFamilyReview(applicationId: string, ownerUserId: string) {
    const application = await this.loadOwnedApplication(applicationId, ownerUserId);
    const bible = await this.requireApprovedBible(application.id);
    const providerAsset = await this.requireRegisteredProviderAsset(application.id);
    if (application.buildStatus !== VoicePersonaBuildStatus.READY) {
      throw new BadRequestException({
        code: 'persona_build_not_ready',
        message: 'Voice Persona build must be ready before runtime enablement.',
      });
    }

    const review = await this.familyReviewsRepository.save(
      this.familyReviewsRepository.create({
        applicationId: application.id,
        ownerUserId,
        subjectId: application.subjectId,
        personaBibleId: bible.id,
        reviewerUserId: ownerUserId,
        status: PersonaFamilyReviewStatus.APPROVED,
        notes: null,
      }),
    );
    let runtimeConfig = await this.runtimeConfigsRepository.findOne({
      where: { applicationId: application.id },
    });
    if (!runtimeConfig) {
      runtimeConfig = this.runtimeConfigsRepository.create({
        applicationId: application.id,
        ownerUserId,
        subjectId: application.subjectId,
        personaBibleId: bible.id,
        providerAssetId: providerAsset.id,
      });
    }
    runtimeConfig.enabled = true;
    runtimeConfig.enabledAt = new Date();
    const savedRuntimeConfig =
      await this.runtimeConfigsRepository.save(runtimeConfig);
    await this.appEventsService.emit({
      userId: ownerUserId,
      name: 'voice_persona.family_review_approved',
      subjectId: application.subjectId,
      payload: { applicationId: application.id },
    });

    return { review, runtimeConfig: savedRuntimeConfig };
  }

  async requestFamilyReviewChanges(
    applicationId: string,
    ownerUserId: string,
    dto: RequestPersonaBibleChangesDto,
  ) {
    const application = await this.loadOwnedApplication(applicationId, ownerUserId);
    const bible = await this.requireApprovedBible(application.id);
    return this.familyReviewsRepository.save(
      this.familyReviewsRepository.create({
        applicationId: application.id,
        ownerUserId,
        subjectId: application.subjectId,
        personaBibleId: bible.id,
        reviewerUserId: ownerUserId,
        status: PersonaFamilyReviewStatus.CHANGES_REQUESTED,
        notes: dto.notes ?? null,
      }),
    );
  }

  private async loadOwnedApplication(applicationId: string, ownerUserId: string) {
    const application = await this.applicationsRepository.findOne({
      where: { id: applicationId, ownerUserId },
    });
    if (!application) {
      throw new NotFoundException('Voice Persona application not found.');
    }
    return application;
  }

  private async loadApplication(applicationId: string) {
    const application = await this.applicationsRepository.findOne({
      where: { id: applicationId },
    });
    if (!application) {
      throw new NotFoundException('Voice Persona application not found.');
    }
    return application;
  }

  private async requireApprovedBible(applicationId: string) {
    const bible = await this.personaBiblesRepository.findOne({
      where: {
        applicationId,
        reviewStatus: VoicePersonaReviewStatus.APPROVED,
      },
    });
    if (!bible) {
      throw new BadRequestException({
        code: 'persona_bible_not_approved',
        message: 'Approved Persona Bible is required.',
      });
    }
    return bible;
  }

  private async requireRegisteredProviderAsset(applicationId: string) {
    const providerAssets = await this.providerAssetsRepository.find({
      where: {
        applicationId,
        status: VoiceProviderAssetStatus.REGISTERED,
      },
      order: { createdAt: 'DESC' },
      take: 1,
    });
    const providerAsset = providerAssets[0];
    if (!providerAsset) {
      throw new BadRequestException({
        code: 'provider_asset_not_registered',
        message: 'Registered manual provider asset is required.',
      });
    }
    return providerAsset;
  }

  private async findActiveVoicePersonaEntitlement(ownerUserId: string) {
    const entitlements = await this.entitlementsRepository.find({
      where: {
        ownerUserId,
        feature: ProductFeature.VOICE_PERSONA,
        status: EntitlementStatus.ACTIVE,
      },
      order: { createdAt: 'DESC' },
    });
    const entitlement = entitlements.find(
      (candidate) => !candidate.endsAt || candidate.endsAt.getTime() > Date.now(),
    );
    if (!entitlement) {
      throw new ForbiddenException({
        code: 'requires_active_entitlement',
        message: 'Voice Persona entitlement is required.',
      });
    }
    return entitlement;
  }

  private lockedReasons(application: VoicePersonaApplication): string[] {
    const reasons: string[] = [];
    if (application.documentsStatus !== VoicePersonaReviewStatus.APPROVED) {
      reasons.push('documents_not_approved');
    }
    if (application.intakeStatus !== 'submitted') {
      reasons.push('intake_not_submitted');
    }
    if (application.voiceSampleStatus !== VoicePersonaReviewStatus.APPROVED) {
      reasons.push('voice_sample_not_approved');
    }
    return reasons;
  }

  private async auditVoicePersonaAdminAction(
    actorUserId: string,
    action: string,
    metadata: Record<string, unknown>,
  ) {
    await this.auditService.record({
      actorUserId,
      action,
      resourceType: 'voice_persona',
      resourceId:
        typeof metadata.applicationId === 'string'
          ? metadata.applicationId
          : null,
      subjectId:
        typeof metadata.subjectId === 'string' ? metadata.subjectId : null,
      metadata,
    });
  }
}

function safeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}
