import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecordingDeletionLifecycle20260617163000
  implements MigrationInterface
{
  name = 'AddRecordingDeletionLifecycle20260617163000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "recordings"
      ADD COLUMN "archiveStatus" character varying(40) NOT NULL DEFAULT 'pending_upload',
      ADD COLUMN "deletedAt" TIMESTAMPTZ
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_recordings_owner_archiveStatus" ON "recordings" ("ownerUserId", "archiveStatus")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_recordings_owner_archiveStatus"`);
    await queryRunner.query(`
      ALTER TABLE "recordings"
      DROP COLUMN "deletedAt",
      DROP COLUMN "archiveStatus"
    `);
  }
}
