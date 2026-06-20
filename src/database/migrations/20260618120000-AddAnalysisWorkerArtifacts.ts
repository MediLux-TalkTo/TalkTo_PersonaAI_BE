import { MigrationInterface, QueryRunner } from 'typeorm';

const ACTIVE_JOB_STATUSES = `
  'queued',
  'leased',
  'preprocessing',
  'stt_processing',
  'redaction_pending',
  'segmenting',
  'embedding',
  'indexing',
  'failed_retryable'
`;

const ALL_JOB_STATUSES = `
  ${ACTIVE_JOB_STATUSES},
  'completed',
  'failed_terminal',
  'blocked_consent_withdrawn',
  'cancelled'
`;

export class AddAnalysisWorkerArtifacts20260618120000
  implements MigrationInterface
{
  name = 'AddAnalysisWorkerArtifacts20260618120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "analysis_jobs"
      DROP CONSTRAINT "CHK_analysis_jobs_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "analysis_jobs"
      ADD CONSTRAINT "CHK_analysis_jobs_status"
      CHECK ("status" IN (${ALL_JOB_STATUSES}))
    `);
    await queryRunner.query(`DROP INDEX "public"."UQ_analysis_jobs_recording_active"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_analysis_jobs_order_recording_active"`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_analysis_jobs_recording_active"
      ON "analysis_jobs" ("recordingId")
      WHERE "status" IN (${ACTIVE_JOB_STATUSES})
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_analysis_jobs_order_recording_active"
      ON "analysis_jobs" ("orderId", "recordingId")
      WHERE "status" IN (${ACTIVE_JOB_STATUSES})
    `);

    await queryRunner.query(`
      CREATE TABLE "transcript_segments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "jobId" uuid NOT NULL,
        "ownerUserId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "recordingId" uuid NOT NULL,
        "segmentIndex" integer NOT NULL,
        "startMs" integer NOT NULL,
        "endMs" integer NOT NULL,
        "speakerLabel" character varying(120) NOT NULL DEFAULT 'unknown',
        "transcriptText" text NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transcript_segments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transcript_segments_job" FOREIGN KEY ("jobId") REFERENCES "analysis_jobs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transcript_segments_recording" FOREIGN KEY ("recordingId") REFERENCES "recordings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transcript_segments_subject" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_transcript_segments_timing" CHECK ("endMs" >= "startMs")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_transcript_segments_job_index"
      ON "transcript_segments" ("jobId", "segmentIndex")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_transcript_segments_recording"
      ON "transcript_segments" ("recordingId")
    `);

    await queryRunner.query(`
      CREATE TABLE "memory_segments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "jobId" uuid NOT NULL,
        "ownerUserId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "recordingId" uuid NOT NULL,
        "segmentIndex" integer NOT NULL,
        "sourceTranscriptSegmentIds" text array NOT NULL DEFAULT '{}',
        "startMs" integer NOT NULL,
        "endMs" integer NOT NULL,
        "speakerLabel" character varying(120) NOT NULL DEFAULT 'unknown',
        "memoryText" text NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_memory_segments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_memory_segments_job" FOREIGN KEY ("jobId") REFERENCES "analysis_jobs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_memory_segments_recording" FOREIGN KEY ("recordingId") REFERENCES "recordings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_memory_segments_subject" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_memory_segments_timing" CHECK ("endMs" >= "startMs")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_memory_segments_job_index"
      ON "memory_segments" ("jobId", "segmentIndex")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_memory_segments_recording"
      ON "memory_segments" ("recordingId")
    `);

    await queryRunner.query(`
      CREATE TABLE "embeddings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "jobId" uuid NOT NULL,
        "memorySegmentId" uuid NOT NULL,
        "ownerUserId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "recordingId" uuid NOT NULL,
        "embeddingIndex" integer NOT NULL,
        "provider" character varying(80) NOT NULL,
        "model" character varying(120) NOT NULL,
        "dimensions" integer NOT NULL,
        "embedding" float8 array NOT NULL,
        "embeddingVector" vector(1536),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_embeddings_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_embeddings_job" FOREIGN KEY ("jobId") REFERENCES "analysis_jobs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_embeddings_memory_segment" FOREIGN KEY ("memorySegmentId") REFERENCES "memory_segments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_embeddings_recording" FOREIGN KEY ("recordingId") REFERENCES "recordings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_embeddings_subject" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_embeddings_dimensions" CHECK ("dimensions" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_embeddings_job_index"
      ON "embeddings" ("jobId", "embeddingIndex")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_embeddings_memory_segment"
      ON "embeddings" ("memorySegmentId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_embeddings_vector"
      ON "embeddings"
      USING ivfflat ("embeddingVector" vector_cosine_ops)
      WHERE "embeddingVector" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_embeddings_vector"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_embeddings_memory_segment"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_embeddings_job_index"`);
    await queryRunner.query(`DROP TABLE "embeddings"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_memory_segments_recording"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_memory_segments_job_index"`);
    await queryRunner.query(`DROP TABLE "memory_segments"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_transcript_segments_recording"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_transcript_segments_job_index"`);
    await queryRunner.query(`DROP TABLE "transcript_segments"`);

    await queryRunner.query(`DROP INDEX "public"."UQ_analysis_jobs_recording_active"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_analysis_jobs_order_recording_active"`,
    );
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
    await queryRunner.query(`
      ALTER TABLE "analysis_jobs"
      DROP CONSTRAINT "CHK_analysis_jobs_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "analysis_jobs"
      ADD CONSTRAINT "CHK_analysis_jobs_status"
      CHECK (
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
      )
    `);
  }
}
