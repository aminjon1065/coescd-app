import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrgUnitToLegacyDocuments20260401133000
  implements MigrationInterface
{
  name = 'AddOrgUnitToLegacyDocuments20260401133000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
      ADD COLUMN IF NOT EXISTS "org_unit_id" integer
    `);

    await queryRunner.query(`
      UPDATE "documents" d
      SET "org_unit_id" = u."org_unit_id"
      FROM "user" u
      WHERE d."org_unit_id" IS NULL
        AND d."sender_id" = u."id"
        AND u."org_unit_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTS_ORG_UNIT_ID"
      ON "documents" ("org_unit_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "documents"
      ADD CONSTRAINT "FK_DOCUMENTS_ORG_UNIT_ID"
      FOREIGN KEY ("org_unit_id") REFERENCES "org_units"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `).catch(() => undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
      DROP CONSTRAINT IF EXISTS "FK_DOCUMENTS_ORG_UNIT_ID"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_DOCUMENTS_ORG_UNIT_ID"
    `);
    await queryRunner.query(`
      ALTER TABLE "documents"
      DROP COLUMN IF EXISTS "org_unit_id"
    `);
  }
}
