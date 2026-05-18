import { MigrationInterface, QueryRunner } from 'typeorm';

export class PgvectorMemoryEmbeddingsDraft20260518090000
  implements MigrationInterface
{
  name = 'PgvectorMemoryEmbeddingsDraft20260518090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    await queryRunner.query(`
      ALTER TABLE "memory_embeddings"
      ADD COLUMN IF NOT EXISTS "embeddingVector" vector(1536)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_memory_embeddings_embeddingVector"
      ON "memory_embeddings"
      USING ivfflat ("embeddingVector" vector_cosine_ops)
      WITH (lists = 100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_memory_embeddings_embeddingVector"`,
    );
    await queryRunner.query(`
      ALTER TABLE "memory_embeddings"
      DROP COLUMN IF EXISTS "embeddingVector"
    `);
  }
}
