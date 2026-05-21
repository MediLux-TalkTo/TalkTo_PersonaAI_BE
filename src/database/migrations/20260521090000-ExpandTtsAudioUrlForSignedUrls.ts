import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandTtsAudioUrlForSignedUrls20260521090000
  implements MigrationInterface
{
  name = 'ExpandTtsAudioUrlForSignedUrls20260521090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "voice_artifacts"
      ALTER COLUMN "ttsAudioUrl" TYPE text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "voice_artifacts"
      ALTER COLUMN "ttsAudioUrl" TYPE character varying
    `);
  }
}
