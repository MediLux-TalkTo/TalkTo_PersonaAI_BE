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
- Voice provider integration is scaffolded through persisted contracts; TTS audio storage still requires the file storage decision

## Migration commands

```bash
npm run migration:create
npm run migration:generate
npm run migration:run
npm run migration:revert
```

If you switch to migration-based schema control, set `DB_SYNCHRONIZE=false`.
