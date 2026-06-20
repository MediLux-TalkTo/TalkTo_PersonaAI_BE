import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResearchExportPreferences20260618150000
  implements MigrationInterface
{
  name = 'AddResearchExportPreferences20260618150000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "research_export_preferences" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "optedIn" boolean NOT NULL DEFAULT false,
        "optedInAt" TIMESTAMPTZ,
        "withdrawnAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_research_export_preferences_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_research_export_preferences_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_research_export_preferences_user"
      ON "research_export_preferences" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_research_export_preferences_user"`,
    );
    await queryRunner.query(`DROP TABLE "research_export_preferences"`);
  }
}
