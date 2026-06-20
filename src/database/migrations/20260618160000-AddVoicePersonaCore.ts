import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVoicePersonaCore20260618160000 implements MigrationInterface {
  name = 'AddVoicePersonaCore20260618160000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "voice_persona_applications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ownerUserId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "entitlementId" uuid,
        "status" character varying(40) NOT NULL DEFAULT 'draft',
        "documentsStatus" character varying(40) NOT NULL DEFAULT 'pending_review',
        "intakeStatus" character varying(40) NOT NULL DEFAULT 'draft',
        "voiceSampleStatus" character varying(40) NOT NULL DEFAULT 'pending_review',
        "buildStatus" character varying(50) NOT NULL DEFAULT 'locked_until_requirements',
        "submittedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_voice_persona_applications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_voice_persona_applications_subject" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_voice_persona_applications_entitlement" FOREIGN KEY ("entitlementId") REFERENCES "entitlements"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_voice_persona_applications_owner_subject"
      ON "voice_persona_applications" ("ownerUserId", "subjectId")
    `);
    await queryRunner.query(`
      CREATE TABLE "voice_persona_documents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "applicationId" uuid NOT NULL,
        "ownerUserId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "filename" character varying(255) NOT NULL,
        "mimeType" character varying(120) NOT NULL,
        "fileSizeBytes" bigint NOT NULL,
        "storageKey" character varying(500) NOT NULL,
        "reviewStatus" character varying(40) NOT NULL DEFAULT 'pending_review',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_voice_persona_documents_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_voice_persona_documents_application" FOREIGN KEY ("applicationId") REFERENCES "voice_persona_applications"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_voice_persona_documents_application"
      ON "voice_persona_documents" ("applicationId")
    `);
    await queryRunner.query(`
      CREATE TABLE "persona_intakes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "applicationId" uuid NOT NULL,
        "ownerUserId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "sections" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "status" character varying(40) NOT NULL DEFAULT 'draft',
        "submittedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_persona_intakes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_persona_intakes_application" FOREIGN KEY ("applicationId") REFERENCES "voice_persona_applications"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_persona_intakes_application"
      ON "persona_intakes" ("applicationId")
    `);
    await queryRunner.query(`
      CREATE TABLE "target_voice_samples" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "applicationId" uuid NOT NULL,
        "ownerUserId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "recordingId" uuid,
        "storageKey" character varying(500),
        "reviewStatus" character varying(40) NOT NULL DEFAULT 'pending_review',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_target_voice_samples_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_target_voice_samples_application" FOREIGN KEY ("applicationId") REFERENCES "voice_persona_applications"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_target_voice_samples_recording" FOREIGN KEY ("recordingId") REFERENCES "recordings"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_target_voice_samples_application"
      ON "target_voice_samples" ("applicationId")
    `);
    await queryRunner.query(`
      CREATE TABLE "persona_build_jobs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "applicationId" uuid NOT NULL,
        "ownerUserId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "status" character varying(50) NOT NULL DEFAULT 'locked_until_requirements',
        "providerName" character varying(120),
        "externalAssetId" character varying(160),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_persona_build_jobs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_persona_build_jobs_application" FOREIGN KEY ("applicationId") REFERENCES "voice_persona_applications"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_persona_build_jobs_application"
      ON "persona_build_jobs" ("applicationId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_persona_build_jobs_application"`);
    await queryRunner.query(`DROP TABLE "persona_build_jobs"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_target_voice_samples_application"`);
    await queryRunner.query(`DROP TABLE "target_voice_samples"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_persona_intakes_application"`);
    await queryRunner.query(`DROP TABLE "persona_intakes"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_voice_persona_documents_application"`);
    await queryRunner.query(`DROP TABLE "voice_persona_documents"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_voice_persona_applications_owner_subject"`,
    );
    await queryRunner.query(`DROP TABLE "voice_persona_applications"`);
  }
}
