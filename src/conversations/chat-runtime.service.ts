import { Injectable } from '@nestjs/common';
import {
  AiChatHistoryItem,
  AiClientService,
  AiProviderConsentContext,
} from '../ai/ai-client.service';
import { Memory } from '../memories/memory.entity';
import { Persona } from '../personas/persona.entity';

export interface AssistantReplyResult {
  content: string;
  retrievedMemoryIds: string[];
  latencyMs: number;
  usedFallback: boolean;
}

@Injectable()
export class ChatRuntimeService {
  constructor(private readonly aiClientService: AiClientService) {}

  async generateAssistantReply(params: {
    persona: Persona;
    userMessage: string;
    memories: Memory[];
    history: AiChatHistoryItem[];
    consentContext: AiProviderConsentContext;
  }): Promise<AssistantReplyResult> {
    const startedAt = Date.now();
    const aiResponse = await this.aiClientService.chat({
      message: params.userMessage,
      history: params.history,
      memories: params.memories.map((memory) => ({
        id: memory.id,
        title: memory.title,
        content: memory.bodyMarkdown,
        tags: memory.tags ?? [],
      })),
      persona: {
        subjectId: params.persona.id,
        instructions: params.persona.description,
        voiceId: params.persona.voiceId,
      },
    }, params.consentContext);

    if (!aiResponse) {
      return {
        content: this.buildFallbackAssistantReply(params),
        retrievedMemoryIds: params.memories.map((memory) => memory.id),
        latencyMs: Date.now() - startedAt,
        usedFallback: true,
      };
    }

    const allowedMemoryIds = new Set(params.memories.map((memory) => memory.id));
    const retrievedMemoryIds = (aiResponse.retrieved_memory_ids ?? []).filter((id) =>
      allowedMemoryIds.has(id),
    );

    return {
      content: aiResponse.content,
      retrievedMemoryIds,
      latencyMs: aiResponse.latency_ms ?? Date.now() - startedAt,
      usedFallback: false,
    };
  }

  buildFallbackAssistantReply(params: {
    persona: Persona;
    userMessage: string;
    memories: Memory[];
  }) {
    const { persona, userMessage, memories } = params;

    if (memories.length > 0) {
      const primaryMemory = memories[0];
      return `${persona.displayName}의 기억을 바탕으로 답할게. "${primaryMemory.title}"에 따르면 ${primaryMemory.bodyMarkdown.slice(0, 120)}${primaryMemory.bodyMarkdown.length > 120 ? '...' : ''}`;
    }

    return `${persona.displayName}의 말투로 답해볼게. "${userMessage}"에 대해 지금 가진 기억은 많지 않지만 따뜻하게 대화를 이어갈 수 있어.`;
  }
}
