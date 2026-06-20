# TalkTo Persona AI BE

NestJS + PostgreSQL backend for the Persona AI MVP.

## v1.0 source and guardrails

- `TalkTo_개발자용_기능명세서_v1.0.md` is the source of truth for v1.0 behavior when it conflicts with older Notion rows, pasted notes, or the legacy MVP docs.
- Current backend scope is legacy Persona Chat MVP plus Archive-first foundations for subjects, consents, questions, recordings, payments, entitlements, queued paid analysis jobs, admin worker transition endpoints for paid analysis jobs, paid Memories search over indexed analysis segments, memory segment playback/feedback, in-app analysis status notifications, and R&D redacted export opt-in/preview guardrails.
- Free Archive upload/completion is storage/playback only. It must not create Preview, STT, LLM summary, embedding, memory segment, or analysis job work.
- Preview/sample analysis is deferred and disabled by the v1.0 contract. `POST /api/v1/recordings/{recordingId}/preview-analysis` exists only as a disabled compatibility route returning `409 feature_deferred`; it must not enqueue Preview, free AI, or analysis job work.
- Payment products/orders/webhooks/entitlements, paid Archive analysis job creation, `GET /api/v1/memories/status`, `POST /api/v1/memories/search`, memory segment playback/feedback, Voice Persona application core routes, and gated Voice Persona runtime sessions/messages are implemented. Legacy `/memories` CRUD remains separate from paid v1.0 Memories search, and existing `/personas/active` plus `/conversations/*` remain separate from the v1.0 Voice Persona runtime package.

## Run locally

1. Copy `.env.example` to `.env`
2. Start PostgreSQL
3. Install packages
4. Start the server

```bash
docker compose up -d
npm install
npm run start:dev
```

Swagger is exposed at [http://localhost:3000/docs](http://localhost:3000/docs).
Health check is exposed at [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health).

## Default local admin

- email: `admin@talkto.local`
- password: `Admin1234!`

These values can be changed through `.env`. Local seed data is controlled by `BOOTSTRAP_SEED=true`.

## Current implementation scope

- JWT auth with access/refresh tokens
- legacy consent persistence plus v1.0 feature-scoped consent requirements and acceptance
- Archive-first subject profiles, family glossary terms, question cards, recording upload intents, and recording archive APIs
- admin user invitation and management
- active persona API and admin update
- conversation creation, listing, detail, text message, voice message
- memory CRUD, soft deactivate, revision log, embedding chunk records, pgvector-backed retrieval
- per-message feedback
- admin overview/daily metrics and error log APIs
- global CORS configuration
- global rate limiting
- environment validation on bootstrap
- guarded local seed bootstrap
- optional AI server client for `/ai/chat`, `/ai/embed`, `/ai/memory/extract`, STT, and TTS
- TypeORM migration CLI scaffold
- payment products, order checkout records, verified local payment webhooks, active entitlements, and queued paid Archive analysis jobs
- admin worker transition endpoints for paid analysis preprocessing, STT transcript persistence, redaction gate, memory segment persistence, embedding persistence, completion, and failure
- paid Memories status and search endpoints over analyzed Archive memory segments
- memory segment playback URLs with `download_allowed=false` and segment feedback
- in-app notification rows and current-user notification list/read APIs for analysis completion/failure
- R&D research export opt-in/withdrawal and admin redacted export preview that excludes non-opted-in users and raw fields
- Voice Persona application creation gated by consent/entitlement, document upload intents, intake draft/submit, target voice sample submission, and build status lock reasons
- Voice Persona admin/QA document and voice sample review, Persona Bible draft/review, manual provider asset registration, and manual build status updates
- Voice Persona family-safe Bible review, approve/request-changes persistence, and runtime config enablement gate
- Gated Voice Persona runtime sessions/messages with Memories RAG sources, safety block fallback, TTS playback when configured, and usage accounting
- Data deletion requests with exact confirmation plus provider deletion tracking records for manual voice provider assets
- Admin/ops v1 operations search and dashboard counts over users, subjects, recordings, orders, entitlements, analysis jobs, Voice Persona applications, and deletion requests
- Family sharing APIs are intentionally deferred; paid Memories and Voice Persona remain owner-only until a future `owner_or_allowed` grant model exists

## Not yet implemented

- Automated provider execution for STT/redaction/embedding workers and summary/tagging workers
- Voice Persona status notifications and family sharing grants

## Backend baseline notes

- Imported long-term memories: 72 active `LONG_TERM` memories from the AI repository payload
- Environment ownership and runtime hosting details are intentionally outside this docs baseline.

## Notes

- Development mode uses TypeORM `synchronize` through `DB_SYNCHRONIZE=true`
- Production startup rejects unsafe defaults such as `DB_SYNCHRONIZE=true`, `BOOTSTRAP_SEED=true`, or placeholder JWT secrets
- If `AI_SERVER_URL` is unset, chat and embedding flows keep using local fallback behavior
- Set `AI_SERVER_TOKEN` only after the AI server enables the same shared secret; it is sent as `X-AI-Server-Token`
- Voice STT can use the AI server when configured; TTS audio can use local storage or Cloudflare R2
- Recording upload intents use presigned PUT URLs when `AUDIO_STORAGE_DRIVER=r2`; original recording playback URLs are issued separately and expire
- Local TTS mp3 files are served from `LOCAL_AUDIO_PUBLIC_PATH` when `AUDIO_STORAGE_DRIVER=local`
- AI chat requests forward memory `tags` to the AI server. The backend stores and passes tags through; tag interpretation such as `sensitive` is handled by the AI prompt.
- Short-term memory extraction is queued after text/voice responses are saved so it does not block the user-facing reply.

## Migration commands

```bash
npm run migration:create
npm run migration:generate
npm run migration:run
npm run migration:revert
```

If you switch to migration-based schema control, set `DB_SYNCHRONIZE=false`.

## Memory data

Long-term memory source data is owned by the AI repository:

- Source memories: `MediLux-TalkTo/TalkTo_PersonaAI_AI:data/memories.json`
- Backend import payload: `MediLux-TalkTo/TalkTo_PersonaAI_AI:backend_memory/memory_import.json`

The backend does not keep a copied memory data file or one-off import script in
this repository. The historical backend memory state was imported from the AI
repository payload.

The ver4 import contract expects 72 manually curated `LONG_TERM` memories.
Memory tags are pass-through metadata for the AI prompt; the backend does not
apply a separate search policy for `sensitive`.

Historical DB check on 2026-05-24:

- 72 active `LONG_TERM` memories
- 19 memories tagged `sensitive`
- 72 embedding chunks with vectors
- no `SHORT_TERM` test memories
- no smoke-test conversations or voice artifacts

## External smoke test

`npm run test:e2e` stays skipped unless a target backend URL is provided.
Use the same admin credentials configured on the target backend:

```bash
E2E_BASE_URL=... \
ADMIN_EMAIL=... \
ADMIN_PASSWORD=... \
npm run test:e2e
```

Set `E2E_CHAT_SMOKE=true` only when the AI server path should also be exercised.
The default smoke checks the BE/DB health, admin auth, active persona,
and imported long-term memories without waiting on AI cold start latency.

## Audio storage

Local filesystem storage:

```env
AUDIO_STORAGE_DRIVER=local
LOCAL_AUDIO_STORAGE_DIR=storage/audio
LOCAL_AUDIO_PUBLIC_PATH=/audio
AUDIO_SIGNED_URL_TTL_SECONDS=3600
```

When voice TTS succeeds, mp3 bytes are stored under `LOCAL_AUDIO_STORAGE_DIR`
and returned as a URL under `LOCAL_AUDIO_PUBLIC_PATH`.

Cloudflare R2 storage:

```env
AUDIO_STORAGE_DRIVER=r2
R2_ACCOUNT_ID=...
R2_BUCKET_NAME=talkto-personaai-audio
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
AUDIO_SIGNED_URL_TTL_SECONDS=3600
```

R2 uploads stay private. The backend returns a signed mp3 URL after TTS
generation for client playback.
