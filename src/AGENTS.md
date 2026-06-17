# SRC KNOWLEDGE BASE

## OVERVIEW

`src/` is a NestJS feature-module tree with one module per product/domain slice and TypeORM entities colocated with services.

## STRUCTURE

```text
src/
+-- admin/          # Metrics, feedback review, operational error logs
+-- auth/           # Login, refresh, logout, current user
+-- consents/       # Legacy and purpose-scoped consent persistence
+-- conversations/  # Persona chat/voice runtime; see conversations/AGENTS.md
+-- database/       # TypeORM runtime/migrations; see database/AGENTS.md
+-- memories/       # Legacy memory CRUD and retrieval source data
+-- questions/      # Archive question cards and interactions
+-- recordings/     # Archive upload intent, completion, playback
+-- subjects/       # Archive subjects and glossary
+-- common/         # Shared guards/enums/DTO helpers; see common/AGENTS.md
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Add a feature module | `src/app.module.ts`, `src/<domain>/` | Follow existing controller/service/module/entity layout. |
| Add request input | `src/<domain>/dto/` | Use `class-validator`; global pipe rejects unknown fields. |
| Add response shape | `src/<domain>/dto/*response.dto.ts` | Keep Swagger DTOs close to the owning module. |
| Add DB table | `src/<domain>/*.entity.ts`, `src/database/migrations/` | Entity plus migration; do not rely on sync for production behavior. |
| Add user route | Domain controller | Use `JwtAuthGuard`; derive user id from `@CurrentUser()`. |
| Add admin route | `src/admin` or admin path in domain controller | Require `RolesGuard` and `@Roles(Role.ADMIN)`. |
| Add storage behavior | `src/storage/audio-storage.service.ts` | Keep local and R2 drivers behaviorally aligned. |

## CONVENTIONS

- Keep Nest dependency direction explicit through module imports/exports; avoid reaching across repositories directly.
- Service methods enforce ownership and status transitions; controllers stay thin.
- Archive domain names use `Subject`, `Recording`, `QuestionInteraction`, and `FamilyGlossaryTerm`.
- Existing route shape is mixed: some controllers own a base path, while recordings/questions expose multiple root-level paths from `@Controller()`.
- Tests live next to the module as `*.spec.ts`; e2e lives under `src/e2e`.
- System logs are operational logs, not security audit logs; do not reuse them as a compliance audit trail without changing the schema.

## ANTI-PATTERNS

- Do not put new product-specific enums in arbitrary DTO files; shared cross-module enums belong in `src/common/enums`.
- Do not add raw provider payloads to API responses unless the DTO explicitly models and documents them.
- Do not bypass DTO validation with broad `Record<string, unknown>` request bodies for user-facing APIs.
- Do not mix Archive v1.0 analysis/pipeline state into legacy `Memory` entities without checking the spec docs first.

## COMMANDS

```bash
npm run lint
npm run build
npm test
```
