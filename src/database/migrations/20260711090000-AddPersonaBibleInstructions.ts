import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonaBibleInstructions20260711090000
  implements MigrationInterface
{
  name = 'AddPersonaBibleInstructions20260711090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "persona_bibles" ADD "assembledInstructions" text`,
    );
    await queryRunner.query(`
      UPDATE "persona_bibles" AS bible
      SET "assembledInstructions" = subject."assembledPersonaInstructions"
      FROM "subjects" AS subject
      WHERE subject."id" = bible."subjectId"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "persona_bibles" DROP COLUMN "assembledInstructions"`,
    );
  }
}
