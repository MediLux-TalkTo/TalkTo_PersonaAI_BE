import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaskingRedactions20260617190000 implements MigrationInterface {
  name = 'AddMaskingRedactions20260617190000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "transcript_redactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ownerUserId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "recordingId" uuid,
        "analysisJobId" uuid,
        "sourceType" character varying(40) NOT NULL,
        "sourceId" uuid NOT NULL,
        "status" character varying(40) NOT NULL,
        "redactedText" text,
        "spanCount" integer NOT NULL DEFAULT 0,
        "errorCode" character varying(80),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transcript_redactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transcript_redactions_subject" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transcript_redactions_recording" FOREIGN KEY ("recordingId") REFERENCES "recordings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transcript_redactions_analysis_job" FOREIGN KEY ("analysisJobId") REFERENCES "analysis_jobs"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_transcript_redactions_status" CHECK ("status" IN ('pending', 'succeeded', 'failed', 'not_required')),
        CONSTRAINT "CHK_transcript_redactions_source_type" CHECK ("sourceType" IN ('transcript', 'transcript_segment', 'memory_segment', 'provider_payload')),
        CONSTRAINT "CHK_transcript_redactions_span_count" CHECK ("spanCount" >= 0)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_transcript_redactions_owner_source"
      ON "transcript_redactions" ("ownerUserId", "sourceType", "sourceId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_transcript_redactions_recording_status"
      ON "transcript_redactions" ("recordingId", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "masking_spans" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "redactionId" uuid NOT NULL,
        "sourceType" character varying(40) NOT NULL,
        "sourceId" uuid NOT NULL,
        "kind" character varying(40) NOT NULL,
        "startOffset" integer NOT NULL,
        "endOffset" integer NOT NULL,
        "replacement" character varying(80) NOT NULL,
        "confidence" double precision NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_masking_spans_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_masking_spans_redaction" FOREIGN KEY ("redactionId") REFERENCES "transcript_redactions"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_masking_spans_source_type" CHECK ("sourceType" IN ('transcript', 'transcript_segment', 'memory_segment', 'provider_payload')),
        CONSTRAINT "CHK_masking_spans_kind" CHECK ("kind" IN ('email', 'phone', 'national_id', 'token', 'signed_url', 'prompt_injection')),
        CONSTRAINT "CHK_masking_spans_offsets" CHECK ("startOffset" >= 0 AND "endOffset" > "startOffset"),
        CONSTRAINT "CHK_masking_spans_confidence" CHECK ("confidence" >= 0 AND "confidence" <= 1)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_masking_spans_redaction"
      ON "masking_spans" ("redactionId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_masking_spans_source"
      ON "masking_spans" ("sourceType", "sourceId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_masking_spans_source"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_masking_spans_redaction"`);
    await queryRunner.query(`DROP TABLE "masking_spans"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_transcript_redactions_recording_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_transcript_redactions_owner_source"`,
    );
    await queryRunner.query(`DROP TABLE "transcript_redactions"`);
  }
}
