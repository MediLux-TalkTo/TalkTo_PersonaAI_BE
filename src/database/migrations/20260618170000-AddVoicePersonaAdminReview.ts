import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVoicePersonaAdminReview20260618170000
  implements MigrationInterface
{
  name = 'AddVoicePersonaAdminReview20260618170000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "persona_bibles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "applicationId" uuid NOT NULL,
        "ownerUserId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "contentSummary" text NOT NULL,
        "safetyNotes" text,
        "reviewStatus" character varying(40) NOT NULL DEFAULT 'pending_review',
        "reviewerUserId" uuid,
        "reviewedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_persona_bibles_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_persona_bibles_application" FOREIGN KEY ("applicationId") REFERENCES "voice_persona_applications"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_persona_bibles_application"
      ON "persona_bibles" ("applicationId")
    `);
    await queryRunner.query(`
      CREATE TABLE "voice_provider_assets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "applicationId" uuid NOT NULL,
        "ownerUserId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "providerName" character varying(120) NOT NULL,
        "externalAssetId" character varying(160) NOT NULL,
        "status" character varying(50) NOT NULL DEFAULT 'pending_manual_registration',
        "reviewerUserId" uuid NOT NULL,
        "notes" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_voice_provider_assets_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_voice_provider_assets_application" FOREIGN KEY ("applicationId") REFERENCES "voice_persona_applications"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_voice_provider_assets_application"
      ON "voice_provider_assets" ("applicationId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_voice_provider_assets_application"`);
    await queryRunner.query(`DROP TABLE "voice_provider_assets"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_persona_bibles_application"`);
    await queryRunner.query(`DROP TABLE "persona_bibles"`);
  }
}
