import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonaRuntime20260618190000 implements MigrationInterface {
  name = 'AddPersonaRuntime20260618190000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "persona_runtime_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ownerUserId" uuid NOT NULL,
        "applicationId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "runtimeConfigId" uuid NOT NULL,
        "usageCount" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_persona_runtime_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_persona_runtime_sessions_runtime_config" FOREIGN KEY ("runtimeConfigId") REFERENCES "persona_runtime_configs"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_persona_runtime_sessions_owner_application"
      ON "persona_runtime_sessions" ("ownerUserId", "applicationId")
    `);
    await queryRunner.query(`
      CREATE TABLE "persona_runtime_messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "sessionId" uuid NOT NULL,
        "ownerUserId" uuid NOT NULL,
        "role" character varying(20) NOT NULL,
        "text" text NOT NULL,
        "sourceSegmentIds" text array NOT NULL DEFAULT '{}',
        "safetyStatus" character varying(40) NOT NULL DEFAULT 'allowed',
        "audioStorageKey" character varying(500),
        "audioPlaybackUrl" character varying(1000),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_persona_runtime_messages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_persona_runtime_messages_session" FOREIGN KEY ("sessionId") REFERENCES "persona_runtime_sessions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_persona_runtime_messages_session_createdAt"
      ON "persona_runtime_messages" ("sessionId", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_persona_runtime_messages_session_createdAt"`,
    );
    await queryRunner.query(`DROP TABLE "persona_runtime_messages"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_persona_runtime_sessions_owner_application"`,
    );
    await queryRunner.query(`DROP TABLE "persona_runtime_sessions"`);
  }
}
