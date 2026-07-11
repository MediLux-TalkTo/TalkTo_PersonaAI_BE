import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubjectFamilyMembers20260711100000
  implements MigrationInterface
{
  name = 'AddSubjectFamilyMembers20260711100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subjects" ADD "familyMembers" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subjects" DROP COLUMN "familyMembers"`,
    );
  }
}
