import { ConfigService } from '@nestjs/config';
import { AiClientService } from './ai-client.service';

describe('AiClientService', () => {
  const originalFetch = global.fetch;

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
    } as unknown as ConfigService);

    const result = await service.chat({
      message: '할머니 안녕',
      history: [],
      memories: [{ id: 'memory-1', title: '불고기', content: '불고기 기억' }],
    });

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

  it('maps /ai/memory/extract response without persisting locally', async () => {
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
    } as unknown as ConfigService);

    const result = await service.extractMemory({
      history: [],
      user_message: '나 다음 달에 이사해',
      assistant_message: '어디로 가는데?',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/ai/memory/extract',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(result?.memory_type).toBe('SHORT_TERM');
  });

  it('throws when /ai/embed response is missing embedding', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response);

    const service = new AiClientService({
      get: jest.fn((key: string) =>
        key === 'AI_SERVER_URL' ? 'http://localhost:8000' : undefined,
      ),
    } as unknown as ConfigService);

    await expect(service.embed('hello')).rejects.toThrow(/missing embedding/);
  });
});
