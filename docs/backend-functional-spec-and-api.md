# Persona AI MVP Backend Functional Spec and API Design

## 1. Scope

This document defines the backend MVP scope for TalkTo Persona AI based on the Notion page `Persona AI MVP 기능명세서`.

Backend scope only:

- Authentication and authorization
- Family user management
- Persona profile delivery
- Conversation and message persistence
- Voice session storage and fallback handling
- Memory CRUD and audit logging
- Response feedback collection
- Admin analytics and operational logs

Out of scope for this document:

- Frontend screen design
- Internal AI prompt design details
- Embedding model implementation details beyond backend contracts

Current hosted MVP baseline:

- Backend: `https://talkto-personaai-be.onrender.com`
- AI server: `https://talkto-persona-ai.onrender.com`
- Database: Neon PostgreSQL
- Voice TTS asset storage: private Cloudflare R2 objects returned through signed URLs
- Existing long-term memory import: AI repository `data/memories.json` is the source data and `backend_memory/memory_import.json` is the backend import payload
- 2026-05-24 check: AI repository `main` currently exposes 44 memories; ver4 72-memory import is pending on the AI data update and backend re-import

## 2. Product Goal

The MVP provides a web backend that allows family users to chat with a grandmother persona in text and voice, while preserving conversation history, memory references, feedback, and admin-level usage visibility.

## 3. User Roles

### 3.1 Family User

- Can sign in
- Can view available persona information
- Can start and continue conversations
- Can send text and voice messages
- Can view and manage memories allowed for the MVP
- Can submit feedback on assistant responses

### 3.2 Admin

- Has all Family User privileges when needed for support
- Can manage invited family accounts
- Can manage persona profile metadata
- Can review memory changes and audit logs
- Can inspect usage, feedback, and error dashboards

## 4. Core Domain Model

### 4.1 User

- `id`
- `name`
- `email`
- `phone_number` nullable
- `password_hash`
- `role` enum: `FAMILY`, `ADMIN`
- `status` enum: `INVITED`, `ACTIVE`, `DISABLED`
- `last_login_at`
- `created_at`
- `updated_at`

### 4.2 Consent

- `id`
- `user_id`
- `persona_disclaimer_accepted`
- `conversation_storage_accepted`
- `voice_synthesis_accepted`
- `accepted_at`

### 4.3 Persona

- `id`
- `display_name`
- `description`
- `profile_image_url` nullable
- `voice_id`
- `model_id`
- `is_active`
- `created_at`
- `updated_at`

### 4.4 Conversation

- `id`
- `user_id`
- `persona_id`
- `channel` enum: `TEXT`, `VOICE`
- `title` nullable
- `started_at`
- `last_message_at`
- `ended_at` nullable

### 4.5 Message

- `id`
- `conversation_id`
- `sender_type` enum: `USER`, `ASSISTANT`, `SYSTEM`
- `content`
- `input_mode` enum: `TEXT`, `VOICE`
- `retrieved_memory_ids` JSON array nullable
- `latency_ms` nullable
- `status` enum: `PENDING`, `COMPLETED`, `FAILED`
- `failure_reason` nullable
- `created_at`

### 4.6 Voice Artifact

- `id`
- `message_id`
- `audio_input_url` nullable
- `stt_text` nullable
- `tts_audio_url` nullable
- `stt_status` enum: `PENDING`, `COMPLETED`, `FAILED`
- `tts_status` enum: `PENDING`, `COMPLETED`, `FAILED`
- `fallback_text_used` boolean
- `created_at`

### 4.7 Memory

- `id`
- `title`
- `memory_type`
- `related_people` JSON array
- `related_period` nullable
- `body_markdown`
- `tags` JSON array
- `confidence_score`
- `status` enum: `ACTIVE`, `INACTIVE`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

### 4.8 Memory Revision

- `id`
- `memory_id`
- `action` enum: `CREATE`, `UPDATE`, `DEACTIVATE`, `REEMBED_REQUESTED`
- `before_snapshot` JSON nullable
- `after_snapshot` JSON nullable
- `actor_user_id`
- `reason` nullable
- `created_at`

### 4.9 Feedback

- `id`
- `message_id`
- `user_id`
- `rating` enum: `UP`, `DOWN`
- `tags` JSON array
- `comment` nullable
- `created_at`

### 4.10 System Log

- `id`
- `category` enum: `LLM`, `STT`, `TTS`, `AUTH`, `MEMORY`, `SYSTEM`
- `severity` enum: `INFO`, `WARN`, `ERROR`
- `conversation_id` nullable
- `message_id` nullable
- `detail` JSON
- `occurred_at`

## 5. Functional Requirements

## 5.1 Authentication and Authorization

- Support sign-in for invited family users and admins
- Issue access token and refresh token
- Block access to protected APIs without valid authentication
- Enforce role-based authorization for admin-only routes
- Record `last_login_at` on successful login
- Support logout by invalidating refresh token/session

## 5.2 Consent Handling

- Require consent completion before conversation features become available
- Save latest consent record per user
- Expose consent status for frontend gating

## 5.3 User Management

- Admin can create invited family accounts
- Admin can disable accounts
- Admin can list family users with role and latest activity

## 5.4 Persona Delivery

- Expose the active persona profile used by the client
- Store persona metadata needed by AI and voice systems
- Allow admin update of persona metadata without changing API shape

## 5.5 Conversation and Messaging

- Create conversation session
- List user conversations
- Retrieve full message history for one conversation
- Save user messages and assistant responses
- Persist `retrieved_memory_ids` for every assistant response when available
- Persist latency for AI generation
- Support recent conversation resume

## 5.6 Voice Handling

- Accept voice input upload
- Save STT result text
- Save TTS output URL for assistant voice playback
- Mark failed STT or TTS steps and preserve text fallback state

## 5.7 Memory Management

- List memories with filtering and search
- Create memory entries
- Update memory entries
- Deactivate memory instead of hard delete for MVP safety
- Record revision audit logs for every write
- Accept re-embedding request state changes

## 5.8 Feedback Collection

- One feedback record per assistant message per user
- Support rating, tags, and optional free-text comment
- Provide admin list view for review

## 5.9 Admin Analytics and Logging

- Aggregate total users, conversations, messages
- Aggregate voice usage
- Aggregate positive and negative feedback ratio
- Provide filtered error logs for STT, TTS, and LLM failures

## 6. API Design Principles

- REST-first JSON API
- Versioned under `/api/v1`
- JWT bearer auth for protected routes
- Consistent response envelope for non-streaming endpoints
- Cursor pagination for list endpoints
- Soft delete and auditability for memory data
- Signed URLs for private voice assets

### 6.1 Standard Response Shape

```json
{
  "success": true,
  "data": {},
  "meta": {
    "request_id": "req_123",
    "timestamp": "2026-05-10T15:00:00Z"
  }
}
```

### 6.2 Standard Error Shape

```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_TOKEN",
    "message": "Authentication is required.",
    "details": {}
  },
  "meta": {
    "request_id": "req_123",
    "timestamp": "2026-05-10T15:00:00Z"
  }
}
```

## 7. Endpoint Summary

| Area | Method | Path | Purpose | Auth |
| --- | --- | --- | --- | --- |
| Auth | POST | `/api/v1/auth/login` | Sign in | Public |
| Auth | POST | `/api/v1/auth/refresh` | Refresh access token | Public |
| Auth | POST | `/api/v1/auth/logout` | Sign out | User |
| Auth | GET | `/api/v1/auth/me` | Current user profile | User |
| Consent | GET | `/api/v1/consents/me` | Get consent status | User |
| Consent | POST | `/api/v1/consents` | Save consent | User |
| Users | GET | `/api/v1/admin/users` | List users | Admin |
| Users | POST | `/api/v1/admin/users/invitations` | Invite family user | Admin |
| Users | PATCH | `/api/v1/admin/users/{userId}` | Update user status or role | Admin |
| Persona | GET | `/api/v1/personas/active` | Get active persona | User |
| Persona | PATCH | `/api/v1/admin/personas/{personaId}` | Update persona metadata | Admin |
| Conversations | POST | `/api/v1/conversations` | Create conversation | User |
| Conversations | GET | `/api/v1/conversations` | List my conversations | User |
| Conversations | GET | `/api/v1/conversations/{conversationId}` | Get conversation detail | User |
| Messages | POST | `/api/v1/conversations/{conversationId}/messages/text` | Send text message | User |
| Messages | POST | `/api/v1/conversations/{conversationId}/messages/voice` | Send voice message | User |
| Memories | GET | `/api/v1/memories` | List memories | User |
| Memories | GET | `/api/v1/memories/{memoryId}` | Get memory detail | User |
| Memories | POST | `/api/v1/memories` | Create memory | Admin |
| Memories | PATCH | `/api/v1/memories/{memoryId}` | Update memory | Admin |
| Memories | POST | `/api/v1/memories/{memoryId}/deactivate` | Deactivate memory | Admin |
| Memories | POST | `/api/v1/memories/{memoryId}/reembed` | Request re-embedding | Admin |
| Feedback | POST | `/api/v1/messages/{messageId}/feedback` | Submit feedback | User |
| Feedback | GET | `/api/v1/admin/feedback` | List all feedback | Admin |
| Feedback | GET | `/api/v1/admin/feedback/negative-summary` | Negative feedback tag summary | Admin |
| Feedback | GET | `/api/v1/admin/feedback/reviews` | Feedback review queue | Admin |
| Admin | GET | `/api/v1/admin/metrics/overview` | Usage overview | Admin |
| Admin | GET | `/api/v1/admin/logs/errors` | Error logs | Admin |

## 8. Endpoint Details

### 8.1 POST `/api/v1/auth/login`

Request:

```json
{
  "identifier": "user@example.com",
  "password": "string"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "access_token": "jwt",
    "refresh_token": "jwt",
    "expires_in": 3600,
    "user": {
      "id": "usr_123",
      "name": "홍길동",
      "role": "FAMILY",
      "consent_required": true
    }
  }
}
```

### 8.2 POST `/api/v1/consents`

Request:

```json
{
  "persona_disclaimer_accepted": true,
  "conversation_storage_accepted": true,
  "voice_synthesis_accepted": true
}
```

### 8.3 GET `/api/v1/personas/active`

Response:

```json
{
  "success": true,
  "data": {
    "id": "per_123",
    "display_name": "우리 할머니",
    "description": "따뜻하고 안정적인 말투",
    "profile_image_url": "https://...",
    "voice_enabled": true
  }
}
```

### 8.4 POST `/api/v1/conversations`

Request:

```json
{
  "persona_id": "per_123",
  "channel": "TEXT"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "conv_123",
    "channel": "TEXT",
    "started_at": "2026-05-10T15:00:00Z"
  }
}
```

### 8.5 POST `/api/v1/conversations/{conversationId}/messages/text`

Request:

```json
{
  "content": "할머니 오늘 뭐 하셨어요?"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user_message": {
      "id": "msg_user_1",
      "content": "할머니 오늘 뭐 하셨어요?"
    },
    "assistant_message": {
      "id": "msg_ai_1",
      "content": "오늘은 네 생각 많이 했지.",
      "retrieved_memory_ids": [
        "mem_101",
        "mem_205"
      ],
      "latency_ms": 1840
    }
  }
}
```

### 8.6 POST `/api/v1/conversations/{conversationId}/messages/voice`

Content type:

- `multipart/form-data`

Fields:

- `audio_file`
- `persona_id`

Response:

```json
{
  "success": true,
  "data": {
    "user_message": {
      "id": "msg_user_2",
      "input_mode": "VOICE",
      "stt_text": "할머니 오늘 뭐 하셨어요?"
    },
    "assistant_message": {
      "id": "msg_ai_2",
      "content": "오늘은 꽃에 물도 주고 네 생각도 했단다.",
      "tts_audio_url": "https://signed-url.example.com/audio.mp3",
      "fallback_text_used": false
    }
  }
}
```

### 8.7 GET `/api/v1/memories`

Query:

- `q`
- `type`
- `person`
- `status`
- `cursor`
- `limit`

Response item:

```json
{
  "id": "mem_101",
  "title": "봄 소풍",
  "memory_type": "EPISODE",
  "related_people": ["손자"],
  "related_period": "1998-04",
  "tags": ["봄", "소풍"],
  "confidence_score": 0.92,
  "status": "ACTIVE"
}
```

### 8.8 POST `/api/v1/memories`

Request:

```json
{
  "title": "봄 소풍",
  "memory_type": "EPISODE",
  "related_people": ["손자"],
  "related_period": "1998-04",
  "body_markdown": "그날 같이 김밥을 먹었지.",
  "tags": ["봄", "소풍"],
  "confidence_score": 0.92
}
```

### 8.9 PATCH `/api/v1/memories/{memoryId}`

Request fields are partial updates for:

- `title`
- `memory_type`
- `related_people`
- `related_period`
- `body_markdown`
- `tags`
- `confidence_score`

Every successful write must create a `MemoryRevision` record.

### 8.10 POST `/api/v1/messages/{messageId}/feedback`

Request:

```json
{
  "rating": "UP",
  "tags": ["WARM", "NATURAL"],
  "comment": "말투가 자연스러웠어요."
}
```

### 8.11 GET `/api/v1/admin/feedback/negative-summary`

Response item:

```json
{
  "tag": "사실이 틀렸어요",
  "count": 8
}
```

### 8.12 GET `/api/v1/admin/feedback/reviews`

Query:

- `rating`
- `limit`

Response item:

```json
{
  "id": "fb_123",
  "createdAt": "2026-04-29T14:23:00.000Z",
  "sessionId": "conv_123",
  "messageId": "msg_123",
  "rating": "DOWN",
  "tags": ["사실이 틀렸어요"],
  "comment": "기억에 없는 말을 지어냈어요.",
  "messageContent": "어. 불고기는 간장이랑...",
  "userId": "usr_123",
  "userName": "홍길동"
}
```

### 8.13 GET `/api/v1/admin/metrics/overview`

Response:

```json
{
  "success": true,
  "data": {
    "users_total": 12,
    "conversations_total": 87,
    "messages_total": 642,
    "voice_messages_total": 204,
    "feedback_positive_ratio": 0.83,
    "feedback_negative_ratio": 0.17
  }
}
```

### 8.14 GET `/api/v1/admin/logs/errors`

Query:

- `category`
- `severity`
- `from`
- `to`
- `cursor`
- `limit`

## 9. Suggested Validation Rules

- Login identifier must be email or normalized phone number
- Consent booleans must all be true before conversation features are unlocked
- Memory title max 120 chars
- Memory tags max 10 items
- Feedback comment max 500 chars
- Voice upload max size should be defined before implementation
- Signed voice URLs should expire quickly

## 10. Non-Functional Requirements

- All protected endpoints require authentication
- Admin endpoints require explicit role check
- PII and voice assets must not be publicly exposed
- System logs must include request tracing identifiers
- Memory changes must be auditable
- API timestamps use ISO 8601 UTC

## 11. Open Questions

- Whether past TTS playback must support signed URL reissue after URL expiry
- Whether memory search should move from `float8[]` + TypeScript cosine similarity to pgvector DB search
- Whether operational error tracking stays in `SystemLog` only or adds an external tool
- Authentication/invitation policy for password reset and refresh-token operations
- Whether the admin dashboard needs KPIs beyond metrics overview, negative feedback summary, and feedback reviews

## 12. Recommended Backend Build Order

Implemented MVP baseline:

1. Auth, role guard, and consent persistence
2. Persona read and admin metadata APIs
3. Conversation, message, feedback, memory, and revision persistence
4. Text chat with AI `/ai/embed` and `/ai/chat`
5. Voice flow with AI STT/chat/TTS orchestration and R2-capable TTS storage
6. Admin metrics, negative feedback summary, review queue, and error log APIs
7. Render + Neon deployed smoke path for BE/DB verification
