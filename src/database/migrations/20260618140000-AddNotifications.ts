import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotifications20260618140000 implements MigrationInterface {
  name = 'AddNotifications20260618140000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "type" character varying(80) NOT NULL,
        "title" character varying(160) NOT NULL,
        "body" character varying(300) NOT NULL,
        "resourceType" character varying(80),
        "resourceId" uuid,
        "subjectId" uuid,
        "recordingId" uuid,
        "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "readAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_subject" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_notifications_recording" FOREIGN KEY ("recordingId") REFERENCES "recordings"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_createdAt"
      ON "notifications" ("userId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_readAt"
      ON "notifications" ("userId", "readAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_user_readAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_user_createdAt"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
