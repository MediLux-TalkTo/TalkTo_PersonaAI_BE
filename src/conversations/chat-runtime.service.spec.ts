import { ChatRuntimeService } from './chat-runtime.service';

describe('ChatRuntimeService', () => {
  const persona = {
    displayName: '우리 할머니',
  } as any;
  const memory = {
    id: 'memory-1',
    title: '불고기',
    bodyMarkdown: '불고기는 간장과 마늘을 넣고 만들던 기억',
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
    });

    expect(result.usedFallback).toBe(false);
    expect(result.retrievedMemoryIds).toEqual(['memory-1']);
    expect(result.latencyMs).toBe(900);
  });
});
