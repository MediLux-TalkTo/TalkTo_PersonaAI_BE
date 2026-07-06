import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTranscriptSegmentConfidence20260706090000
  implements MigrationInterface
{
  name = 'AddTranscriptSegmentConfidence20260706090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transcript_segments"
      ADD COLUMN "confidence" double precision
    `);
    await queryRunner.query(`
      ALTER TABLE "transcript_segments"
      ADD CONSTRAINT "CHK_transcript_segments_confidence"
      CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transcript_segments"
      DROP CONSTRAINT "CHK_transcript_segments_confidence"
    `);
    await queryRunner.query(`
      ALTER TABLE "transcript_segments"
      DROP COLUMN "confidence"
    `);
  }
}
