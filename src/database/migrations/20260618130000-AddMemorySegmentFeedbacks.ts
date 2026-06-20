import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMemorySegmentFeedbacks20260618130000
  implements MigrationInterface
{
  name = 'AddMemorySegmentFeedbacks20260618130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "memory_segment_feedbacks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "memorySegmentId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "rating" "public"."feedbacks_rating_enum" NOT NULL,
        "tags" text array NOT NULL DEFAULT '{}',
        "comment" text,
        "reportedStartMs" integer,
        "reportedEndMs" integer,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_memory_segment_feedbacks_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_memory_segment_feedbacks_segment_user" UNIQUE ("memorySegmentId", "userId"),
        CONSTRAINT "FK_memory_segment_feedbacks_segment" FOREIGN KEY ("memorySegmentId") REFERENCES "memory_segments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_memory_segment_feedbacks_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_memory_segment_feedbacks_user_createdAt"
      ON "memory_segment_feedbacks" ("userId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_memory_segment_feedbacks_segment"
      ON "memory_segment_feedbacks" ("memorySegmentId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_memory_segment_feedbacks_segment"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_memory_segment_feedbacks_user_createdAt"`,
    );
    await queryRunner.query(`DROP TABLE "memory_segment_feedbacks"`);
  }
}
