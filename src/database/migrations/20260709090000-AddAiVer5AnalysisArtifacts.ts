import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiVer5AnalysisArtifacts20260709090000
  implements MigrationInterface
{
  name = 'AddAiVer5AnalysisArtifacts20260709090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "analysis_jobs" ADD "subjectSpeakerLabel" character varying(120)`,
    );
    await queryRunner.query(`ALTER TABLE "recordings" ADD "summary" text`);
    await queryRunner.query(
      `ALTER TABLE "recordings" ADD "summaryTags" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(`ALTER TABLE "recordings" ADD "speechStyle" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "recordings" ADD "safetyFlags" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "memory_segments" ADD "confidence" character varying(20) NOT NULL DEFAULT 'confirmed'`,
    );
    await queryRunner.query(
      `ALTER TABLE "memory_segments" ADD "importanceScore" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "memory_segments" ADD "tags" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "memory_segments" ADD "relatedPeople" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "memory_segments" ADD "sensitivityFlags" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(`
      CREATE TABLE "persona_reflections" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ownerUserId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "insight" text NOT NULL,
        "category" character varying(80) NOT NULL,
        "evidenceMemoryIds" text array NOT NULL DEFAULT '{}',
        "importance" integer NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_persona_reflections_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_persona_reflections_subject" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_persona_reflections_subject" ON "persona_reflections" ("subjectId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_persona_reflections_subject"`);
    await queryRunner.query(`DROP TABLE "persona_reflections"`);
    await queryRunner.query(
      `ALTER TABLE "memory_segments" DROP COLUMN "sensitivityFlags"`,
    );
    await queryRunner.query(
      `ALTER TABLE "memory_segments" DROP COLUMN "relatedPeople"`,
    );
    await queryRunner.query(`ALTER TABLE "memory_segments" DROP COLUMN "tags"`);
    await queryRunner.query(
      `ALTER TABLE "memory_segments" DROP COLUMN "importanceScore"`,
    );
    await queryRunner.query(
      `ALTER TABLE "memory_segments" DROP COLUMN "confidence"`,
    );
    await queryRunner.query(`ALTER TABLE "recordings" DROP COLUMN "safetyFlags"`);
    await queryRunner.query(`ALTER TABLE "recordings" DROP COLUMN "speechStyle"`);
    await queryRunner.query(`ALTER TABLE "recordings" DROP COLUMN "summaryTags"`);
    await queryRunner.query(`ALTER TABLE "recordings" DROP COLUMN "summary"`);
    await queryRunner.query(
      `ALTER TABLE "analysis_jobs" DROP COLUMN "subjectSpeakerLabel"`,
    );
  }
}
