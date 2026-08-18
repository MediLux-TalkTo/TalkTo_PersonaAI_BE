import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonaSystemPrompt20260818090000
  implements MigrationInterface
{
  name = 'AddPersonaSystemPrompt20260818090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "personas" ADD "systemPrompt" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "personas" DROP COLUMN "systemPrompt"`,
    );
  }
}
