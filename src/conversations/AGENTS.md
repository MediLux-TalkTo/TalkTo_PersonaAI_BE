# CONVERSATIONS KNOWLEDGE BASE

## OVERVIEW

`src/conversations/` is the legacy Persona Chat runtime: conversation/session records, text and voice message exchange, memory retrieval, STT/TTS fallback, and short-term memory extraction.

## STRUCTURE

```text
conversations/
+-- dto/                         # Conversation/message API response DTOs
+-- conversation.entity.ts       # Session metadata
+-- message.entity.ts            # User/assistant messages
+-- voice-artifact.entity.ts     # STT/TTS artifact metadata
+-- message-memory-ref.entity.ts # Retrieved memory evidence links
+-- conversations.service.ts     # Main transaction/runtime orchestration
+-- chat-runtime.service.ts      # Fallback reply generation
+-- memory-retrieval.service.ts  # Memory candidate retrieval
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Text exchange | `conversations.service.ts` | `sendTextMessage` creates user + assistant messages in one transaction. |
| Voice exchange | `conversations.service.ts` | `sendVoiceMessage` resolves STT, stores assistant message, then stores TTS artifact. |
| AI fallback | `chat-runtime.service.ts`, `ai/ai-client.service.ts` | Local fallback is used when AI server fails or is absent. |
| Memory evidence | `memory-retrieval.service.ts`, `message-memory-ref.entity.ts` | Retrieved memory ids are persisted against assistant messages. |
| Short-term extraction | `conversations.service.ts` | Queued with `setImmediate`; does not block the API response. |

## CONVENTIONS

- Always assert conversation ownership before reading or writing messages.
- Preserve response guarantees for voice: user message should include `sttText`; assistant message should expose content and TTS status/URL fields.
- TTS can fail independently of assistant text generation; represent that state instead of failing the whole voice request unless the user-facing contract requires it.
- Memory tags are pass-through prompt metadata; backend does not implement the future v1.0 masking/search policy here.
- This module is not the full Voice Persona build/runtime package from v1.0; it is the current chat surface.

## ANTI-PATTERNS

- Do not put paid Memories search, analysis jobs, diarization, or masking pipeline state into this module by default.
- Do not make AI server failures user-visible as 500s when the existing fallback path can preserve the conversation.
- Do not attach feedback or safety-report behavior here unless it is truly tied to conversation transaction integrity.
