import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVoicePersonaFamilyReview20260618180000
  implements MigrationInterface
{
  name = 'AddVoicePersonaFamilyReview20260618180000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "persona_family_reviews" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "applicationId" uuid NOT NULL,
        "ownerUserId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "personaBibleId" uuid NOT NULL,
        "reviewerUserId" uuid NOT NULL,
        "status" character varying(40) NOT NULL,
        "notes" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_persona_family_reviews_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_persona_family_reviews_application" FOREIGN KEY ("applicationId") REFERENCES "voice_persona_applications"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_persona_family_reviews_bible" FOREIGN KEY ("personaBibleId") REFERENCES "persona_bibles"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_persona_family_reviews_application"
      ON "persona_family_reviews" ("applicationId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE TABLE "persona_runtime_configs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "applicationId" uuid NOT NULL,
        "ownerUserId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "personaBibleId" uuid NOT NULL,
        "providerAssetId" uuid NOT NULL,
        "enabled" boolean NOT NULL DEFAULT false,
        "enabledAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_persona_runtime_configs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_persona_runtime_configs_application" FOREIGN KEY ("applicationId") REFERENCES "voice_persona_applications"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_persona_runtime_configs_bible" FOREIGN KEY ("personaBibleId") REFERENCES "persona_bibles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_persona_runtime_configs_provider_asset" FOREIGN KEY ("providerAssetId") REFERENCES "voice_provider_assets"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_persona_runtime_configs_application"
      ON "persona_runtime_configs" ("applicationId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_persona_runtime_configs_application"`);
    await queryRunner.query(`DROP TABLE "persona_runtime_configs"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_persona_family_reviews_application"`);
    await queryRunner.query(`DROP TABLE "persona_family_reviews"`);
  }
}
