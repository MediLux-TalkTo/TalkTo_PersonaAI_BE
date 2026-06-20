# Persona AI MVP Backend Functional Spec and API Design

## 1. Scope

This document defines the backend MVP scope for TalkTo Persona AI based on the Notion page `Persona AI MVP 기능명세서`.

v1.0 source priority:

- `TalkTo_개발자용_기능명세서_v1.0.md` is the source of truth for v1.0 decisions when it conflicts with older Notion rows, pasted notes, or this legacy MVP baseline.
- The current backend is a mixed surface: legacy Persona Chat MVP plus implemented Archive-first foundations for subjects, consents, questions, recordings, payments, entitlements, queued paid analysis jobs, admin worker transition endpoints for paid analysis jobs, paid Memories search over indexed analysis segments, memory segment playback/feedback, in-app analysis status notifications, and R&D redacted export opt-in/preview guardrails.
- Free Archive must stay storage/playback only. It must not create Preview, STT, LLM summary, embedding, memory segment, or analysis job work.
- Preview/sample analysis is excluded from v1.0. `POST /api/v1/recordings/{recordingId}/preview-analysis` exists only as a disabled compatibility endpoint returning `409 feature_deferred`; it must not enqueue Preview, free AI, or analysis job work.
- Payment products/orders/webhooks/entitlements, paid Archive analysis job creation, paid Memories status/search, memory segment playback/feedback, Voice Persona application core routes, and gated Voice Persona runtime sessions/messages are implemented. Existing legacy `/memories` CRUD is not the paid v1.0 Memories search surface, and existing `/personas/active` plus `/conversations/*` are separate legacy Persona Chat routes.

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

Current backend data/configuration baseline:

- Long-term memory source: AI repository `data/memories.json`
- Backend memory import payload: AI repository `backend_memory/memory_import.json`
- Ver4 memory import contract: 72 manually curated `LONG_TERM` memories, no `confidenceScore`, and pass-through string tags
- The backend stores and forwards memory tags to `/ai/chat`; tag interpretation stays in the AI prompt, not backend search policy
- Historical DB check on 2026-05-24: 72 active `LONG_TERM` memories, 19 `sensitive` tagged memories, 72 embedded chunks, and smoke-test rows removed
- Environment ownership and runtime hosting details are intentionally outside this docs baseline.

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
- `subject_id` nullable
- `consent_type` nullable for legacy rows
- `feature` nullable for legacy rows
- `required`
- `status` enum: `accepted`, `declined`, `withdrawn`, `expired`
- `version` nullable
- `persona_disclaimer_accepted`
- `conversation_storage_accepted`
- `voice_synthesis_accepted`
- `accepted_at`
- `withdrawn_at` nullable

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
- `rating` enum: `UP`, `NEUTRAL`, `DOWN`
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
- Expose consent status for client gating
- Expose feature-specific requirements for `archive`, `memories`, and `voice_persona`
- Save versioned purpose consents for P0 Archive/Memories/Voice Persona gates
- Return `requires_consent` with missing consent types when a paid or AI feature lacks required consent

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

## 5.10 v1.0 Implementation Status Baseline

Implemented today:

- Auth, legacy family/admin roles, active persona profile, legacy Persona Chat text/voice conversation flow, legacy memory CRUD/revision logs, feedback, admin metrics/logs.
- Archive-first subject profiles, family glossary terms, question cards/interactions, purpose consent requirements/acceptance, recording upload intent/complete/list/detail/playback.
- Payment products, order checkout records, verified local payment webhooks, active entitlements, and queued paid Archive analysis jobs for Memories orders with a target recording.
- Admin worker transition endpoints for paid analysis preprocessing, STT transcript persistence, redaction gate, memory segment persistence, embedding persistence, completion, and failure.
- Paid Memories status and search endpoints over analyzed Archive memory segments.
- Memory segment playback URLs with `download_allowed=false` and segment feedback.
- In-app notification rows and current-user notification list/read APIs for analysis completion/failure.
- R&D research export opt-in/withdrawal and admin redacted export preview that excludes non-opted-in users and raw fields.
- Voice Persona application creation gated by consent/entitlement, document upload intents, intake draft/submit, target voice sample submission, and build status lock reasons.
- Voice Persona admin/QA document and voice sample review, Persona Bible draft/review, manual provider asset registration, and manual build status updates with audit rows.
- Voice Persona family-safe Bible review, approve/request-changes persistence, and runtime config enablement gate.
- Gated Voice Persona runtime sessions/messages with Memories RAG sources, safety block fallback, TTS playback when configured, and usage accounting.
- Data deletion requests with exact confirmation plus provider deletion tracking records for manual voice provider assets.
- Admin/ops v1 operations search and dashboard counts over users, subjects, recordings, orders, entitlements, analysis jobs, Voice Persona applications, and deletion requests.
- Family sharing APIs are intentionally deferred; paid Memories and Voice Persona remain owner-only until a future `owner_or_allowed` grant model exists.

Not yet implemented:

- Automated provider execution for STT/redaction/embedding workers and summary/tagging workers.
- Voice Persona status notifications and family sharing grants.

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
| Consent | GET | `/api/v1/consents/requirements?feature={feature}&subject_id={subjectId}` | Get feature consent requirements | User |
| Consent | POST | `/api/v1/consents` | Save consent | User |
| Consent | POST | `/api/v1/consents/accept` | Accept versioned purpose consents | User |
| Users | GET | `/api/v1/admin/users` | List users | Admin |
| Users | POST | `/api/v1/admin/users/invitations` | Invite family user | Admin |
| Users | PATCH | `/api/v1/admin/users/{userId}` | Update user status or role | Admin |
| Persona | GET | `/api/v1/personas/active` | Get active persona | User |
| Persona | PATCH | `/api/v1/admin/personas/{personaId}` | Update persona metadata | Admin |
| Subjects | POST | `/api/v1/subjects` | Create archive subject profile | User |
| Subjects | GET | `/api/v1/subjects` | List my subjects | User |
| Subjects | GET | `/api/v1/subjects/{subjectId}` | Get subject detail | User |
| Subjects | PATCH | `/api/v1/subjects/{subjectId}` | Update subject profile | User |
| Subjects | POST | `/api/v1/subjects/{subjectId}/glossary` | Add family glossary term | User |
| Subjects | DELETE | `/api/v1/subjects/{subjectId}/glossary/{termId}` | Delete family glossary term | User |
| Questions | GET | `/api/v1/question-cards` | List default question cards | User |
| Questions | POST | `/api/v1/subjects/{subjectId}/question-interactions` | Record question completion/skip/custom item | User |
| Recordings | GET | `/api/v1/upload-guide` | Get recording upload constraints and supported client values | User |
| Recordings | POST | `/api/v1/recordings/upload-intent` | Create recording upload intent | User |
| Recordings | POST | `/api/v1/recordings/{recordingId}/upload-intents/{uploadIntentId}/retry` | Create a fresh upload intent for a failed, canceled, or expired upload | User |
| Recordings | POST | `/api/v1/recordings/{recordingId}/upload-intents/{uploadIntentId}/cancel` | Cancel an in-progress upload intent or return the current terminal intent | User |
| Recordings | POST | `/api/v1/recordings/{recordingId}/complete` | Mark recording upload complete | User |
| Recordings | GET | `/api/v1/subjects/{subjectId}/recordings` | List subject recordings | User |
| Recordings | GET | `/api/v1/recordings/{recordingId}` | Get recording detail | User |
| Recordings | POST | `/api/v1/recordings/{recordingId}/preview-analysis` | Disabled compatibility endpoint returning `409 feature_deferred` | User |
| Recordings | POST | `/api/v1/recordings/{recordingId}/playback-url` | Issue expiring recording playback URL | User |
| Orders | POST | `/api/v1/orders` | Create pending checkout order; Memories orders require `targetRecordingId` | User |
| Payments | POST | `/api/v1/payments/local/webhook` | Verify local payment webhook, create entitlement, and queue paid analysis job for Memories target recording | Provider |
| Entitlements | GET | `/api/v1/entitlements` | List active entitlements for current user | User |
| Memories | GET | `/api/v1/memories/status` | Get paid Memories entitlement and index readiness | User |
| Memories | POST | `/api/v1/memories/search` | Search paid Memories over analyzed Archive memory segments | User |
| Memory Segments | POST | `/api/v1/memory-segments/{memorySegmentId}/playback-url` | Issue segment-scoped original audio playback URL | User |
| Memory Segments | POST | `/api/v1/memory-segments/{memorySegmentId}/feedback` | Submit segment feedback or timestamp issue report | User |
| Notifications | GET | `/api/v1/notifications` | List current user in-app notifications | User |
| Notifications | PATCH | `/api/v1/notifications/{notificationId}/read` | Mark current user notification as read | User |
| Data Rights | GET | `/api/v1/data-rights/research-export` | Get R&D redacted export opt-in preference | User |
| Data Rights | POST | `/api/v1/data-rights/research-export/opt-in` | Opt in to R&D redacted export eligibility | User |
| Data Rights | POST | `/api/v1/data-rights/research-export/withdraw` | Withdraw R&D redacted export opt-in | User |
| Data Rights | GET | `/api/v1/admin/data-rights/research-export-preview` | Preview opted-in redacted export rows | Admin/Ops |
| Voice Persona | POST | `/api/v1/voice-persona/applications` | Create gated Voice Persona build application | User |
| Voice Persona | POST | `/api/v1/voice-persona/applications/{applicationId}/documents/upload-intent` | Create document upload intent | User |
| Voice Persona | PUT | `/api/v1/voice-persona/applications/{applicationId}/intake` | Save Persona intake draft sections | User |
| Voice Persona | POST | `/api/v1/voice-persona/applications/{applicationId}/intake/submit` | Submit complete 8-section intake | User |
| Voice Persona | POST | `/api/v1/voice-persona/applications/{applicationId}/voice-samples` | Submit target voice sample | User |
| Voice Persona | GET | `/api/v1/voice-persona/applications/{applicationId}/build-status` | Get build status lock reasons | User |
| Admin Voice Persona | PATCH | `/api/v1/admin/voice-persona/documents/{documentId}/review` | Approve/reject evidence document | Admin/Ops/AI QA |
| Admin Voice Persona | PATCH | `/api/v1/admin/voice-persona/voice-samples/{sampleId}/review` | Approve/reject target voice sample | Admin/Ops/AI QA |
| Admin Voice Persona | PATCH | `/api/v1/admin/voice-persona/applications/{applicationId}/build-status` | Manually update build status | Admin/Ops/AI QA |
| Admin Voice Persona | PUT | `/api/v1/admin/voice-persona/applications/{applicationId}/persona-bible` | Create/update Persona Bible draft | Admin/Ops/AI QA |
| Admin Voice Persona | PATCH | `/api/v1/admin/voice-persona/persona-bibles/{bibleId}/review` | Review Persona Bible | Admin/Ops/AI QA |
| Admin Voice Persona | POST | `/api/v1/admin/voice-persona/applications/{applicationId}/provider-assets` | Register manual provider asset | Admin/Ops/AI QA |
| Voice Persona | GET | `/api/v1/voice-persona/applications/{applicationId}/family-review` | Get family-safe Persona Bible review view | User |
| Voice Persona | POST | `/api/v1/voice-persona/applications/{applicationId}/family-review/approve` | Approve family review and enable runtime config if gates pass | User |
| Voice Persona | POST | `/api/v1/voice-persona/applications/{applicationId}/family-review/request-changes` | Persist family review change request | User |
| Persona Runtime | POST | `/api/v1/persona/sessions` | Create gated Voice Persona runtime session | User |
| Persona Runtime | POST | `/api/v1/persona/sessions/{sessionId}/messages` | Send gated Voice Persona runtime message | User |
| Data Rights | POST | `/api/v1/data-deletion-requests` | Create strongly confirmed data deletion request | User |
| Data Rights | PATCH | `/api/v1/admin/data-deletion-requests/{requestId}` | Update deletion request status | Admin/Ops |
| Data Rights | PATCH | `/api/v1/admin/provider-deletion-records/{recordId}` | Update provider deletion tracking status | Admin/Ops |
| Admin | GET | `/api/v1/admin/operations/search` | Search sanitized v1 operations resources | Admin/Ops |
| Admin | GET | `/api/v1/admin/operations/dashboard` | Get v1 operations aggregate counts | Admin/Ops |
| Analysis | GET | `/api/v1/memories/analysis-jobs` | List my Memories analysis job status with failure code and progress | User |
| Analysis | POST | `/api/v1/analysis/jobs/{jobId}/retry` | Requeue a retryable failed analysis job | User |
| Analysis | GET | `/api/v1/admin/analysis-jobs` | List all Memories analysis job status rows | Admin/Ops |
| Analysis | POST | `/api/v1/admin/analysis-jobs/{jobId}/retry` | Requeue a retryable analysis job and write an audit log | Admin/Ops |
| Analysis | PATCH | `/api/v1/admin/analysis/jobs/{jobId}/transitions/preprocess` | Mark paid analysis preprocessing and lease worker progress | Admin |
| Analysis | PATCH | `/api/v1/admin/analysis/jobs/{jobId}/transitions/stt` | Mark STT processing and upsert transcript segments | Admin |
| Analysis | PATCH | `/api/v1/admin/analysis/jobs/{jobId}/transitions/redaction` | Mark redaction gate pending | Admin |
| Analysis | PATCH | `/api/v1/admin/analysis/jobs/{jobId}/transitions/segmenting` | Mark segmenting and upsert memory segments | Admin |
| Analysis | PATCH | `/api/v1/admin/analysis/jobs/{jobId}/transitions/indexing` | Mark indexing and upsert embeddings | Admin |
| Analysis | PATCH | `/api/v1/admin/analysis/jobs/{jobId}/transitions/completed` | Mark paid analysis completed | Admin |
| Analysis | PATCH | `/api/v1/admin/analysis/jobs/{jobId}/transitions/failed` | Mark paid analysis failed | Admin |
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
| Admin | GET | `/api/v1/admin/metrics/daily` | Recent 14-day KST dashboard metrics | Admin |
| Admin | GET | `/api/v1/admin/logs/errors` | Error logs | Admin |

## 8. Endpoint Details

### 8.0 Archive-First APIs

The Archive-first expansion from the 2026-06-02 feature spec is represented by subject, question, and recording APIs.

- Subject profiles store the family target person, relationship, life status, region/dialect hints, and notes.
- Family glossary terms store names, nicknames, places, and phrases that can later improve STT post-processing.
- Question cards are fixed backend-provided prompts; interactions record completed, skipped, viewed, or custom questions.
- `GET /api/v1/upload-guide` returns supported MIME types, maximum upload size, single-file guidance, allowed upload sources/platforms, upload intent lifecycle values, failure codes, and checksum statuses for clients before they request an upload intent.
- Recording upload intent creates a `recordings` row and a presigned PUT URL for direct object storage upload.
- Upload source values are `app_recording`, `share_extension`, and `manual_upload`; platform values are `ios`, `android`, and `web`.
- Retry is available only for failed, canceled, or expired upload intents. `POST /api/v1/recordings/{recordingId}/upload-intents/{uploadIntentId}/retry` returns a fresh upload intent response with the current `recording`, new `uploadIntentId`, upload URL, storage key, expiry, source, platform, and single-file metadata.
- Cancel is idempotent for terminal upload intents. `POST /api/v1/recordings/{recordingId}/upload-intents/{uploadIntentId}/cancel` cancels an in-progress intent with `status=canceled` and `failureCode=upload_canceled`; if the intent is already completed, failed, canceled, or expired, the backend preserves that terminal state and returns the current intent.
- Recording completion marks `uploadStatus=UPLOADED`; AI Preview, STT, summary, embedding, memory segment, and analysis workers are not started in the free Archive slice.
- Completed Archive recordings remain `archive_status=archived`, `analysis_stage=not_analyzed`, `summary_status=locked_until_memories`, and `memories_status=locked_until_memories` until a verified paid Memories order queues analysis.
- Recording playback issues a separate expiring URL only after ownership and upload status checks.
- Preview analysis is deferred/disabled by v1.0. `POST /api/v1/recordings/{recordingId}/preview-analysis` is implemented only as a disabled compatibility endpoint that returns `409 feature_deferred` and creates no Preview, free AI, STT, summary, embedding, memory segment, or analysis job work.
- Paid Memories order creation requires Memories consent and `targetRecordingId`. A verified payment webhook creates an active entitlement and queues one active `analysis_jobs` row for the archived target recording after rechecking active entitlement, Memories consent, archived upload state, paid order ownership, and duplicate active jobs.
- Analysis job statuses are `queued`, `leased`, `preprocessing`, `stt_processing`, `redaction_pending`, `segmenting`, `embedding`, `indexing`, `completed`, `failed_retryable`, `failed_terminal`, `blocked_consent_withdrawn`, and `cancelled`. The durable state machine, lease/retry metadata, timeout terminalization helper, consent-withdrawal blocking helper, retry endpoint, and admin worker transition endpoints are implemented. Worker transition endpoints persist worker-supplied transcript segments, memory segments, and embeddings idempotently; they do not run external STT, LLM, masking, segmentation, embedding, or Memories search providers themselves.
- Paid Memories search requires an active Memories entitlement and required Memories purpose consent. `GET /api/v1/memories/status` reports entitlement, searchable index state, indexed segment count, completed job count, and latest completion timestamp. `POST /api/v1/memories/search` searches owned analyzed `memory_segments` with optional stored embedding scores, supports optional `subjectId`, `recordingId`, and `limit`, and returns answer/no-result/low-confidence states with segment text and timestamp references. It does not use legacy `/memories` CRUD rows as paid search results.
- Memory segment playback is owner-only. `POST /api/v1/memory-segments/{memorySegmentId}/playback-url` issues a short-lived segment-scoped URL with media-fragment start/end semantics, `download_allowed=false`, safe app event metadata, and a sensitive-read audit row. `POST /api/v1/memory-segments/{memorySegmentId}/feedback` upserts rating/tags/comment and optional reported timestamp corrections for the segment.
- Analysis completion and failure transitions create sanitized in-app notification rows without transcripts, presigned URLs, raw audio URLs, or provider payloads. `GET /api/v1/notifications` lists current-user notifications with optional `limit` and `unreadOnly`; `PATCH /api/v1/notifications/{notificationId}/read` marks only the authenticated user's notification as read.
- R&D redacted export is opt-in only. `GET /api/v1/data-rights/research-export`, `POST /api/v1/data-rights/research-export/opt-in`, and `POST /api/v1/data-rights/research-export/withdraw` manage the current user's preference with audit/event rows. `GET /api/v1/admin/data-rights/research-export-preview` is an admin/ops dry-run that returns only opted-in memory segment ids, owner/subject/recording ids, timestamps, eligibility state, and redacted text when a successful redaction exists. It does not return raw audio keys, presigned URLs, raw transcripts, or raw memory text.
- Voice Persona application core is separate from legacy Persona Chat. `POST /api/v1/voice-persona/applications` requires subject ownership, Voice Persona purpose consent, and an active Voice Persona entitlement. Document upload intents, Persona intake drafts, 8-section intake submission, target voice sample submission, and build-status lock reasons are implemented. Build remains locked until documents and samples are approved by later admin review APIs, intake is submitted, and provider/family review work lands.
- Voice Persona admin/QA routes process evidence documents, target voice samples, Persona Bible drafts/reviews, manual build status, and manual provider asset registration. Each action writes a sanitized sensitive-write audit row and does not store provider credentials.
- Voice Persona family review exposes only the approved Persona Bible summary and safety notes, not raw evidence, recordings, transcripts, or provider payloads. Approval persists a review row and creates/enables runtime config only when the Persona Bible is approved, a manual provider asset is registered, and the build status is `ready`; otherwise the runtime stays disabled.
- Persona runtime routes require an enabled runtime config and Voice Persona consent; they do not reuse legacy `/conversations`. Runtime messages use recent Memories segments as RAG sources, block unsafe topics with a safe response, synthesize TTS when the AI server is configured, and track per-session usage.
- Data deletion requests require exact `DELETE MY DATA` confirmation. Account/subject requests create pending manual provider deletion tracking rows for matching voice provider assets, and admin/ops status updates write sanitized audit rows.
- Admin/ops operations search returns only sanitized operational identifiers, labels, owner/subject ids, statuses, and timestamps. It audits reads and does not return raw transcripts, document contents, provider secrets, presigned URLs, or contact payloads.
- Family sharing is P1-deferred. This backend does not expose family invite/share/grant APIs for paid Memories or Voice Persona access, and no implicit non-owner access is allowed without a future `owner_or_allowed` grant helper.
- `GET /api/v1/memories/analysis-jobs` returns only the authenticated user's analysis jobs. It accepts optional `status`, `recordingId`, `subjectId`, and `limit` filters and returns `failureCode`, `failureMessage`, retry counters, timestamps, and a derived `progress` object.
- `GET /api/v1/admin/analysis-jobs` exposes the same status shape across owners for `ADMIN` and `OPS` roles only. `POST /api/v1/admin/analysis-jobs/{jobId}/retry` reuses the existing retryable-failure state machine, requeues the same job row instead of creating a duplicate active job, and writes an `analysis_job_retry` audit log with actor, resource, previous status, previous failure code, retry count, and recording metadata.

Supported recording MIME types:

- `audio/aac`
- `audio/amr`
- `audio/m4a`
- `audio/mp4`
- `audio/mpeg`
- `audio/wav`
- `audio/x-m4a`
- `audio/x-wav`

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

`rating: "NEUTRAL"` is used for the normal/average feedback option such as `보통이에요`.

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
    "feedback_neutral_ratio": 0,
    "feedback_negative_ratio": 0.17
  }
}
```

### 8.14 GET `/api/v1/admin/metrics/daily`

Returns the latest 14 calendar days grouped by KST (`Asia/Seoul`) to avoid UTC midnight boundary drift in the dashboard.

Response:

```json
{
  "success": true,
  "data": {
    "timeZone": "Asia/Seoul",
    "days": 14,
    "items": [
      {
        "date": "2026-05-31",
        "newUsers": 3,
        "conversationSessions": 12,
        "messages": 84,
        "voiceMessages": 18,
        "assistantMessages": 42,
        "feedbackPositive": 10,
        "feedbackNeutral": 2,
        "feedbackNegative": 1,
        "feedbackTotal": 13,
        "feedbackResponseRate": 0.31
      }
    ]
  }
}
```

### 8.15 GET `/api/v1/admin/logs/errors`

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
- Admin daily metrics group by KST calendar day (`Asia/Seoul`)
- Short-term memory extraction runs after text/voice response persistence in a background task

## 11. Open Questions

- Whether past TTS playback must support signed URL reissue after URL expiry
- Whether to tune pgvector ivfflat list/probe settings after memory volume grows
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
6. Admin overview/daily metrics, negative feedback summary, review queue, and error log APIs
7. BE/DB smoke path for target environment verification
8. Archive subject, question card, recording upload intent, recording archive, and original recording playback URL APIs
