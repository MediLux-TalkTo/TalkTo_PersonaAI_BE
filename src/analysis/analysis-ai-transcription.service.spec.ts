import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { AiClientService } from '../ai/ai-client.service';
import { AiServerHttpError } from '../ai/ai-server-http.error';
import { Recording } from '../recordings/recording.entity';
import { AudioStorageService } from '../storage/audio-storage.service';
import { FamilyGlossaryTerm } from '../subjects/family-glossary-term.entity';
import { Subject } from '../subjects/subject.entity';
import { PersonaIntake } from '../voice-persona/persona-intake.entity';
import { TargetVoiceSample } from '../voice-persona/target-voice-sample.entity';
import { VoicePersonaApplication } from '../voice-persona/voice-persona-application.entity';
import { AnalysisAiTranscriptionService } from './analysis-ai-transcription.service';
import { AnalysisJobStatus } from './analysis-job.constants';
import { AnalysisJob } from './analysis-job.entity';
import { AnalysisWorkerTransitionsService } from './analysis-worker-transitions.service';

describe('AnalysisAiTranscriptionService', () => {
  const jobsRepository = { findOne: jest.fn() };
  const recordingsRepository = { findOne: jest.fn() };
  const subjectsRepository = { findOne: jest.fn() };
  const applicationsRepository = { findOne: jest.fn() };
  const intakesRepository = { findOne: jest.fn() };
  const samplesRepository = { findOne: jest.fn() };
  const audioStorageService = { createPlaybackUrl: jest.fn() };
  const aiClientService = { requestAnalysisTranscription: jest.fn() };
  const workerTransitionsService = {
    markPreprocessing: jest.fn(),
    markStt: jest.fn(),
    markFailed: jest.fn(),
  };
  let service: AnalysisAiTranscriptionService;

  beforeEach(async () => {
    jest.resetAllMocks();
    jobsRepository.findOne.mockResolvedValue(buildJob());
    recordingsRepository.findOne.mockResolvedValue(buildRecording());
    subjectsRepository.findOne.mockResolvedValue(buildSubject());
    applicationsRepository.findOne.mockResolvedValue(buildApplication());
    intakesRepository.findOne.mockResolvedValue(buildIntake());
    samplesRepository.findOne.mockResolvedValue(buildSample());
    workerTransitionsService.markPreprocessing.mockResolvedValue(
      buildJob({ status: AnalysisJobStatus.PREPROCESSING }),
    );
    workerTransitionsService.markStt.mockResolvedValue(
      buildJob({ status: AnalysisJobStatus.STT_PROCESSING }),
    );
    workerTransitionsService.markFailed.mockResolvedValue(
      buildJob({ status: AnalysisJobStatus.FAILED_RETRYABLE }),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        AnalysisAiTranscriptionService,
        { provide: getRepositoryToken(AnalysisJob), useValue: jobsRepository },
        { provide: getRepositoryToken(Recording), useValue: recordingsRepository },
        { provide: getRepositoryToken(Subject), useValue: subjectsRepository },
        {
          provide: getRepositoryToken(VoicePersonaApplication),
          useValue: applicationsRepository,
        },
        { provide: getRepositoryToken(PersonaIntake), useValue: intakesRepository },
        { provide: getRepositoryToken(TargetVoiceSample), useValue: samplesRepository },
        { provide: AudioStorageService, useValue: audioStorageService },
        { provide: AiClientService, useValue: aiClientService },
        {
          provide: AnalysisWorkerTransitionsService,
          useValue: workerTransitionsService,
        },
      ],
    }).compile();

    service = moduleRef.get(AnalysisAiTranscriptionService);
  });

  it('builds the TalkTo_APP_AI transcription payload from recording, subject, glossary, and intake context', async () => {
    audioStorageService.createPlaybackUrl.mockResolvedValue({
      playbackUrl: 'https://storage.example/recording.m4a?X-Amz-Signature=secret',
      expiresAt: new Date(),
      ttlSeconds: 1800,
      downloadAllowed: false,
    });

    const request = await service.buildTranscriptionRequest('job-id', 'preview');

    expect(audioStorageService.createPlaybackUrl).toHaveBeenCalledWith(
      'recordings/user-id/subject-id/recording-id.m4a',
      1800,
    );
    expect(request).toMatchObject({
      jobId: 'job-id',
      recordingId: 'recording-id',
      audioUrl: 'https://storage.example/recording.m4a?X-Amz-Signature=secret',
      audioMimeType: 'audio/m4a',
      mode: 'preview',
      language: 'ko',
      speakerDiarization: true,
      glossary: ['정읍', '정으비', '매실청'],
      subjectContext: {
        subject: { addressTerm: '외할머니', name: '신금자' },
        familyMembers: [],
        glossaryTerms: ['정읍', '정으비', '매실청'],
      },
      intakeContext: {
        basicProfile: { birthPlace: '정읍' },
        familyMap: { eldest: '종서' },
        sttHints: {
          names: ['신금자', '정읍', '정으비', '매실청'],
          voiceSampleRef: {
            documentId: 'sample-id',
            startMs: 12000,
            endMs: 25000,
          },
        },
      },
    });
  });

  it('reissues the signed audio URL once for transient AI download failures and persists confidence', async () => {
    audioStorageService.createPlaybackUrl
      .mockResolvedValueOnce({
        playbackUrl: 'https://storage.example/expired.m4a?X-Amz-Signature=old',
        expiresAt: new Date(),
        ttlSeconds: 1800,
        downloadAllowed: false,
      })
      .mockResolvedValueOnce({
        playbackUrl: 'https://storage.example/fresh.m4a?X-Amz-Signature=new',
        expiresAt: new Date(),
        ttlSeconds: 1800,
        downloadAllowed: false,
      });
    aiClientService.requestAnalysisTranscription
      .mockRejectedValueOnce(new AiServerHttpError(422, 'AUDIO_URL_EXPIRED', {}))
      .mockResolvedValueOnce({
        provider: 'talkto-app-ai',
        model: 'stt-v1',
        segments: [
          {
            startMs: 0,
            endMs: 1200,
            text: '정읍 이야기',
            correctedText: '정읍 이야기입니다',
            needsReview: true,
            confidence: 0.93,
          },
        ],
      });

    await expect(
      service.requestAndPersistTranscription('job-id', 'full'),
    ).resolves.toMatchObject({ status: AnalysisJobStatus.STT_PROCESSING });

    expect(aiClientService.requestAnalysisTranscription).toHaveBeenCalledTimes(2);
    expect(workerTransitionsService.markPreprocessing).toHaveBeenCalledWith('job-id', {
      workerId: 'backend-ai-transcription',
    });
    expect(workerTransitionsService.markStt).toHaveBeenCalledWith('job-id', {
      segments: [
        {
          segmentIndex: 0,
          startMs: 0,
          endMs: 1200,
          speakerLabel: undefined,
          transcriptText: '정읍 이야기',
          correctedText: '정읍 이야기입니다',
          needsReview: true,
          confidence: 0.93,
        },
      ],
    });
  });

  it('maps AI empty transcript failures to the PRV-003 quality guidance code path', async () => {
    audioStorageService.createPlaybackUrl.mockResolvedValue({
      playbackUrl: 'https://storage.example/recording.m4a?X-Amz-Signature=secret',
      expiresAt: new Date(),
      ttlSeconds: 1800,
      downloadAllowed: false,
    });
    aiClientService.requestAnalysisTranscription.mockRejectedValue(
      new AiServerHttpError(422, 'EMPTY_TRANSCRIPT', {}),
    );

    await expect(
      service.requestAndPersistTranscription('job-id', 'full'),
    ).resolves.toMatchObject({ status: AnalysisJobStatus.FAILED_RETRYABLE });

    expect(workerTransitionsService.markFailed).toHaveBeenCalledWith('job-id', {
      failureCode: 'empty_transcript',
      failureMessage: 'PRV-003 음질 부족: 음성 인식 결과가 비어 있습니다.',
    });
  });
});

function buildJob(overrides: Partial<AnalysisJob> = {}): AnalysisJob {
  return Object.assign(new AnalysisJob(), {
    id: 'job-id',
    ownerUserId: 'user-id',
    subjectId: 'subject-id',
    recordingId: 'recording-id',
    status: AnalysisJobStatus.QUEUED,
    retryCount: 0,
    maxRetries: 3,
    ...overrides,
  });
}

function buildRecording(): Recording {
  return Object.assign(new Recording(), {
    id: 'recording-id',
    ownerUserId: 'user-id',
    subjectId: 'subject-id',
    storageKey: 'recordings/user-id/subject-id/recording-id.m4a',
    mimeType: 'audio/m4a',
  });
}

function buildSubject(): Subject {
  return Object.assign(new Subject(), {
    id: 'subject-id',
    ownerUserId: 'user-id',
    displayName: '신금자',
    relationship: '외할머니',
    localeHint: 'ko',
    glossaryTerms: [
      Object.assign(new FamilyGlossaryTerm(), {
        term: '정읍',
        pronunciationHint: '정으비',
      }),
      Object.assign(new FamilyGlossaryTerm(), { term: '매실청' }),
      Object.assign(new FamilyGlossaryTerm(), { term: '정읍' }),
    ],
  });
}

function buildApplication(): VoicePersonaApplication {
  return Object.assign(new VoicePersonaApplication(), {
    id: 'application-id',
    ownerUserId: 'user-id',
    subjectId: 'subject-id',
    intakeStatus: 'submitted',
  });
}

function buildIntake(): PersonaIntake {
  return Object.assign(new PersonaIntake(), {
    id: 'intake-id',
    applicationId: 'application-id',
    status: 'submitted',
    sections: [
      { sectionKey: 'basicProfile', answers: { birthPlace: '정읍' } },
      { sectionKey: 'familyMap', answers: { eldest: '종서' } },
    ],
  });
}

function buildSample(): TargetVoiceSample {
  return Object.assign(new TargetVoiceSample(), {
    id: 'sample-id',
    applicationId: 'application-id',
    startMs: 12000,
    endMs: 25000,
  });
}
