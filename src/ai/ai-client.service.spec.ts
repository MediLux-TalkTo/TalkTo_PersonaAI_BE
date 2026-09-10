import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { ConsentFeature, ConsentType } from '../common/enums/consent.enums';
import { AiClientService } from './ai-client.service';
import { AiServerHttpError } from './ai-server-http.error';

describe('AiClientService', () => {
  const originalFetch = global.fetch;
  const consentsService = {
    assertRequiredConsents: jest.fn(),
  };

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('returns null when AI_SERVER_URL is not configured', async () => {
    const service = new AiClientService({
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService);

    await expect(service.chat({ message: 'hi', history: [], memories: [] })).resolves.toBeNull();
    await expect(service.embed('hello')).resolves.toBeNull();
  });

  it('posts persona response requests to the v1 endpoint', async () => {
    consentsService.assertRequiredConsents.mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        content: '안녕',
        retrieved_memory_ids: ['memory-1'],
        latency_ms: 1200,
      }),
    } as unknown as Response);

    const service = new AiClientService({
      get: jest.fn((key: string) => {
        if (key === 'AI_SERVER_URL') {
          return 'http://localhost:8000/';
        }
        if (key === 'AI_SERVER_TIMEOUT_MS') {
          return 3000;
        }
        if (key === 'AI_SERVER_TOKEN') {
          return 'shared-secret';
        }
        return undefined;
      }),
    } as unknown as ConfigService, consentsService);

    const result = await service.chat(
      {
        message: '할머니 안녕',
        history: [],
        memories: [
          {
            id: 'memory-1',
            title: '불고기',
            content: '불고기 기억',
            tags: ['sensitive'],
          },
        ],
        persona: {
          subjectId: 'subject-id',
          instructions: '대상자 페르소나 프롬프트',
          voiceId: 'voice-id',
        },
      },
      {
        ownerUserId: 'user-id',
        subjectId: 'subject-id',
      },
    );

    expect(consentsService.assertRequiredConsents).toHaveBeenCalledWith(
      'user-id',
      ConsentFeature.MEMORIES,
      'subject-id',
    );
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/v1/persona/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'x-ai-server-token': 'shared-secret',
        }),
      }),
    );
    expect(result).toEqual({
      content: '안녕',
      retrieved_memory_ids: ['memory-1'],
      latency_ms: 1200,
    });
  });

  it('posts persona response requests with assembled instructions', async () => {
    consentsService.assertRequiredConsents.mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        content: '정읍에서 살았지.',
        retrievedMemoryIds: ['memory-1'],
        provider: 'openai',
        model: 'gpt-4.1-mini',
      }),
    } as unknown as Response);

    const service = new AiClientService({
      get: jest.fn((key: string) =>
        key === 'AI_SERVER_URL' ? 'http://localhost:8000' : undefined,
      ),
    } as unknown as ConfigService, consentsService);

    const result = await service.chat(
      {
        message: '어디 사셨어?',
        history: [],
        memories: [{ id: 'memory-1', title: '정읍', content: '정읍 기억' }],
        persona: {
          subjectId: 'subject-id',
          instructions: '대상자 페르소나 프롬프트',
          voiceId: null,
        },
      },
      {
        ownerUserId: 'user-id',
        subjectId: 'subject-id',
        feature: ConsentFeature.VOICE_PERSONA,
      },
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/v1/persona/responses',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(String((global.fetch as jest.Mock).mock.calls[0]?.[1]?.body)).toContain(
      '"instructions":"대상자 페르소나 프롬프트"',
    );
    expect(result).toEqual({
      content: '정읍에서 살았지.',
      retrieved_memory_ids: ['memory-1'],
      latency_ms: undefined,
    });
  });

  it('redacts outbound LLM payload before reaching the provider adapter', async () => {
    consentsService.assertRequiredConsents.mockResolvedValue(undefined);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        content: '안녕',
        retrieved_memory_ids: [],
      }),
    } as unknown as Response);
    global.fetch = fetchMock;

    const service = new AiClientService({
      get: jest.fn((key: string) =>
        key === 'AI_SERVER_URL' ? 'http://localhost:8000' : undefined,
      ),
    } as unknown as ConfigService, consentsService);

    await service.chat(
      {
        message: '연락처는 kim@example.com, 010-1234-5678, 900101-1234567',
        history: [],
        memories: [
          {
            id: 'memory-1',
            title: '연락처',
            content: 'kim@example.com',
          },
        ],
        persona: {
          subjectId: 'subject-id',
          instructions: '대상자 페르소나 프롬프트',
          voiceId: null,
        },
      },
      {
        ownerUserId: 'user-id',
        subjectId: 'subject-id',
      },
    );

    const requestBody = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(requestBody).toContain('[EMAIL]');
    expect(requestBody).toContain('[PHONE]');
    expect(requestBody).toContain('[NATIONAL_ID]');
    expect(requestBody).not.toContain('kim@example.com');
    expect(requestBody).not.toContain('010-1234-5678');
    expect(requestBody).not.toContain('900101-1234567');
  });

  it('maps v1 memory candidate responses without persisting locally', async () => {
    consentsService.assertRequiredConsents.mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [
          {
            shouldStore: true,
            importance: 7,
            category: '가족',
            summary: '손녀가 다음 달에 이사 간다는 사실',
          },
        ],
      }),
    } as unknown as Response);

    const service = new AiClientService({
      get: jest.fn((key: string) =>
        key === 'AI_SERVER_URL' ? 'http://localhost:8000' : undefined,
      ),
    } as unknown as ConfigService, consentsService);

    const result = await service.extractMemoryCandidates(
      {
        history: [],
        userMessage: '나 다음 달에 이사해',
        assistantMessage: '어디로 가는데?',
      },
      {
        ownerUserId: 'user-id',
        subjectId: 'subject-id',
      },
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/v1/persona/memory-candidates',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(result?.candidates[0]?.summary).toBe('손녀가 다음 달에 이사 간다는 사실');
  });

  it('posts analysis transcription JSON with the presigned audio URL and context', async () => {
    consentsService.assertRequiredConsents.mockResolvedValue(undefined);
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        provider: 'talkto-personaai-ai',
        model: 'stt-v1',
        segments: [
          {
            segmentIndex: 0,
            startMs: 0,
            endMs: 1200,
            transcriptText: '정읍 이야기',
            confidence: 0.93,
          },
        ],
      }),
    } as unknown as Response);
    global.fetch = fetchMock;

    const service = new AiClientService({
      get: jest.fn((key: string) => {
        if (key === 'AI_SERVER_URL') {
          return 'http://localhost:8000';
        }
        if (key === 'AI_SERVER_TOKEN') {
          return 'shared-secret';
        }
        return undefined;
      }),
    } as unknown as ConfigService, consentsService);

    const result = await service.requestAnalysisTranscription(
      {
        jobId: 'job-id',
        recordingId: 'recording-id',
        audioUrl: 'https://bucket.example/recording.m4a?X-Amz-Signature=secret',
        audioMimeType: 'audio/m4a',
        mode: 'full',
        language: 'ko',
        speakerDiarization: true,
        glossary: ['정읍'],
        subjectContext: {
          subject: { addressTerm: '외할머니', name: '신금자' },
          familyMembers: [],
          glossaryTerms: ['정읍'],
        },
        intakeContext: null,
      },
      {
        ownerUserId: 'user-id',
        subjectId: 'subject-id',
      },
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/v1/analysis/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'x-ai-server-token': 'shared-secret',
        }),
      }),
    );
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain(
      '"audioUrl":"https://bucket.example/recording.m4a?X-Amz-Signature=secret"',
    );
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 120000);
    setTimeoutSpy.mockRestore();
    expect(result?.segments[0]?.confidence).toBe(0.93);
  });

  it('assembles persona instructions through the stateless AI contract', async () => {
    consentsService.assertRequiredConsents.mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        instructions: '조립된 페르소나 프롬프트',
        subjectName: '신금자',
      }),
    } as unknown as Response);

    const service = new AiClientService({
      get: jest.fn((key: string) =>
        key === 'AI_SERVER_URL' ? 'http://localhost:8000' : undefined,
      ),
    } as unknown as ConfigService, consentsService);

    await expect(
      service.assemblePersona(
        {
          subjectContext: {
            subject: { addressTerm: '외할머니', name: '신금자' },
            familyMembers: [],
            glossaryTerms: ['정읍'],
          },
          intakeContext: {
            basicProfile: { status: '사망' },
            speechStyle: '짧고 담담한 단문',
            personality: '다정함',
            familyMap: [],
            situationalReactions: [],
            tabooTopics: [],
            memoryCards: [],
            sttHints: { names: ['신금자'] },
          },
          speechExamples: ['뭐든지 적당히 하는 게 제일 힘든데.'],
        },
        {
          ownerUserId: 'user-id',
          subjectId: 'subject-id',
          feature: ConsentFeature.VOICE_PERSONA,
        },
      ),
    ).resolves.toEqual({
      instructions: '조립된 페르소나 프롬프트',
      subjectName: '신금자',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/v1/persona/assembly',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('preserves AI 422 reason codes for transcription retry mapping', async () => {
    consentsService.assertRequiredConsents.mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: jest.fn().mockResolvedValue('{"code":"AUDIO_URL_EXPIRED"}'),
    } as unknown as Response);

    const service = new AiClientService({
      get: jest.fn((key: string) =>
        key === 'AI_SERVER_URL' ? 'http://localhost:8000' : undefined,
      ),
    } as unknown as ConfigService, consentsService);

    await expect(
      service.requestAnalysisTranscription(
        {
          jobId: 'job-id',
          recordingId: 'recording-id',
          audioUrl: 'https://bucket.example/recording.m4a?X-Amz-Signature=secret',
          mode: 'full',
          language: 'ko',
          speakerDiarization: true,
          glossary: [],
          subjectContext: {
            subject: { addressTerm: null, name: null },
            familyMembers: [],
            glossaryTerms: [],
          },
          intakeContext: null,
        },
        {
          ownerUserId: 'user-id',
          subjectId: 'subject-id',
        },
      ),
    ).rejects.toMatchObject({
      status: 422,
      code: 'AUDIO_URL_EXPIRED',
    });
    await expect(
      service.requestAnalysisTranscription(
        {
          jobId: 'job-id',
          recordingId: 'recording-id',
          audioUrl: 'https://bucket.example/recording.m4a?X-Amz-Signature=secret',
          mode: 'full',
          language: 'ko',
          speakerDiarization: true,
          glossary: [],
          subjectContext: {
            subject: { addressTerm: null, name: null },
            familyMembers: [],
            glossaryTerms: [],
          },
          intakeContext: null,
        },
        {
          ownerUserId: 'user-id',
          subjectId: 'subject-id',
        },
      ),
    ).rejects.toBeInstanceOf(AiServerHttpError);
  });

  it('질문 임베딩은 text 만 실어 /v1/embeddings/query 로 보낸다', async () => {
    // 기억 벡터화용 /v1/embeddings 는 jobId 와 memorySegmentId 를 UUID 로 요구한다.
    // 거기에 'query' 를 넣어 보내다가 422 로 튕겨 기억 검색이 통째로 죽었었다.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ embedding: [0.1, 0.2] }),
    });

    const service = new AiClientService({
      get: jest.fn((key: string) =>
        key === 'AI_SERVER_URL' ? 'http://localhost:8000' : undefined,
      ),
    } as unknown as ConfigService, consentsService);

    await expect(
      service.embed('할머니 이야기', {
        ownerUserId: 'user-id',
        feature: ConsentFeature.MEMORIES,
        bypassConsentCheck: true,
      }),
    ).resolves.toEqual([0.1, 0.2]);

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(String(url)).toContain('/v1/embeddings/query');
    const sent = JSON.parse(String(init.body));
    expect(sent.text).toBe('할머니 이야기');
    expect(sent.jobId).toBeUndefined();
  });

  it('blocks configured provider calls when consent context is missing', async () => {
    global.fetch = jest.fn();

    const service = new AiClientService({
      get: jest.fn((key: string) =>
        key === 'AI_SERVER_URL' ? 'http://localhost:8000' : undefined,
      ),
    } as unknown as ConfigService, consentsService);

    await expect(service.embed('hello')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'requires_consent',
        missing_consent_types: expect.arrayContaining([
          ConsentType.AI_ANALYSIS_SERVICE,
          ConsentType.OVERSEAS_TRANSFER_LLM_PROVIDER,
        ]),
      }),
    });
    await expect(service.embed('hello')).rejects.toBeInstanceOf(ForbiddenException);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('allows explicit persona chat bypass without checking purpose consent', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        content: '기존 채팅 답변',
        retrievedMemoryIds: [],
      }),
    } as unknown as Response);

    const service = new AiClientService({
      get: jest.fn((key: string) =>
        key === 'AI_SERVER_URL' ? 'http://localhost:8000' : undefined,
      ),
    } as unknown as ConfigService, consentsService);

    await expect(
      service.chat(
        {
          message: '엄마 사랑해',
          history: [],
          memories: [],
          persona: {
            subjectId: 'subject-id',
            instructions: '대상자 페르소나 프롬프트',
            voiceId: null,
          },
        },
        {
          ownerUserId: 'anonymous-session-id',
          feature: ConsentFeature.MEMORIES,
          bypassConsentCheck: true,
        },
      ),
    ).resolves.toMatchObject({ content: '기존 채팅 답변' });

    expect(consentsService.assertRequiredConsents).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/v1/persona/responses',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('blocks embedding provider calls when required redaction fails', async () => {
    consentsService.assertRequiredConsents.mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ embedding: [0.1] }),
    } as unknown as Response);

    const service = new AiClientService({
      get: jest.fn((key: string) =>
        key === 'AI_SERVER_URL' ? 'http://localhost:8000' : undefined,
      ),
    } as unknown as ConfigService, consentsService);

    await expect(
      service.embed('malformed\u0000kim@example.com', {
        ownerUserId: 'user-id',
        subjectId: 'subject-id',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'provider_redaction_failed',
      }),
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws when v1 embedding response is missing embedding', async () => {
    consentsService.assertRequiredConsents.mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response);

    const service = new AiClientService({
      get: jest.fn((key: string) =>
        key === 'AI_SERVER_URL' ? 'http://localhost:8000' : undefined,
      ),
    } as unknown as ConfigService, consentsService);

    await expect(
      service.embed('hello', {
        ownerUserId: 'user-id',
        subjectId: 'subject-id',
      }),
    ).rejects.toThrow(/missing embedding/);
  });

  it('uses Voice Persona consent for TTS provider calls', async () => {
    consentsService.assertRequiredConsents.mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'audio/mpeg' }),
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1)),
    } as unknown as Response);

    const service = new AiClientService({
      get: jest.fn((key: string) =>
        key === 'AI_SERVER_URL' ? 'http://localhost:8000' : undefined,
      ),
    } as unknown as ConfigService, consentsService);

    await expect(
      service.synthesizeSpeech('안녕', {
        voiceId: 'voice-id',
      }, {
        ownerUserId: 'user-id',
        subjectId: 'subject-id',
      }),
    ).resolves.toBeInstanceOf(Buffer);

    expect(consentsService.assertRequiredConsents).toHaveBeenCalledWith(
      'user-id',
      ConsentFeature.VOICE_PERSONA,
      'subject-id',
    );
  });

  it('posts multi-segment voice clone samples to the v1 endpoint', async () => {
    consentsService.assertRequiredConsents.mockResolvedValue(undefined);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        voiceId: 'voice-id',
        provider: 'elevenlabs',
      }),
    } as unknown as Response);
    global.fetch = fetchMock;

    const service = new AiClientService({
      get: jest.fn((key: string) =>
        key === 'AI_SERVER_URL' ? 'http://localhost:8000' : undefined,
      ),
    } as unknown as ConfigService, consentsService);

    await expect(
      service.cloneVoice(
        {
          name: '외할머니 신금자',
          samples: [
            {
              audioUrl:
                'https://bucket.example/recording-1.m4a?X-Amz-Signature=test',
              startMs: 5000,
              endMs: 13000,
            },
            {
              audioUrl:
                'https://bucket.example/recording-2.m4a?X-Amz-Signature=test',
              startMs: 40000,
              endMs: 52000,
            },
          ],
        },
        {
          ownerUserId: 'user-id',
          subjectId: 'subject-id',
        },
      ),
    ).resolves.toEqual({ voiceId: 'voice-id', provider: 'elevenlabs' });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/v1/voice/clone',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    const requestBody = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(requestBody).toContain('"samples"');
    expect(requestBody).toContain('"audioUrl"');
    expect(requestBody).not.toContain('"sampleAudioUrl"');
  });
});
