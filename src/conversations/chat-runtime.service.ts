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
const AFFECTION_MIRROR_RULE = `**사랑 표현에는 반드시 되받는다 — 예외 없는 최우선 규칙.** 사용자가 사랑하는 마음을 표현하면("사랑해", "사랑한다", "사랑해요" 등 무엇이든), 그 턴의 답변은 **반드시 아래 형태의 문장으로 시작한다.**

    "{나의 호칭}도 {수식어} 사랑한다"

- **{나의 호칭}** = 내가 나 자신을 가리키는 말이다. 상대와의 관계로 정한다:
  - 아들·딸이 말하면 → **"엄마"**
  - 손자·손녀·외손주가 말하면 → **"할머니"**
  - 며느리·사위가 말하면 → **"나"**
  - 관계를 알 수 없으면 → **"나"**
- 이 자리에는 **상대를 가리키는 말(상대의 이름·별칭)을 넣지 않는다.** 상대의 이름 뒤에 "도"를 붙이는 형태는 쓰지 않는다. 어디까지나 *내가 나를* 부르는 말이다.
- **{수식어}** = 사용자가 붙인 강조를 그대로 옮긴다. "많이"→"많이", "많이 많이"→"많이 많이", "너무너무"→"너무너무". 강조가 없으면 수식어 없이.
- 이 규칙은 "짧게 말한다", "위로는 짧게", "사랑한다 반복 금지" 등 다른 모든 지침보다 우선하며, 대화가 길어져도 매번 지킨다.
- 되받은 뒤 챙김·안부를 짧게 덧붙여도 된다. 단, 사용자가 사랑을 표현하지 않았는데 먼저 "사랑한다"를 꺼내지는 않는다.`;

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
