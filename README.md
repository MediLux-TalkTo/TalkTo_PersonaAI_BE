# TalkTo Persona AI BE

NestJS + PostgreSQL backend for the Persona AI MVP.

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
- consent persistence
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

## Hosted MVP

- Backend: `https://talkto-personaai-be.onrender.com`
- Backend health: `https://talkto-personaai-be.onrender.com/api/v1/health`
- AI server: `https://talkto-persona-ai.onrender.com`
- Production database: Neon PostgreSQL
- Voice TTS storage: private Cloudflare R2 bucket with signed playback URLs
- Imported long-term memories: 72 active `LONG_TERM` memories from the AI repository payload

## Notes

- Development mode uses TypeORM `synchronize` through `DB_SYNCHRONIZE=true`
- Production startup rejects unsafe defaults such as `DB_SYNCHRONIZE=true`, `BOOTSTRAP_SEED=true`, or placeholder JWT secrets
- If `AI_SERVER_URL` is unset, chat and embedding flows keep using local fallback behavior
- Set `AI_SERVER_TOKEN` only after the AI server enables the same shared secret; it is sent as `X-AI-Server-Token`
- Voice STT can use the AI server when configured; TTS audio can use local storage or Cloudflare R2
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
this repository. Current production DB memory state was imported from the AI
repository payload.

The ver4 import contract expects 72 manually curated `LONG_TERM` memories.
Memory tags are pass-through metadata for the AI prompt; the backend does not
apply a separate search policy for `sensitive`.

Production DB check on 2026-05-24:

- 72 active `LONG_TERM` memories
- 19 memories tagged `sensitive`
- 72 embedding chunks with vectors
- no `SHORT_TERM` test memories
- no deployed smoke-test conversations or voice artifacts

## Deployed smoke test

`npm run test:e2e` stays skipped unless a deployed backend URL is provided.
Use the same admin credentials configured on the target backend:

```bash
E2E_BASE_URL=https://talkto-personaai-be.onrender.com \
ADMIN_EMAIL=... \
ADMIN_PASSWORD=... \
npm run test:e2e
```

Set `E2E_CHAT_SMOKE=true` only when the AI server path should also be exercised.
The default deployed smoke checks the BE/DB health, admin auth, active persona,
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
generation for frontend playback.
