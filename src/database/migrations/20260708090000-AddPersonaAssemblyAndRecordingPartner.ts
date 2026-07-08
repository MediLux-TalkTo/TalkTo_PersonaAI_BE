import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonaAssemblyAndRecordingPartner20260708090000
  implements MigrationInterface
{
  name = 'AddPersonaAssemblyAndRecordingPartner20260708090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subjects" ADD "assembledPersonaInstructions" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "recordings" ADD "conversationPartnerName" character varying(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recordings" DROP COLUMN "conversationPartnerName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subjects" DROP COLUMN "assembledPersonaInstructions"`,
    );
  }
}
