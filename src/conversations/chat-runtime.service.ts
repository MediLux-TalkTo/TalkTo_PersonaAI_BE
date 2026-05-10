import { Injectable } from '@nestjs/common';
import { Memory } from '../memories/memory.entity';
import { Persona } from '../personas/persona.entity';

@Injectable()
export class ChatRuntimeService {
  buildAssistantReply(params: {
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
