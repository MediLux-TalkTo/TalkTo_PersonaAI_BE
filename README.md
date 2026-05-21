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
- memory CRUD, soft deactivate, revision log, embedding chunk records
- per-message feedback
- admin metrics and error log APIs
- global CORS configuration
- global rate limiting
- environment validation on bootstrap
- guarded local seed bootstrap
- optional AI server client for `/ai/chat` and `/ai/embed`
- TypeORM migration CLI scaffold

## Notes

- Development mode uses TypeORM `synchronize` through `DB_SYNCHRONIZE=true`
- Production startup rejects unsafe defaults such as `DB_SYNCHRONIZE=true`, `BOOTSTRAP_SEED=true`, or placeholder JWT secrets
- If `AI_SERVER_URL` is unset, chat and embedding flows keep using local fallback behavior
- Set `AI_SERVER_TOKEN` only after the AI server enables the same shared secret; it is sent as `X-AI-Server-Token`
- Voice STT can use the AI server when configured; TTS audio can use local storage or Cloudflare R2
- Local TTS mp3 files are served from `LOCAL_AUDIO_PUBLIC_PATH` when `AUDIO_STORAGE_DRIVER=local`

## Migration commands

```bash
npm run migration:create
npm run migration:generate
npm run migration:run
npm run migration:revert
```

If you switch to migration-based schema control, set `DB_SYNCHRONIZE=false`.

## Memory import

Long-term memory import data is owned by the AI repository:

- `MediLux-TalkTo/TalkTo_PersonaAI_AI:data/backend_memory_import.json`

The backend imports that source through the GitHub Contents API and does not keep
a copied data file in this repository.

```bash
ADMIN_PASSWORD=... GITHUB_TOKEN=... npm run import:memories
```

Use `IMPORT_DRY_RUN=true` to validate the source without writing to the backend.

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
