import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddV1UserRoles20260617100000 implements MigrationInterface {
  name = 'AddV1UserRoles20260617100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'OPS'`,
    );
    await queryRunner.query(
      `ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'AI_QA'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "users" SET "role" = 'FAMILY' WHERE "role" IN ('OPS', 'AI_QA')`,
    );
    await queryRunner.query(`ALTER TYPE "users_role_enum" RENAME TO "users_role_enum_old"`);
    await queryRunner.query(
      `CREATE TYPE "users_role_enum" AS ENUM ('FAMILY', 'ADMIN')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "users_role_enum" USING "role"::"text"::"users_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'FAMILY'`,
    );
    await queryRunner.query(`DROP TYPE "users_role_enum_old"`);
  }
}
