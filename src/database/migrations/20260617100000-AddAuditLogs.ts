import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogs20260617100000 implements MigrationInterface {
  name = 'AddAuditLogs20260617100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "actorUserId" uuid,
        "actorRole" character varying,
        "action" character varying(80) NOT NULL,
        "resourceType" character varying(80) NOT NULL,
        "resourceId" character varying,
        "subjectId" uuid,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_actor_occurredAt" ON "audit_logs" ("actorUserId", "occurredAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_action_occurredAt" ON "audit_logs" ("action", "occurredAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_resource" ON "audit_logs" ("resourceType", "resourceId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_subject_occurredAt" ON "audit_logs" ("subjectId", "occurredAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_subject_occurredAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_resource"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_action_occurredAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_actor_occurredAt"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
