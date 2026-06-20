import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDataDeletionRequests20260618200000
  implements MigrationInterface
{
  name = 'AddDataDeletionRequests20260618200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "data_deletion_requests" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ownerUserId" uuid NOT NULL,
        "scope" character varying(30) NOT NULL,
        "subjectId" uuid,
        "recordingId" uuid,
        "status" character varying(40) NOT NULL DEFAULT 'requested',
        "reason" text,
        "processedByUserId" uuid,
        "processedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_data_deletion_requests_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_data_deletion_requests_owner_status"
      ON "data_deletion_requests" ("ownerUserId", "status")
    `);
    await queryRunner.query(`
      CREATE TABLE "provider_deletion_records" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "dataDeletionRequestId" uuid NOT NULL,
        "ownerUserId" uuid NOT NULL,
        "subjectId" uuid,
        "providerAssetId" uuid,
        "providerName" character varying(120) NOT NULL,
        "externalAssetId" character varying(160) NOT NULL,
        "status" character varying(40) NOT NULL DEFAULT 'pending_manual',
        "notes" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_provider_deletion_records_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_provider_deletion_records_request" FOREIGN KEY ("dataDeletionRequestId") REFERENCES "data_deletion_requests"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_provider_deletion_records_asset" FOREIGN KEY ("providerAssetId") REFERENCES "voice_provider_assets"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_provider_deletion_records_request"
      ON "provider_deletion_records" ("dataDeletionRequestId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_provider_deletion_records_request"`);
    await queryRunner.query(`DROP TABLE "provider_deletion_records"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_data_deletion_requests_owner_status"`);
    await queryRunner.query(`DROP TABLE "data_deletion_requests"`);
  }
}
