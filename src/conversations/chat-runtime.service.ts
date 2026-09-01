import { Injectable } from '@nestjs/common';
import {
  AiChatHistoryItem,
  AiClientService,
  AiProviderConsentContext,
} from '../ai/ai-client.service';
import { Memory } from '../memories/memory.entity';
import { Persona } from '../personas/persona.entity';

// 사랑 표현 되받기 규칙. 저장된 페르소나 지시(systemPrompt/description)에 이 규칙이
// 없을 수 있어, 채팅 지시를 조립할 때 항상 덧붙인다(이미 있으면 덧붙이지 않는다).
const AFFECTION_MIRROR_HEADING = '# 사랑 표현 규칙';
const AFFECTION_MIRROR_MARKER = '사랑 표현에는 반드시';
const AFFECTION_MIRROR_RULE = `**사랑 표현에는 반드시 되받는다 — 예외 없는 최우선 규칙.** 사용자가 사랑하는 마음을 표현하면(표현이 "사랑해", "사랑한다", "사랑해요" 등 무엇이든), 그 턴의 답변은 반드시 사랑을 되돌려주는 말로 시작한다. 이 규칙은 "짧게 말한다", "위로는 짧게", "사랑한다 반복 금지" 등 다른 모든 지침보다 우선하며, 대화가 길어져도 매번 지킨다.
- 자기호칭은 그 사용자가 나를 부르는 호칭 그대로. "엄마"라고 부르면 "엄마도", "할머니"라고 부르면 "할머니도". 메시지에 호칭이 없으면 관계로 정한다(자녀→"엄마도", 손주·외손주→"할머니도", 며느리·사위→"나도"). 관계와 어긋난 호칭은 쓰지 않는다.
- 수식어는 사용자가 쓴 그대로 복창한다. "많이"→"많이", "많이 많이"→"많이 많이", "너무너무"→"너무너무" 등 어떤 강조든 똑같이. 강조가 없으면 그냥 "○○도 사랑한다".
- 예: "엄마 사랑해"→"엄마도 사랑한다", "할머니 너무너무 사랑해"→"할머니도 너무너무 사랑한다".
단, 사용자가 사랑을 표현하지 않았는데 먼저 "사랑한다"를 꺼내지는 않는다.`;

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
        instructions: this.buildInstructions(params.persona),
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

  /**
   * 채팅에 쓸 페르소나 지시를 만든다.
   * systemPrompt(전용 지시 칸)가 있으면 그것을, 없으면 description을 기본으로 삼고,
   * 사랑 표현 되받기 규칙이 아직 없으면 뒤에 덧붙인다.
   */
  private buildInstructions(persona: Persona): string {
    const base = persona.systemPrompt?.trim()
      ? persona.systemPrompt
      : (persona.description ?? '');

    if (base.includes(AFFECTION_MIRROR_MARKER)) {
      return base;
    }

    return `${base}\n\n${AFFECTION_MIRROR_HEADING}\n\n${AFFECTION_MIRROR_RULE}`;
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
