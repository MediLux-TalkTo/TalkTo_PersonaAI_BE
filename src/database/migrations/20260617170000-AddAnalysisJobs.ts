import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnalysisJobs20260617170000 implements MigrationInterface {
  name = 'AddAnalysisJobs20260617170000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD "targetRecordingId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "FK_orders_target_recording"
      FOREIGN KEY ("targetRecordingId") REFERENCES "recordings"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_target_recording" ON "orders" ("targetRecordingId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "analysis_jobs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ownerUserId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "recordingId" uuid NOT NULL,
        "orderId" uuid NOT NULL,
        "entitlementId" uuid NOT NULL,
        "status" character varying(40) NOT NULL,
        "failureCode" character varying(80),
        "failureMessage" text,
        "retryCount" integer NOT NULL DEFAULT 0,
        "maxRetries" integer NOT NULL DEFAULT 3,
        "leaseOwner" character varying(120),
        "leaseExpiresAt" TIMESTAMPTZ,
        "timeoutAt" TIMESTAMPTZ,
        "statusChangedAt" TIMESTAMPTZ NOT NULL,
        "completedAt" TIMESTAMPTZ,
        "failedAt" TIMESTAMPTZ,
        "cancelledAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_analysis_jobs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_analysis_jobs_subject" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_analysis_jobs_recording" FOREIGN KEY ("recordingId") REFERENCES "recordings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_analysis_jobs_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_analysis_jobs_entitlement" FOREIGN KEY ("entitlementId") REFERENCES "entitlements"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_analysis_jobs_status" CHECK (
          "status" IN (
            'queued',
            'leased',
            'preprocessing',
            'stt_processing',
            'redaction_pending',
            'segmenting',
            'embedding',
            'completed',
            'failed_retryable',
            'failed_terminal',
            'blocked_consent_withdrawn',
            'cancelled'
          )
        ),
        CONSTRAINT "CHK_analysis_jobs_retry_count" CHECK ("retryCount" >= 0),
        CONSTRAINT "CHK_analysis_jobs_max_retries" CHECK ("maxRetries" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_analysis_jobs_owner_status_createdAt"
      ON "analysis_jobs" ("ownerUserId", "status", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_analysis_jobs_recording_status"
      ON "analysis_jobs" ("recordingId", "status")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_analysis_jobs_recording_active"
      ON "analysis_jobs" ("recordingId")
      WHERE "status" IN (
        'queued',
        'leased',
        'preprocessing',
        'stt_processing',
        'redaction_pending',
        'segmenting',
        'embedding',
        'failed_retryable'
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_analysis_jobs_order_recording_active"
      ON "analysis_jobs" ("orderId", "recordingId")
      WHERE "status" IN (
        'queued',
        'leased',
        'preprocessing',
        'stt_processing',
        'redaction_pending',
        'segmenting',
        'embedding',
        'failed_retryable'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_analysis_jobs_order_recording_active"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_analysis_jobs_recording_active"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_analysis_jobs_recording_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_analysis_jobs_owner_status_createdAt"`);
    await queryRunner.query(`DROP TABLE "analysis_jobs"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_orders_target_recording"`);
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_target_recording"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "targetRecordingId"`);
  }
}
