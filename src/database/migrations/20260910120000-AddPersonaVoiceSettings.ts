import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 목소리 결(speed·stability·similarityBoost·style)을 페르소나마다 갖게 한다.
 * 지금까지는 AI 서버에 한 벌만 있어 신금자와 이준혁이 같은 값으로 나갔다.
 * 비어 있으면 예전처럼 AI 서버 기본값을 쓴다.
 */
export class AddPersonaVoiceSettings20260910120000 implements MigrationInterface {
  name = 'AddPersonaVoiceSettings20260910120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "voiceSettings" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "personas" DROP COLUMN IF EXISTS "voiceSettings"`,
    );
  }
}
