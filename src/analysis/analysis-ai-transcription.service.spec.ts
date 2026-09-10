import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { AiClientService } from '../ai/ai-client.service';
import { AiServerHttpError } from '../ai/ai-server-http.error';
import { ConsentFeature } from '../common/enums/consent.enums';
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
import { MemorySegment } from './memory-segment.entity';
import { TranscriptSegment } from './transcript-segment.entity';
import { PersonaReflection } from '../voice-persona/persona-reflection.entity';

describe('AnalysisAiTranscriptionService', () => {
  const jobsRepository = { findOne: jest.fn() };
  const recordingsRepository = { findOne: jest.fn(), save: jest.fn() };
  const subjectsRepository = { findOne: jest.fn(), save: jest.fn() };
  const applicationsRepository = { findOne: jest.fn() };
  const intakesRepository = { findOne: jest.fn() };
  const samplesRepository = { findOne: jest.fn() };
  const transcriptSegmentsRepository = { find: jest.fn() };
  const memorySegmentsRepository = { find: jest.fn() };
  const reflectionsRepository = {
    create: jest.fn(),
    delete: jest.fn(),
    save: jest.fn(),
  };
  const audioStorageService = { createPlaybackUrl: jest.fn() };
  const aiClientService = {
    requestAnalysisTranscription: jest.fn(),
    requestRecordingAnalysis: jest.fn(),
    requestEmbeddings: jest.fn(),
    reflectPersona: jest.fn(),
    assemblePersona: jest.fn(),
  };
  const workerTransitionsService = {
    markPreprocessing: jest.fn(),
    markStt: jest.fn(),
    markRedaction: jest.fn(),
    markSegmenting: jest.fn(),
    markIndexing: jest.fn(),
    markCompleted: jest.fn(),
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
    workerTransitionsService.markRedaction.mockResolvedValue(
      buildJob({ status: AnalysisJobStatus.REDACTION_PENDING }),
    );
    workerTransitionsService.markSegmenting.mockResolvedValue(
      buildJob({ status: AnalysisJobStatus.SEGMENTING }),
    );
    workerTransitionsService.markIndexing.mockResolvedValue(
      buildJob({ status: AnalysisJobStatus.INDEXING }),
    );
    workerTransitionsService.markCompleted.mockResolvedValue(
      buildJob({ status: AnalysisJobStatus.COMPLETED }),
    );
    recordingsRepository.save.mockImplementation(async (value) => value);
    subjectsRepository.save.mockImplementation(async (value) => value);
    transcriptSegmentsRepository.find.mockResolvedValue([
      buildTranscriptSegment(),
    ]);
    memorySegmentsRepository.find.mockResolvedValue([buildMemorySegment()]);
    reflectionsRepository.create.mockImplementation((value) => value);
    reflectionsRepository.delete.mockResolvedValue({ affected: 1 });
    reflectionsRepository.save.mockImplementation(async (value) => value);
    aiClientService.requestRecordingAnalysis.mockResolvedValue({
      memorySegments: [
        {
          segmentIndex: 0,
          sourceTranscriptSegmentIds: ['transcript-segment-id'],
          startMs: 0,
          endMs: 1200,
          speakerLabel: 'SPK_0',
          memoryText: '정읍 이야기를 했다.',
          confidence: 'confirmed',
          importanceScore: 7,
          tags: ['고향'],
          relatedPeople: ['신금자'],
          sensitivityFlags: [],
        },
      ],
      summary: '정읍 이야기를 했다.',
      tags: ['고향'],
    });
    aiClientService.requestEmbeddings.mockResolvedValue({
      embeddings: [
        {
          memorySegmentId: 'memory-segment-id',
          embedding: [0.1, 0.2],
        },
      ],
      provider: 'openai',
      model: 'text-embedding-3-small',
    });
    aiClientService.reflectPersona.mockResolvedValue({
      reflections: [
        {
          insight: '고향 이야기를 소중히 여긴다.',
          category: '가치관',
          evidenceMemoryIds: ['memory-segment-id', 'memory-segment-2'],
          importance: 8,
        },
      ],
    });
    aiClientService.assemblePersona.mockResolvedValue({
      instructions: '통찰 반영 페르소나 프롬프트',
      subjectName: '신금자',
    });

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
        {
          provide: getRepositoryToken(TranscriptSegment),
          useValue: transcriptSegmentsRepository,
        },
        { provide: getRepositoryToken(MemorySegment), useValue: memorySegmentsRepository },
        { provide: getRepositoryToken(PersonaReflection), useValue: reflectionsRepository },
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
      playbackUrl: 'https://storage.example/recording.m4a?X-Amz-Signature=test-signature',
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
      audioUrl: 'https://storage.example/recording.m4a?X-Amz-Signature=test-signature',
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
        speechStyle: '짧고 담담한 단문',
        personality: '다정함',
        familyMap: [
          {
            name: '종서',
            relation: '막내아들',
            tone: '담배 걱정하는 톤',
          },
        ],
        situationalReactions: [
          {
            situation: '보고 싶어요',
            response: '나도 보고 싶다.',
            avoid: null,
          },
        ],
        tabooTopics: ['상속'],
        memoryCards: [{ title: '정읍', content: '정읍에서 살았다.' }],
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
        provider: 'talkto-personaai-ai',
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
      service.requestAndPersistTranscription('job-id', 'preview'),
    ).resolves.toMatchObject({ status: AnalysisJobStatus.STT_PROCESSING });

    expect(aiClientService.requestAnalysisTranscription).toHaveBeenCalledTimes(2);
    expect(workerTransitionsService.markPreprocessing).toHaveBeenCalledWith('job-id', {
      workerId: 'backend-ai-transcription',
    });
    expect(workerTransitionsService.markStt).toHaveBeenCalledWith('job-id', {
      subjectSpeakerLabel: null,
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

  it('runs full recording analysis, embeddings, reflection, and persona assembly after STT', async () => {
    audioStorageService.createPlaybackUrl.mockResolvedValue({
      playbackUrl: 'https://storage.example/recording.m4a?X-Amz-Signature=test-signature',
      expiresAt: new Date(),
      ttlSeconds: 1800,
      downloadAllowed: false,
    });
    aiClientService.requestAnalysisTranscription.mockResolvedValue({
      provider: 'talkto-personaai-ai',
      model: 'stt-v1',
      subjectSpeakerLabel: 'SPK_0',
      segments: [
        {
          segmentIndex: 0,
          startMs: 0,
          endMs: 1200,
          speakerLabel: 'SPK_0',
          transcriptText: '정읍 이야기',
          confidence: 0.93,
        },
      ],
    });

    await expect(
      service.requestAndPersistTranscription('job-id', 'full'),
    ).resolves.toMatchObject({ status: AnalysisJobStatus.COMPLETED });

    expect(workerTransitionsService.markStt).toHaveBeenCalledWith(
      'job-id',
      expect.objectContaining({ subjectSpeakerLabel: 'SPK_0' }),
    );
    expect(aiClientService.requestRecordingAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationPartnerName: '지영',
        subjectSpeakerLabel: 'SPK_0',
      }),
      expect.objectContaining({ feature: ConsentFeature.MEMORIES }),
    );
    expect(workerTransitionsService.markSegmenting).toHaveBeenCalledWith(
      'job-id',
      expect.objectContaining({
        segments: [
          expect.objectContaining({
            memoryText: '정읍 이야기를 했다.',
            importanceScore: 7,
            tags: ['고향'],
          }),
        ],
      }),
    );
    expect(workerTransitionsService.markIndexing).toHaveBeenCalledWith(
      'job-id',
      expect.objectContaining({
        embeddings: [expect.objectContaining({ memorySegmentId: 'memory-segment-id' })],
      }),
    );
    expect(aiClientService.assemblePersona).toHaveBeenCalledWith(
      expect.objectContaining({
        personaInsights: ['고향 이야기를 소중히 여긴다.'],
      }),
      expect.objectContaining({ feature: ConsentFeature.VOICE_PERSONA }),
    );
  });

  it('maps AI empty transcript failures to the PRV-003 quality guidance code path', async () => {
    audioStorageService.createPlaybackUrl.mockResolvedValue({
      playbackUrl: 'https://storage.example/recording.m4a?X-Amz-Signature=test-signature',
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
    conversationPartnerName: '지영',
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

function buildTranscriptSegment(): TranscriptSegment {
  return Object.assign(new TranscriptSegment(), {
    id: 'transcript-segment-id',
    jobId: 'job-id',
    ownerUserId: 'user-id',
    subjectId: 'subject-id',
    recordingId: 'recording-id',
    segmentIndex: 0,
    startMs: 0,
    endMs: 1200,
    speakerLabel: 'SPK_0',
    transcriptText: '정읍 이야기',
    correctedText: null,
  });
}

function buildMemorySegment(): MemorySegment {
  return Object.assign(new MemorySegment(), {
    id: 'memory-segment-id',
    jobId: 'job-id',
    ownerUserId: 'user-id',
    subjectId: 'subject-id',
    recordingId: 'recording-id',
    segmentIndex: 0,
    startMs: 0,
    endMs: 1200,
    memoryText: '정읍 이야기를 했다.',
    tags: ['고향'],
    importanceScore: 7,
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
      {
        sectionKey: 'speechStyle',
        answers: { value: '짧고 담담한 단문' },
      },
      { sectionKey: 'personality', answers: { value: '다정함' } },
      {
        sectionKey: 'familyMap',
        answers: {
          items: [
            {
              name: '종서',
              relation: '막내아들',
              tone: '담배 걱정하는 톤',
            },
          ],
        },
      },
      {
        sectionKey: 'situationalReactions',
        answers: {
          items: [
            {
              situation: '보고 싶어요',
              response: '나도 보고 싶다.',
              avoid: null,
            },
          ],
        },
      },
      {
        sectionKey: 'tabooTopics',
        answers: { items: ['상속'] },
      },
      {
        sectionKey: 'memoryCards',
        answers: { items: [{ title: '정읍', content: '정읍에서 살았다.' }] },
      },
      {
        sectionKey: 'timeline',
        answers: { items: [{ year: '1980', event: '미소비 필드' }] },
      },
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
