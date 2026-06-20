import { ChatRuntimeService } from './chat-runtime.service';
import { ConsentFeature } from '../common/enums/consent.enums';

describe('ChatRuntimeService', () => {
  const consentContext = {
    ownerUserId: 'owner-id',
    feature: ConsentFeature.MEMORIES,
  };
  const persona = {
    displayName: '우리 할머니',
  } as any;
  const memory = {
    id: 'memory-1',
    title: '불고기',
    bodyMarkdown: '불고기는 간장과 마늘을 넣고 만들던 기억',
    tags: ['sensitive'],
  } as any;

  it('uses local fallback when AI server is not configured', async () => {
    const service = new ChatRuntimeService({
      chat: jest.fn().mockResolvedValue(null),
    } as any);

    const result = await service.generateAssistantReply({
      persona,
      userMessage: '안녕',
      memories: [memory],
      history: [],
      consentContext,
    });

    expect(result.usedFallback).toBe(true);
    expect(result.retrievedMemoryIds).toEqual(['memory-1']);
    expect(result.content).toContain('불고기');
  });

  it('filters AI returned memory ids to backend-provided UUIDs', async () => {
    const service = new ChatRuntimeService({
      chat: jest.fn().mockResolvedValue({
        content: '기억을 바탕으로 답변',
        retrieved_memory_ids: ['memory-1', 'legacy-memory'],
        latency_ms: 900,
      }),
    } as any);

    const result = await service.generateAssistantReply({
      persona,
      userMessage: '안녕',
      memories: [memory],
      history: [],
      consentContext,
    });

    expect(result.usedFallback).toBe(false);
    expect(result.retrievedMemoryIds).toEqual(['memory-1']);
    expect(result.latencyMs).toBe(900);
  });

  it('passes memory tags to the AI chat request', async () => {
    const chat = jest.fn().mockResolvedValue({
      content: '태그를 참고한 답변',
      retrieved_memory_ids: ['memory-1'],
      latency_ms: 500,
    });
    const service = new ChatRuntimeService({ chat } as any);

    await service.generateAssistantReply({
      persona,
      userMessage: '마지막을 못 봐서 미안해',
      memories: [memory],
      history: [],
      consentContext,
    });

    expect(chat).toHaveBeenCalledWith(
      {
        message: '마지막을 못 봐서 미안해',
        history: [],
        memories: [
          {
            id: 'memory-1',
            title: '불고기',
            content: '불고기는 간장과 마늘을 넣고 만들던 기억',
            tags: ['sensitive'],
          },
        ],
      },
      consentContext,
    );
  });
});
