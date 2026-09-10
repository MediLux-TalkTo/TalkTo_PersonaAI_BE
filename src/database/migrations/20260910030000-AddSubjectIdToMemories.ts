import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * memories 에 대상자 구분을 넣는다.
 *
 * 지금까지는 대상자가 신금자 하나뿐이라 구분 없이 살았지만, 두 번째 대상자가
 * 생기면 검색(memory-retrieval)이 status 만 보고 고르므로 남의 기억이 섞인다.
 *
 * 기존 행은 대상자를 알 수 없어 NULL 로 둔다. 운영 반영 시 신금자 subjectId 로
 * 채운 뒤 NOT NULL 로 조이는 것은 별도 마이그레이션으로 한다.
 */
export class AddSubjectIdToMemories20260910030000 implements MigrationInterface {
  name = 'AddSubjectIdToMemories20260910030000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "memories" ADD "subjectId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "memories" ADD CONSTRAINT "FK_memories_subject" ` +
        `FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_memories_subjectId_status" ON "memories" ("subjectId", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_memories_subjectId_status"`);
    await queryRunner.query(`ALTER TABLE "memories" DROP CONSTRAINT "FK_memories_subject"`);
    await queryRunner.query(`ALTER TABLE "memories" DROP COLUMN "subjectId"`);
  }
}
