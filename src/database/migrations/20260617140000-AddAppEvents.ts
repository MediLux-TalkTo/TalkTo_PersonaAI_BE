import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppEvents20260617140000 implements MigrationInterface {
  name = 'AddAppEvents20260617140000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "app_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "subjectId" uuid,
        "recordingId" uuid,
        "orderId" uuid,
        "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_app_events_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_app_events_subject" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_app_events_recording" FOREIGN KEY ("recordingId") REFERENCES "recordings"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_app_events_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_app_events_user_name_createdAt" ON "app_events" ("userId", "name", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_app_events_subject_createdAt" ON "app_events" ("subjectId", "createdAt") WHERE "subjectId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_app_events_recording_createdAt" ON "app_events" ("recordingId", "createdAt") WHERE "recordingId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_app_events_order_createdAt" ON "app_events" ("orderId", "createdAt") WHERE "orderId" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_app_events_order_createdAt"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_app_events_recording_createdAt"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_app_events_subject_createdAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_app_events_user_name_createdAt"`);
    await queryRunner.query(`DROP TABLE "app_events"`);
  }
}
