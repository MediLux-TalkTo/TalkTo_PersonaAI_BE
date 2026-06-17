# PROJECT KNOWLEDGE BASE

**Generated:** 2026-06-17 15:47:32 KST
**Commit:** e5cd54e
**Branch:** main

## OVERVIEW

TalkTo PersonaAI backend: NestJS 11, TypeORM 0.3, PostgreSQL/pgvector, JWT auth, optional AI server integration, and Cloudflare R2/local audio storage. Current product surface mixes legacy Persona Chat MVP with Archive-first v1.0 foundations for subjects, consents, questions, and recordings.

## STRUCTURE

```text
.
+-- src/                 # Nest application modules; see src/AGENTS.md
+-- src/common/          # Cross-cutting enums, guards, envelopes, error DTOs
+-- src/database/        # TypeORM options and timestamped migrations
+-- src/conversations/   # Legacy Persona chat/voice runtime with memory retrieval
+-- docs/                # Backend spec, OpenAPI, Archive-first gap analysis
+-- docker-compose.yml   # Local PostgreSQL
+-- README.md            # Current deployed/local operation notes
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| API bootstrap, CORS, Swagger, global pipes | `src/main.ts` | Global prefix is `/api/v1`; Swagger UI is `/docs` without the API prefix. |
| Module wiring | `src/app.module.ts` | Global throttling lives here; feature modules are imported directly. |
| Environment safety | `src/config/env.validation.ts` | Production rejects `DB_SYNCHRONIZE=true`, seeded bootstrap, and placeholder JWT secrets. |
| DB schema changes | `src/database/migrations/` | Timestamped TypeORM migrations; current latest is purpose consent expansion. |
| Current product backlog/spec | `docs/archive-first-backend-gap-analysis.md` | Treat as planning context, not proof of implementation. |
| Public API contract | `docs/backend-functional-spec-and-api.md`, `docs/persona-ai-mvp.openapi.yaml` | Keep these synchronized when endpoint shape changes. |
| Hosted/local operations | `README.md` | Contains Render/Neon/R2 notes and smoke-test commands. |

## CODE MAP

| Symbol | Type | Location | Role |
| --- | --- | --- | --- |
| `AppModule` | Module | `src/app.module.ts` | Root Nest module, imports all feature modules. |
| `validateEnv` | Function | `src/config/env.validation.ts` | Runtime config parser and production guardrail. |
| `buildTypeOrmOptions` | Function | `src/database/typeorm.config.ts` | Nest TypeORM runtime options. |
| `ConversationsService` | Service | `src/conversations/conversations.service.ts` | Text/voice message transaction flow, STT/TTS fallback, short-term memory extraction. |
| `AudioStorageService` | Service | `src/storage/audio-storage.service.ts` | Local/R2 TTS storage, recording upload intents, signed playback URLs. |
| `ConsentsService` | Service | `src/consents/consents.service.ts` | Legacy consent records plus purpose-scoped v1.0 requirements. |
| `RecordingsService` | Service | `src/recordings/recordings.service.ts` | Archive upload intent, upload completion, recording list/detail/playback. |
| `SubjectsService` | Service | `src/subjects/subjects.service.ts` | Archive subject profiles and family glossary terms. |

## CONVENTIONS

- API responses use `success(data, meta?)` from `src/common/utils/api-response.ts`; keep response DTOs under each module's `dto/`.
- Controllers commonly return wrapper DTOs for Swagger even when services return entities.
- Owner checks are service-level, usually by `(id, ownerUserId)`, before returning subject, recording, conversation, or memory data.
- Admin routes use `JwtAuthGuard`, `RolesGuard`, and `@Roles(Role.ADMIN)`; do not expose admin data through user-facing routes.
- Global validation uses `whitelist`, `forbidNonWhitelisted`, and `transform`; DTOs must describe accepted inputs explicitly.
- CORS is controlled by comma-separated `CORS_ORIGINS`; an empty value means allow all.
- `AUDIO_STORAGE_DRIVER=local` serves files under `LOCAL_AUDIO_PUBLIC_PATH`; `r2` uses presigned PUT/playback URLs and keeps buckets private.

## ANTI-PATTERNS

- Do not treat the legacy `/memories` CRUD as the v1.0 paid Memories search surface.
- Do not treat `/personas/active` and `/conversations/*` as the full Voice Persona build pipeline.
- Do not log raw voice/transcript content in errors; use `sanitizeForLog` for structured details.
- Do not add production paths that rely on `DB_SYNCHRONIZE=true`; migrations are the durable schema path.
- Do not commit local artifacts such as `.env`, `dist/`, `coverage/`, local audio files, or `.DS_Store`.
- Avoid new `as any` usages; existing ones are isolated to tests and JWT expires-in typing.

## COMMANDS

```bash
npm install
docker compose up -d
npm run start:dev
npm run lint
npm run build
npm test
npm run test:e2e
npm run migration:generate
npm run migration:run
```

## NOTES

- This repository is currently a backend-only service; mobile share extension, onboarding screens, payment UI, and admin review screens are not here.
- The latest v1.0 backend gap is wider than the implemented Archive foundation: payment, analysis jobs, masking, paid Memories search, Voice Persona build/review, audit logs, and deletion tracking still require new modules.
- `npm run test:e2e` is configured as a deployed smoke path and stays skipped unless target env vars are supplied.
