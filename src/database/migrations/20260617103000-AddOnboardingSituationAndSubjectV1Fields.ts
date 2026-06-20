import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnboardingSituationAndSubjectV1Fields20260617103000
  implements MigrationInterface
{
  name = 'AddOnboardingSituationAndSubjectV1Fields20260617103000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subjects"
      ADD "avatarType" character varying(32) NOT NULL DEFAULT 'DEFAULT',
      ADD "recordingCountCache" integer NOT NULL DEFAULT 0,
      ADD "recordingSecondsCache" integer NOT NULL DEFAULT 0,
      ADD "memoriesStatus" character varying(32) NOT NULL DEFAULT 'NOT_STARTED',
      ADD "personaStatus" character varying(32) NOT NULL DEFAULT 'NOT_STARTED'
    `);

    await queryRunner.query(`
      CREATE TABLE "onboarding_situation_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "situation" character varying(50) NOT NULL,
        "nextRoute" character varying(120) NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_onboarding_situation_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_onboarding_situation_events_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_onboarding_situation_events_user_createdAt"
      ON "onboarding_situation_events" ("userId", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_onboarding_situation_events_user_createdAt"`,
    );
    await queryRunner.query(`DROP TABLE "onboarding_situation_events"`);
    await queryRunner.query(`ALTER TABLE "subjects" DROP COLUMN "personaStatus"`);
    await queryRunner.query(`ALTER TABLE "subjects" DROP COLUMN "memoriesStatus"`);
    await queryRunner.query(
      `ALTER TABLE "subjects" DROP COLUMN "recordingSecondsCache"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subjects" DROP COLUMN "recordingCountCache"`,
    );
    await queryRunner.query(`ALTER TABLE "subjects" DROP COLUMN "avatarType"`);
  }
}
