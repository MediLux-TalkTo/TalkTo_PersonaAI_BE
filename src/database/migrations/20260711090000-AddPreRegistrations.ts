import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPreRegistrations20260711090000 implements MigrationInterface {
  name = 'AddPreRegistrations20260711090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "pre_registrations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(100) NOT NULL,
        "contactType" character varying(20) NOT NULL,
        "contact" character varying(255) NOT NULL,
        "contactNormalized" character varying(255) NOT NULL,
        "participationType" character varying(40) NOT NULL,
        "reason" character varying(80) NOT NULL,
        "reasonOther" character varying(500),
        "contactConsent" boolean NOT NULL,
        "contactConsentVersion" character varying(80) NOT NULL,
        "survey" jsonb,
        "interview" jsonb,
        "utm" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "status" character varying(40) NOT NULL DEFAULT 'received',
        "benefitStatus" character varying(40) NOT NULL DEFAULT 'not_applicable',
        "operatorNotes" character varying(500),
        "idempotencyKey" character varying(80),
        "contactedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pre_registrations_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_pre_registrations_contactNormalized" ON "pre_registrations" ("contactNormalized")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_pre_registrations_idempotencyKey" ON "pre_registrations" ("idempotencyKey")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pre_registrations_status_createdAt" ON "pre_registrations" ("status", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pre_registrations_participation_createdAt" ON "pre_registrations" ("participationType", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_pre_registrations_participation_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_pre_registrations_status_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_pre_registrations_idempotencyKey"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_pre_registrations_contactNormalized"`,
    );
    await queryRunner.query(`DROP TABLE "pre_registrations"`);
  }
}
