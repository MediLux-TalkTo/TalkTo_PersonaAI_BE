import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { ConsentFeature, ConsentType } from '../common/enums/consent.enums';
import { AiClientService } from './ai-client.service';

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

  it('maps /ai/chat response using snake_case fields', async () => {
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
      'http://localhost:8000/ai/chat',
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

  it('maps /ai/memory/extract response without persisting locally', async () => {
    consentsService.assertRequiredConsents.mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        saved: true,
        importance: 7,
        memory_type: 'SHORT_TERM',
        category: '가족',
        summary: '손녀가 다음 달에 이사 간다는 사실',
      }),
    } as unknown as Response);

    const service = new AiClientService({
      get: jest.fn((key: string) =>
        key === 'AI_SERVER_URL' ? 'http://localhost:8000' : undefined,
      ),
    } as unknown as ConfigService, consentsService);

    const result = await service.extractMemory(
      {
        history: [],
        user_message: '나 다음 달에 이사해',
        assistant_message: '어디로 가는데?',
      },
      {
        ownerUserId: 'user-id',
        subjectId: 'subject-id',
      },
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/ai/memory/extract',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(result?.memory_type).toBe('SHORT_TERM');
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

  it('throws when /ai/embed response is missing embedding', async () => {
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
});
