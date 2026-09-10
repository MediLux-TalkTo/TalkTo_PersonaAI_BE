import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * personas 에 대상자를 단다.
 *
 * 앱 경로는 런타임 설정(persona_runtime_configs)에서 대상자가 정해지지만,
 * 데모 페르소나는 그 설정이 없어 전역 폴백으로 돈다. 그때도 대상자를 알아야
 * 기억 검색을 대상자별로 가를 수 있다.
 */
export class AddSubjectIdToPersonas20260910040000 implements MigrationInterface {
  name = 'AddSubjectIdToPersonas20260910040000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "personas" ADD "subjectId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "personas" ADD CONSTRAINT "FK_personas_subject" ` +
        `FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "personas" DROP CONSTRAINT "FK_personas_subject"`);
    await queryRunner.query(`ALTER TABLE "personas" DROP COLUMN "subjectId"`);
  }
}
