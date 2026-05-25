import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNeutralFeedbackRating20260525090000 implements MigrationInterface {
  name = 'AddNeutralFeedbackRating20260525090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "feedbacks_rating_enum" ADD VALUE IF NOT EXISTS 'NEUTRAL'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "feedbacks" SET "rating" = 'DOWN' WHERE "rating" = 'NEUTRAL'
    `);
    await queryRunner.query(`ALTER TYPE "feedbacks_rating_enum" RENAME TO "feedbacks_rating_enum_old"`);
    await queryRunner.query(`CREATE TYPE "feedbacks_rating_enum" AS ENUM ('UP', 'DOWN')`);
    await queryRunner.query(`
      ALTER TABLE "feedbacks"
      ALTER COLUMN "rating" TYPE "feedbacks_rating_enum"
      USING "rating"::text::"feedbacks_rating_enum"
    `);
    await queryRunner.query(`DROP TYPE "feedbacks_rating_enum_old"`);
  }
}
