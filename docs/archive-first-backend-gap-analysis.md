# Archive-First Backend Gap Analysis

Source reviewed on 2026-06-05:

- `/Users/chn_m1n/Downloads/Private & Shared/TalkTo 기능명세서 36e1650baaf78067af9ef59c88d19d7d.md`
- `/Users/chn_m1n/Downloads/Private & Shared/TalkTo 기능명세서/TalkTo_개발자용_기능명세서_v0.1.md`
- `/Users/chn_m1n/Downloads/Private & Shared/TalkTo 기능명세서/TalkTo_와이어프레임용_기능기획서_v0.1.docx`

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

## Remaining Backend Work

- Consent expansion follow-up
  - Wire `ConsentsService.assertRequiredConsents` into paid Memories, Voice Persona, and external AI provider entry points as those modules land.
  - Add consent withdrawal and provider deletion tracking after the P0 deletion/request flow exists.
- Upload completion verification
  - Optionally verify object existence, size, and checksum before marking upload complete.
- Preview analysis
  - Add preview analysis jobs, limited STT/summary result storage, failure codes, and result API.
- Paid Memories activation
  - Add orders, payment webhook idempotency, entitlements, and full analysis job creation.
- Analysis pipeline
  - Add job orchestration tables and worker-facing APIs for preprocess, STT, diarization, glossary correction, masking, segmentation, summary/tagging, embedding, and indexing.
- Memories search over analyzed recording segments
  - Add `memory_segments`, segment-level feedback, confidence, original timestamp references, and segment playback URLs.
- Masking and redaction gate
  - Add PII/sensitive span storage and block external AI calls when redaction fails.
- Voice Persona production flow
  - Add evidence upload/review, persona intake, target voice enrollment, speaker QA, candidate packs, voice provider tracking, persona bible review, build jobs, safety reports, and usage limits.
- Operations and security
  - Add audit logs for sensitive data/admin access, deletion requests, provider deletion tracking, notifications, and R&D redacted export controls.
