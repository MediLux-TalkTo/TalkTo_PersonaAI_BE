import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecordingUploadIntents20260617162000
  implements MigrationInterface
{
  name = 'AddRecordingUploadIntents20260617162000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "recordings"
      ADD COLUMN "analysisStage" character varying(40) NOT NULL DEFAULT 'not_analyzed',
      ADD COLUMN "memoriesStatus" character varying(80) NOT NULL DEFAULT 'locked_until_memories',
      ADD COLUMN "checksumStatus" character varying(40) NOT NULL DEFAULT 'not_supported'
    `);

    await queryRunner.query(`
      CREATE TABLE "recording_upload_intents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "recordingId" uuid NOT NULL,
        "ownerUserId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "source" character varying(80) NOT NULL DEFAULT 'app_recording',
        "platform" character varying(40) NOT NULL DEFAULT 'ios',
        "singleFile" boolean NOT NULL DEFAULT true,
        "status" character varying(40) NOT NULL DEFAULT 'uploading',
        "failureCode" character varying(80),
        "originalFilename" character varying(255) NOT NULL,
        "mimeType" character varying(120) NOT NULL,
        "expectedFileSizeBytes" bigint NOT NULL,
        "storageKey" character varying NOT NULL,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "completedAt" TIMESTAMPTZ,
        "canceledAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_recording_upload_intents_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_recording_upload_intents_recording" FOREIGN KEY ("recordingId") REFERENCES "recordings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_recording_upload_intents_owner" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_recording_upload_intents_subject" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_recording_upload_intents_single_file" CHECK ("singleFile" = true)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_recording_upload_intents_recording_createdAt" ON "recording_upload_intents" ("recordingId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_recording_upload_intents_owner_status" ON "recording_upload_intents" ("ownerUserId", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_recording_upload_intents_owner_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_recording_upload_intents_recording_createdAt"`,
    );
    await queryRunner.query(`DROP TABLE "recording_upload_intents"`);
    await queryRunner.query(`
      ALTER TABLE "recordings"
      DROP COLUMN "checksumStatus",
      DROP COLUMN "memoriesStatus",
      DROP COLUMN "analysisStage"
    `);
  }
}
