import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillMemoryEmbeddingVectors20260531090000
  implements MigrationInterface
{
  name = 'BackfillMemoryEmbeddingVectors20260531090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    await queryRunner.query(`
      ALTER TABLE "memory_embeddings"
      ADD COLUMN IF NOT EXISTS "embeddingVector" vector(1536)
    `);
    await queryRunner.query(`
      UPDATE "memory_embeddings"
      SET "embeddingVector" = ('[' || array_to_string("embedding", ',') || ']')::vector
      WHERE "embedding" IS NOT NULL
        AND "embeddingVector" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_memory_embeddings_embeddingVector"
      ON "memory_embeddings"
      USING ivfflat ("embeddingVector" vector_cosine_ops)
      WITH (lists = 100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "memory_embeddings"
      SET "embeddingVector" = NULL
    `);
  }
}
