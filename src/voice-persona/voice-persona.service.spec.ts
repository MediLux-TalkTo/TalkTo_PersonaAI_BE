import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TranscriptSegment } from '../analysis/transcript-segment.entity';
import { ConsentFeature } from '../common/enums/consent.enums';
import { Entitlement } from '../payments/entitlement.entity';
import { EntitlementStatus } from '../payments/payment-event.constants';
import { ProductFeature } from '../products/product.constants';
import { Recording } from '../recordings/recording.entity';
import { Subject } from '../subjects/subject.entity';
import { VoicePersonaService } from './voice-persona.service';
import { VoicePersonaApplication } from './voice-persona-application.entity';
import {
  REQUIRED_INTAKE_SECTION_COUNT,
  VoicePersonaBuildStatus,
  VoicePersonaReviewStatus,
} from './voice-persona.constants';

describe('VoicePersonaService', () => {
  const applicationsRepository = repoMock();
  const documentsRepository = repoMock();
  const intakesRepository = repoMock();
  const samplesRepository = repoMock();
  const buildJobsRepository = repoMock();
  const personaBiblesRepository = repoMock();
  const providerAssetsRepository = repoMock();
  const familyReviewsRepository = repoMock();
  const runtimeConfigsRepository = repoMock();
  const subjectsRepository = repoMock();
  const transcriptSegmentsRepository = repoMock();
  const recordingsRepository = repoMock();
  const entitlementsRepository = {
    find: jest.fn(),
  };
  const subjectsService = {
    getOwned: jest.fn(),
  };
  const aiClientService = {
    assemblePersona: jest.fn(),
    cloneVoice: jest.fn(),
  };
  const audioStorageService = {
    createPlaybackUrl: jest.fn(),
  };
  const consentsService = {
    assertRequiredConsents: jest.fn(),
  };
  const appEventsService = {
    emit: jest.fn(),
  };
  const auditService = {
    record: jest.fn(),
  };
  let service: VoicePersonaService;

  beforeEach(() => {
    jest.resetAllMocks();
    for (const repository of [
      applicationsRepository,
      documentsRepository,
      intakesRepository,
      samplesRepository,
      buildJobsRepository,
      personaBiblesRepository,
      providerAssetsRepository,
      familyReviewsRepository,
      runtimeConfigsRepository,
      subjectsRepository,
      transcriptSegmentsRepository,
      recordingsRepository,
    ]) {
      repository.create.mockImplementation((input) => input);
      repository.save.mockImplementation((input) =>
        Promise.resolve({ id: input.id ?? `${repository.name}-id`, ...input }),
      );
    }
    subjectsService.getOwned.mockResolvedValue(buildSubject());
    transcriptSegmentsRepository.find.mockResolvedValue([buildTranscriptSegment()]);
    samplesRepository.findOne.mockResolvedValue(null);
    recordingsRepository.findOne.mockResolvedValue(
      Object.assign(new Recording(), {
        id: 'recording-id',
        ownerUserId: 'user-id',
        storageKey: 'recordings/user-id/subject-id/sample.m4a',
      }),
    );
    audioStorageService.createPlaybackUrl.mockResolvedValue({
      playbackUrl: 'https://storage.example/sample.m4a?signature=test-signature',
      expiresAt: new Date(),
      ttlSeconds: 1800,
      downloadAllowed: false,
    });
    aiClientService.assemblePersona.mockResolvedValue({
      instructions: '조립된 페르소나 프롬프트',
      subjectName: '신금자',
    });
    aiClientService.cloneVoice.mockResolvedValue({
      voiceId: 'voice-id',
      provider: 'elevenlabs',
    });
    consentsService.assertRequiredConsents.mockResolvedValue(undefined);
    entitlementsRepository.find.mockResolvedValue([buildEntitlement()]);
    service = new VoicePersonaService(
      applicationsRepository as never,
      documentsRepository as never,
      intakesRepository as never,
      samplesRepository as never,
      buildJobsRepository as never,
      personaBiblesRepository as never,
      providerAssetsRepository as never,
      familyReviewsRepository as never,
      runtimeConfigsRepository as never,
      entitlementsRepository as never,
      subjectsRepository as never,
      transcriptSegmentsRepository as never,
      recordingsRepository as never,
      subjectsService as never,
      aiClientService as never,
      audioStorageService as never,
      consentsService as never,
      appEventsService as never,
      auditService as never,
    );
  });

  it('creates an application only after subject, consent, and entitlement gates pass', async () => {
    await expect(
      service.createApplication('user-id', { subjectId: 'subject-id' }),
    ).resolves.toMatchObject({
      ownerUserId: 'user-id',
      subjectId: 'subject-id',
      buildStatus: VoicePersonaBuildStatus.LOCKED_UNTIL_REQUIREMENTS,
    });

    expect(consentsService.assertRequiredConsents).toHaveBeenCalledWith(
      'user-id',
      ConsentFeature.VOICE_PERSONA,
      'subject-id',
    );
    expect(buildJobsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: VoicePersonaBuildStatus.LOCKED_UNTIL_REQUIREMENTS,
      }),
    );
  });

  it('rejects application creation without an active Voice Persona entitlement', async () => {
    entitlementsRepository.find.mockResolvedValue([]);

    await expect(
      service.createApplication('user-id', { subjectId: 'subject-id' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates document upload intent without exposing a public URL', async () => {
    applicationsRepository.findOne.mockResolvedValue(buildApplication());

    await expect(
      service.createDocumentUploadIntent('application-id', 'user-id', {
        filename: 'family doc.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: '1234',
      }),
    ).resolves.toMatchObject({
      document: expect.objectContaining({
        filename: 'family doc.pdf',
        storageKey: expect.stringContaining('voice-persona/documents/user-id'),
        reviewStatus: VoicePersonaReviewStatus.PENDING_REVIEW,
      }),
      uploadUrl: expect.stringMatching(/^local-upload:\/\//),
      method: 'PUT',
    });
  });

  it('requires all eight intake sections before submit', async () => {
    applicationsRepository.findOne.mockResolvedValue(buildApplication());
    intakesRepository.findOne.mockResolvedValue({
      applicationId: 'application-id',
      sections: Array.from({ length: REQUIRED_INTAKE_SECTION_COUNT - 1 }, (_, index) => ({
        sectionKey: `section-${index}`,
        answers: {},
      })),
      status: 'draft',
      submittedAt: null,
    });

    await expect(
      service.submitIntake('application-id', 'user-id'),
    ).rejects.toBeInstanceOf(BadRequestException);

    intakesRepository.findOne.mockResolvedValue({
      applicationId: 'application-id',
      sections: Array.from({ length: REQUIRED_INTAKE_SECTION_COUNT }, (_, index) => ({
        sectionKey: `section-${index}`,
        answers: {},
      })),
      status: 'draft',
      submittedAt: null,
    });

    await expect(
      service.submitIntake('application-id', 'user-id'),
    ).resolves.toMatchObject({
      status: 'submitted',
      submittedAt: expect.any(Date),
    });
    expect(aiClientService.assemblePersona).toHaveBeenCalledWith(
      expect.objectContaining({
        intakeContext: expect.objectContaining({
          sttHints: { names: ['신금자', '정읍', '정으비'] },
        }),
        speechExamples: ['뭐든지 적당히 하는 게 제일 힘든데.'],
      }),
      {
        ownerUserId: 'user-id',
        subjectId: 'subject-id',
        feature: ConsentFeature.VOICE_PERSONA,
      },
    );
    expect(subjectsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        assembledPersonaInstructions: '조립된 페르소나 프롬프트',
      }),
    );
  });

  it('keeps build status locked until docs/intake/sample are approved', async () => {
    applicationsRepository.findOne.mockResolvedValue(buildApplication({
      documentsStatus: VoicePersonaReviewStatus.PENDING_REVIEW,
      intakeStatus: 'submitted',
      voiceSampleStatus: VoicePersonaReviewStatus.PENDING_REVIEW,
    }));

    await expect(
      service.getBuildStatus('application-id', 'user-id'),
    ).resolves.toMatchObject({
      buildStatus: VoicePersonaBuildStatus.LOCKED_UNTIL_REQUIREMENTS,
      lockedReasons: ['documents_not_approved', 'voice_sample_not_approved'],
    });
  });

  it('stores selected target voice sample ranges and rejects invalid ranges', async () => {
    applicationsRepository.findOne.mockResolvedValue(buildApplication());

    await expect(
      service.createTargetVoiceSample('application-id', 'user-id', {
        recordingId: '3b1cae30-77ef-4556-bbb1-4c3cb048e713',
        startMs: 12000,
        endMs: 25000,
      }),
    ).resolves.toMatchObject({
      recordingId: '3b1cae30-77ef-4556-bbb1-4c3cb048e713',
      startMs: 12000,
      endMs: 25000,
      reviewStatus: VoicePersonaReviewStatus.PENDING_REVIEW,
    });

    await expect(
      service.createTargetVoiceSample('application-id', 'user-id', {
        recordingId: '3b1cae30-77ef-4556-bbb1-4c3cb048e713',
        startMs: 25000,
        endMs: 12000,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'voice_sample_range_invalid',
      }),
    });
  });

  it('reviews documents and writes sanitized admin audit metadata', async () => {
    documentsRepository.findOne.mockResolvedValue({
      id: 'document-id',
      applicationId: 'application-id',
      subjectId: 'subject-id',
      reviewStatus: VoicePersonaReviewStatus.PENDING_REVIEW,
    });
    applicationsRepository.findOne.mockResolvedValue(buildApplication());

    await expect(
      service.reviewDocument('document-id', 'admin-id', {
        status: VoicePersonaReviewStatus.APPROVED,
      }),
    ).resolves.toMatchObject({
      id: 'document-id',
      reviewStatus: VoicePersonaReviewStatus.APPROVED,
    });

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'admin-id',
        action: 'voice_persona_document_review',
        resourceType: 'voice_persona',
        resourceId: 'application-id',
      }),
    );
  });

  it('clones and stores a provider voice asset when a target voice sample is approved', async () => {
    samplesRepository.findOne.mockResolvedValue({
      id: 'sample-id',
      applicationId: 'application-id',
      subjectId: 'subject-id',
      recordingId: 'recording-id',
      storageKey: null,
      reviewStatus: VoicePersonaReviewStatus.PENDING_REVIEW,
    });
    applicationsRepository.findOne.mockResolvedValue(buildApplication());

    await expect(
      service.reviewVoiceSample('sample-id', 'admin-id', {
        status: VoicePersonaReviewStatus.APPROVED,
      }),
    ).resolves.toMatchObject({ reviewStatus: VoicePersonaReviewStatus.APPROVED });

    expect(aiClientService.cloneVoice).toHaveBeenCalledWith(
      {
        name: '외할머니 신금자',
        sampleAudioUrl: 'https://storage.example/sample.m4a?signature=test-signature',
      },
      {
        ownerUserId: 'user-id',
        subjectId: 'subject-id',
        feature: ConsentFeature.VOICE_PERSONA,
      },
    );
    expect(providerAssetsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        externalAssetId: 'voice-id',
        providerName: 'elevenlabs',
        status: 'registered',
      }),
    );
  });

  it('registers manual provider assets without provider credentials', async () => {
    applicationsRepository.findOne.mockResolvedValue(buildApplication());

    await expect(
      service.registerProviderAsset('application-id', 'admin-id', {
        providerName: 'manual-provider',
        externalAssetId: 'asset-123',
      }),
    ).resolves.toMatchObject({
      providerName: 'manual-provider',
      externalAssetId: 'asset-123',
    });

    expect(providerAssetsRepository.save).toHaveBeenCalledWith(
      expect.not.objectContaining({
        providerSecret: expect.any(String),
      }),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'voice_provider_asset_register' }),
    );
  });

  it('enables runtime config only after approved Bible, registered asset, and ready build', async () => {
    applicationsRepository.findOne.mockResolvedValue(buildApplication({
      buildStatus: VoicePersonaBuildStatus.READY,
    }));
    personaBiblesRepository.findOne.mockResolvedValue({
      id: 'bible-id',
      applicationId: 'application-id',
      reviewStatus: VoicePersonaReviewStatus.APPROVED,
      contentSummary: 'Family-safe summary',
      safetyNotes: null,
    });
    providerAssetsRepository.find.mockResolvedValue([
      { id: 'asset-id', status: 'registered' },
    ]);
    runtimeConfigsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.approveFamilyReview('application-id', 'user-id'),
    ).resolves.toMatchObject({
      review: expect.objectContaining({ status: 'approved' }),
      runtimeConfig: expect.objectContaining({
        enabled: true,
        personaBibleId: 'bible-id',
        providerAssetId: 'asset-id',
      }),
    });
  });

  it('blocks runtime config enablement when build is not ready', async () => {
    applicationsRepository.findOne.mockResolvedValue(buildApplication({
      buildStatus: VoicePersonaBuildStatus.PENDING_ADMIN_REVIEW,
    }));
    personaBiblesRepository.findOne.mockResolvedValue({
      id: 'bible-id',
      reviewStatus: VoicePersonaReviewStatus.APPROVED,
    });
    providerAssetsRepository.find.mockResolvedValue([
      { id: 'asset-id', status: 'registered' },
    ]);

    await expect(
      service.approveFamilyReview('application-id', 'user-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(runtimeConfigsRepository.save).not.toHaveBeenCalled();
  });
});

function repoMock() {
  return {
    name: Math.random().toString(36).slice(2),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };
}

function buildEntitlement(): Entitlement {
  const entitlement = new Entitlement();
  entitlement.id = 'entitlement-id';
  entitlement.ownerUserId = 'user-id';
  entitlement.feature = ProductFeature.VOICE_PERSONA;
  entitlement.status = EntitlementStatus.ACTIVE;
  entitlement.endsAt = null;
  entitlement.createdAt = new Date('2026-06-18T00:00:00.000Z');
  return entitlement;
}

function buildApplication(
  overrides: Partial<VoicePersonaApplication> = {},
): VoicePersonaApplication {
  const application = new VoicePersonaApplication();
  application.id = 'application-id';
  application.ownerUserId = 'user-id';
  application.subjectId = 'subject-id';
  application.documentsStatus = VoicePersonaReviewStatus.PENDING_REVIEW;
  application.intakeStatus = 'draft';
  application.voiceSampleStatus = VoicePersonaReviewStatus.PENDING_REVIEW;
  application.buildStatus = VoicePersonaBuildStatus.LOCKED_UNTIL_REQUIREMENTS;
  return Object.assign(application, overrides);
}

function buildSubject(): Subject {
  return Object.assign(new Subject(), {
    id: 'subject-id',
    ownerUserId: 'user-id',
    displayName: '신금자',
    relationship: '외할머니',
    glossaryTerms: [
      { term: '정읍', pronunciationHint: '정으비' },
    ],
  });
}

function buildTranscriptSegment(): TranscriptSegment {
  return Object.assign(new TranscriptSegment(), {
    id: 'transcript-segment-id',
    transcriptText: '뭐든지 적당히 하는 게 제일 힘든데.',
    correctedText: null,
  });
}
