# Archive-First Backend Gap Analysis

Source reviewed on 2026-06-05:

- `/Users/chn_m1n/Downloads/Private & Shared/TalkTo 기능명세서 36e1650baaf78067af9ef59c88d19d7d.md`
- `/Users/chn_m1n/Downloads/Private & Shared/TalkTo 기능명세서/TalkTo_개발자용_기능명세서_v0.1.md`
- `/Users/chn_m1n/Downloads/Private & Shared/TalkTo 기능명세서/TalkTo_와이어프레임용_기능기획서_v0.1.docx`

Source priority update on 2026-06-17:

- `TalkTo_개발자용_기능명세서_v1.0.md` is the v1.0 source of truth when it conflicts with older Notion rows, pasted planning notes, or the v0.1 source set above.
- v1.0 excludes free Preview/sample analysis. Free Archive upload and completion must not create STT, LLM summary, embedding, memory segment, Preview, or analysis job rows.
- Payment, paid Memories analysis job creation, worker transition APIs, paid Memories search/status APIs, memory segment playback/feedback, in-app analysis status notifications, R&D redacted export guardrails, Voice Persona application core routes, and gated Voice Persona runtime are partially implemented; automated provider worker execution remains not implemented. Current route compatibility choice: legacy Persona Chat (`/personas/active`, `/conversations/*`) and legacy `/memories` CRUD stay compatible, but they are not the v1.0 Voice Persona runtime or paid Memories search surfaces.
- `POST /recordings/:recordingId/preview-analysis` exists only as a disabled v1 compatibility route returning `409 feature_deferred`; it must not enqueue Preview, free AI, or analysis job work.

## Implemented In This Backend Slice

- `user_consents`
  - Preserve legacy boolean consent persistence for the existing login flow.
  - Store v1.0 purpose/versioned consent rows by `consentType`, `feature`, optional `subjectId`, `status`, and `version`.
  - Expose feature consent requirements for Archive, Memories, and Voice Persona.
  - Expose purpose consent acceptance for privacy, audio storage, AI analysis, biometric voice processing, overseas transfer, posthumous use, family reconsent, and optional marketing.
- `subjects`
  - Create/list/detail/update owned subject profiles.
  - Store `displayName`, `relationship`, `lifeStatus`, `localeHint`, `dialectHint`, and notes.
- `family_glossary_terms`
  - Add/delete names, nicknames, places, and phrases per subject.
  - This prepares the STT correction input required by the spec.
- `question_interactions`
  - Serve fixed default question cards.
  - Record viewed/completed/skipped/custom question interactions per subject.
- `recordings`
  - Create recording upload intents.
  - Validate supported audio MIME types.
  - Store upload metadata, memo, related question, upload status, and analysis status.
  - Issue private object storage presigned upload URLs when R2 is configured.
  - Mark uploads complete and list/detail recordings by subject ownership.
  - Issue expiring original recording playback URLs after upload completion.
  - Completion currently leaves `analysisStatus=NOT_REQUESTED`; free Archive does not start AI analysis in this backend slice.

## Deferred Or Disabled By v1.0 Contract

- Preview analysis
  - Deferred/disabled, not remaining P0 implementation work.
  - Existing Preview enum values are legacy compatibility values only; do not remove old migrations just to rename them.
  - Free Preview/sample analysis is prohibited by the v1.0 source of truth.
  - The disabled compatibility route returns `409 feature_deferred` and creates no Preview, free AI, STT, summary, embedding, memory segment, or analysis job rows.

## Remaining Backend Work

- Consent expansion follow-up
  - Wire `ConsentsService.assertRequiredConsents` into paid Memories, Voice Persona, and external AI provider entry points as those modules land.
  - Add consent withdrawal and provider deletion tracking after the P0 deletion/request flow exists.
- Upload completion verification
  - Optionally verify object existence, size, and checksum before marking upload complete.
- Paid Memories activation
  - Products, orders, verified local payment webhook handling, entitlements, and queued paid Archive analysis job creation are implemented.
  - Paid Memories order creation requires `targetRecordingId`; analysis jobs are queued only after verified payment, active entitlement, required Memories consent, archived recording state, and duplicate active-job checks.
  - Paid Memories status and search endpoints are implemented over completed analysis memory segments and embeddings.
  - Automated provider worker execution remains not implemented.
- Analysis pipeline
  - Durable `analysis_jobs` state/lease/retry schema, user retry endpoint, user status list, admin/ops status list, and audited admin retry hook are implemented.
  - Admin worker transition APIs for preprocess, STT transcript persistence, redaction gate, memory segment persistence, indexing embedding persistence, completion, and failure are implemented.
  - Worker-facing APIs for diarization, glossary correction, masking span execution, summary/tagging, provider STT execution, and provider embedding execution are not implemented.
  - Paid analysis only; free Archive remains storage/playback without AI processing.
- Memories search over analyzed recording segments
  - `GET /api/v1/memories/status` and `POST /api/v1/memories/search` are implemented for active Memories entitlement holders with required purpose consent.
  - Search reads analyzed `memory_segments` and optional stored embeddings, returns matched text with timestamp references and low-confidence/no-result states, and does not use legacy `/memories` CRUD rows as paid search results.
  - `POST /api/v1/memory-segments/{memorySegmentId}/playback-url` and `POST /api/v1/memory-segments/{memorySegmentId}/feedback` are implemented for owner-only segment playback/feedback.
  - Confidence persistence beyond returned low-confidence flags remains not implemented.
- Masking and redaction gate
  - Not yet implemented.
  - Add PII/sensitive span storage and block external AI calls when redaction fails.
- Voice Persona production flow
  - Application creation, evidence/document upload intents, persona intake draft/submit, target voice sample submission, and build status lock reasons are implemented.
  - Admin evidence/sample review, Persona Bible draft/review, manual provider asset registration, and manual build status updates are implemented.
  - Family-safe Bible review, approve/request-changes persistence, and runtime config enablement gate are implemented.
  - Gated runtime sessions/messages with Memories RAG sources, safety block fallback, TTS playback when configured, and usage accounting are implemented.
  - Add richer safety reports and usage limit administration.
  - Current legacy Persona Chat routes are separate from the v1.0 Voice Persona runtime.
- Operations and security
  - Sensitive audit logs, safe product events, in-app notifications for paid analysis completion/failure, and R&D opt-in/redacted export preview guardrails are implemented.
  - Data deletion requests and provider deletion tracking records are implemented.
  - Admin/ops v1 operations search and dashboard counts are implemented with sanitized operational rows and audit reads.
  - Add Voice Persona status notifications.
- Family sharing
  - P1-deferred. No family invite/share/grant API is implemented for paid Memories or Voice Persona access.
  - Current paid Memories and Voice Persona APIs remain owner-only; future work should introduce an explicit `owner_or_allowed` permission helper before any non-owner access is allowed.
