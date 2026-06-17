import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandPurposeConsents20260617090000 implements MigrationInterface {
  name = 'ExpandPurposeConsents20260617090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "user_consents_consentType_enum" AS ENUM (
        'privacy_collection',
        'audio_storage_service',
        'biometric_voice_processing',
        'ai_analysis_service',
        'overseas_transfer_llm_provider',
        'overseas_transfer_voice_provider',
        'posthumous_persona_creation',
        'family_reconsent_posthumous',
        'marketing_optional'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "user_consents_feature_enum" AS ENUM (
        'archive',
        'memories',
        'voice_persona'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "user_consents_status_enum" AS ENUM (
        'accepted',
        'declined',
        'withdrawn',
        'expired'
      )
    `);

    await queryRunner.query(`ALTER TABLE "user_consents" ADD "subjectId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "user_consents" ADD "consentType" "user_consents_consentType_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_consents" ADD "feature" "user_consents_feature_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_consents" ADD "required" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_consents" ADD "status" "user_consents_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "user_consents" ADD "version" character varying`);
    await queryRunner.query(`ALTER TABLE "user_consents" ADD "withdrawnAt" TIMESTAMPTZ`);
    await queryRunner.query(`
      ALTER TABLE "user_consents"
      ADD CONSTRAINT "FK_user_consents_subject"
      FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_consents_user_type_subject" ON "user_consents" ("userId", "consentType", "subjectId", "acceptedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_user_consents_user_type_subject"`);
    await queryRunner.query(
      `ALTER TABLE "user_consents" DROP CONSTRAINT "FK_user_consents_subject"`,
    );
    await queryRunner.query(`ALTER TABLE "user_consents" DROP COLUMN "withdrawnAt"`);
    await queryRunner.query(`ALTER TABLE "user_consents" DROP COLUMN "version"`);
    await queryRunner.query(`ALTER TABLE "user_consents" DROP COLUMN "status"`);
    await queryRunner.query(`ALTER TABLE "user_consents" DROP COLUMN "required"`);
    await queryRunner.query(`ALTER TABLE "user_consents" DROP COLUMN "feature"`);
    await queryRunner.query(`ALTER TABLE "user_consents" DROP COLUMN "consentType"`);
    await queryRunner.query(`ALTER TABLE "user_consents" DROP COLUMN "subjectId"`);
    await queryRunner.query(`DROP TYPE "user_consents_status_enum"`);
    await queryRunner.query(`DROP TYPE "user_consents_feature_enum"`);
    await queryRunner.query(`DROP TYPE "user_consents_consentType_enum"`);
  }
}
