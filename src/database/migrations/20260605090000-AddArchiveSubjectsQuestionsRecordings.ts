import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArchiveSubjectsQuestionsRecordings20260605090000
  implements MigrationInterface
{
  name = 'AddArchiveSubjectsQuestionsRecordings20260605090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "subjects_lifeStatus_enum" AS ENUM ('LIVING', 'DECEASED', 'UNKNOWN')`,
    );
    await queryRunner.query(
      `CREATE TYPE "family_glossary_terms_termType_enum" AS ENUM ('PERSON', 'NICKNAME', 'PLACE', 'PHRASE', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "question_interactions_interactionType_enum" AS ENUM ('VIEWED', 'COMPLETED', 'SKIPPED', 'CUSTOM_ADDED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "recordings_uploadStatus_enum" AS ENUM ('CREATED', 'UPLOADING', 'UPLOADED', 'UPLOAD_FAILED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "recordings_analysisStatus_enum" AS ENUM ('NOT_REQUESTED', 'PREVIEW_QUEUED', 'PREVIEW_PROCESSING', 'PREVIEW_PROCESSED', 'PREVIEW_FAILED', 'FULL_ANALYSIS_QUEUED', 'FULL_ANALYSIS_PROCESSING', 'FULLY_INDEXED', 'FULL_ANALYSIS_FAILED')`,
    );

    await queryRunner.query(`
      CREATE TABLE "subjects" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ownerUserId" uuid NOT NULL,
        "displayName" character varying(100) NOT NULL,
        "relationship" character varying(50) NOT NULL,
        "lifeStatus" "subjects_lifeStatus_enum" NOT NULL DEFAULT 'UNKNOWN',
        "localeHint" character varying,
        "dialectHint" character varying,
        "notes" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subjects_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_subjects_owner" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "family_glossary_terms" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "subjectId" uuid NOT NULL,
        "termType" "family_glossary_terms_termType_enum" NOT NULL DEFAULT 'OTHER',
        "term" character varying(100) NOT NULL,
        "pronunciationHint" character varying,
        "meaning" character varying,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_family_glossary_terms_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_family_glossary_terms_subject" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "question_interactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "questionId" character varying,
        "questionText" text NOT NULL,
        "category" character varying,
        "interactionType" "question_interactions_interactionType_enum" NOT NULL,
        "note" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_question_interactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_question_interactions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_question_interactions_subject" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "recordings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ownerUserId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "originalFilename" character varying(255) NOT NULL,
        "mimeType" character varying(120) NOT NULL,
        "fileSizeBytes" bigint NOT NULL,
        "durationSeconds" integer,
        "storageKey" character varying,
        "fileHash" character varying,
        "memo" text,
        "relatedQuestionId" character varying,
        "relatedQuestionText" text,
        "uploadStatus" "recordings_uploadStatus_enum" NOT NULL DEFAULT 'CREATED',
        "analysisStatus" "recordings_analysisStatus_enum" NOT NULL DEFAULT 'NOT_REQUESTED',
        "uploadedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_recordings_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_recordings_owner" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_recordings_subject" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_subjects_owner_createdAt" ON "subjects" ("ownerUserId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_family_glossary_terms_subject" ON "family_glossary_terms" ("subjectId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_question_interactions_subject_createdAt" ON "question_interactions" ("subjectId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_recordings_subject_createdAt" ON "recordings" ("subjectId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_recordings_owner_uploadStatus" ON "recordings" ("ownerUserId", "uploadStatus")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_recordings_owner_uploadStatus"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_recordings_subject_createdAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_question_interactions_subject_createdAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_family_glossary_terms_subject"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_subjects_owner_createdAt"`);

    await queryRunner.query(`DROP TABLE "recordings"`);
    await queryRunner.query(`DROP TABLE "question_interactions"`);
    await queryRunner.query(`DROP TABLE "family_glossary_terms"`);
    await queryRunner.query(`DROP TABLE "subjects"`);

    await queryRunner.query(`DROP TYPE "recordings_analysisStatus_enum"`);
    await queryRunner.query(`DROP TYPE "recordings_uploadStatus_enum"`);
    await queryRunner.query(`DROP TYPE "question_interactions_interactionType_enum"`);
    await queryRunner.query(`DROP TYPE "family_glossary_terms_termType_enum"`);
    await queryRunner.query(`DROP TYPE "subjects_lifeStatus_enum"`);
  }
}
