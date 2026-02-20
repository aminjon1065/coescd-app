import { MigrationInterface, QueryRunner } from 'typeorm';

export class EdmDocumentKindsSchema20260219120000 implements MigrationInterface {
  name = 'EdmDocumentKindsSchema20260219120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "edm_document_kinds" (
        "id" SERIAL NOT NULL,
        "code" character varying NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by_id" integer,
        "updated_by_id" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_edm_document_kinds_code" UNIQUE ("code"),
        CONSTRAINT "PK_edm_document_kinds_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "edm_document_kinds"
      ADD CONSTRAINT "FK_edm_document_kinds_created_by"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "edm_document_kinds"
      ADD CONSTRAINT "FK_edm_document_kinds_updated_by"
      FOREIGN KEY ("updated_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "edm_documents"
      ADD COLUMN IF NOT EXISTS "document_kind_id" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "edm_documents"
      ADD CONSTRAINT "FK_edm_documents_document_kind"
      FOREIGN KEY ("document_kind_id") REFERENCES "edm_document_kinds"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_edm_documents_document_kind"
      ON "edm_documents" ("document_kind_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_edm_documents_document_kind"
    `);
    await queryRunner.query(`
      ALTER TABLE "edm_documents"
      DROP CONSTRAINT IF EXISTS "FK_edm_documents_document_kind"
    `);
    await queryRunner.query(`
      ALTER TABLE "edm_documents"
      DROP COLUMN IF EXISTS "document_kind_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "edm_document_kinds"
      DROP CONSTRAINT IF EXISTS "FK_edm_document_kinds_updated_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "edm_document_kinds"
      DROP CONSTRAINT IF EXISTS "FK_edm_document_kinds_created_by"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "edm_document_kinds"
    `);
  }
}
