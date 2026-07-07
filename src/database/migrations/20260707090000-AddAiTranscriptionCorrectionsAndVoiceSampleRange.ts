import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiTranscriptionCorrectionsAndVoiceSampleRange20260707090000
  implements MigrationInterface
{
  name = 'AddAiTranscriptionCorrectionsAndVoiceSampleRange20260707090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transcript_segments"
      ADD COLUMN "correctedText" text
    `);
    await queryRunner.query(`
      ALTER TABLE "transcript_segments"
      ADD COLUMN "needsReview" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "target_voice_samples"
      ADD COLUMN "startMs" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "target_voice_samples"
      ADD COLUMN "endMs" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "target_voice_samples"
      ADD CONSTRAINT "CHK_target_voice_samples_range"
      CHECK (
        ("startMs" IS NULL AND "endMs" IS NULL)
        OR ("startMs" IS NOT NULL AND "endMs" IS NOT NULL AND "endMs" >= "startMs")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "target_voice_samples"
      DROP CONSTRAINT "CHK_target_voice_samples_range"
    `);
    await queryRunner.query(`
      ALTER TABLE "target_voice_samples"
      DROP COLUMN "endMs"
    `);
    await queryRunner.query(`
      ALTER TABLE "target_voice_samples"
      DROP COLUMN "startMs"
    `);
    await queryRunner.query(`
      ALTER TABLE "transcript_segments"
      DROP COLUMN "needsReview"
    `);
    await queryRunner.query(`
      ALTER TABLE "transcript_segments"
      DROP COLUMN "correctedText"
    `);
  }
}
