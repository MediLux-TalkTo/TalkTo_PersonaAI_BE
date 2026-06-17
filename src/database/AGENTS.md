# DATABASE KNOWLEDGE BASE

## OVERVIEW

`src/database/` owns TypeORM PostgreSQL configuration and timestamped migrations for the Nest runtime and CLI.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Runtime TypeORM config | `typeorm.config.ts` | `autoLoadEntities`, `synchronize`, migrationsRun, retry settings. |
| CLI data source | `data-source.ts` | Used by `npm run typeorm ...`. |
| Manual migrations | `migrations/*.ts` | Timestamp prefix plus descriptive class name. |
| Config validation | `../config/env.validation.ts` | Production constraints are enforced before DB connection behavior matters. |

## CONVENTIONS

- Migrations implement TypeORM `MigrationInterface` and include both `up` and `down`.
- Keep migrations additive and reversible when possible; use explicit SQL for PostgreSQL-specific behavior such as pgvector.
- Entity files remain in feature modules; migration files are the schema history.
- `DB_SYNCHRONIZE=true` is acceptable for local dev defaults only; production validation rejects it.
- `DB_MIGRATIONS_RUN` is opt-in and should be set deliberately per environment.

## ANTI-PATTERNS

- Do not edit old migrations after they have been shared; add a new timestamped migration.
- Do not rely on `synchronize` to introduce 1.0 schema changes.
- Do not add destructive migration steps without a documented data-retention reason.
- Do not store provider secrets, raw audio, or raw transcript blobs in migrations or seed data.

## COMMANDS

```bash
npm run migration:create
npm run migration:generate
npm run migration:run
npm run migration:revert
```
