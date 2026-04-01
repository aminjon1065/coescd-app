import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrgUnitToEdmV2Documents20260401143000
  implements MigrationInterface
{
  name = 'AddOrgUnitToEdmV2Documents20260401143000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "edm_v2_documents"
      ADD COLUMN IF NOT EXISTS "org_unit_id" integer
    `);

    await queryRunner.query(`
      UPDATE "edm_v2_documents" d
      SET "org_unit_id" = u."org_unit_id"
      FROM "user" u
      WHERE d."org_unit_id" IS NULL
        AND d."owner_id" = u."id"
        AND u."org_unit_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_EDM_V2_DOCUMENTS_ORG_UNIT_ID"
      ON "edm_v2_documents" ("org_unit_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "edm_v2_documents"
      ADD CONSTRAINT "FK_EDM_V2_DOCUMENTS_ORG_UNIT_ID"
      FOREIGN KEY ("org_unit_id") REFERENCES "org_units"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `).catch(() => undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "edm_v2_documents"
      DROP CONSTRAINT IF EXISTS "FK_EDM_V2_DOCUMENTS_ORG_UNIT_ID"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_EDM_V2_DOCUMENTS_ORG_UNIT_ID"
    `);
    await queryRunner.query(`
      ALTER TABLE "edm_v2_documents"
      DROP COLUMN IF EXISTS "org_unit_id"
    `);
  }
}
