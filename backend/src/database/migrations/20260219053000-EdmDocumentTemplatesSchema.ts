import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class EdmDocumentTemplatesSchema20260219053000
  implements MigrationInterface
{
  name = 'EdmDocumentTemplatesSchema20260219053000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('edm_document_templates'))) {
      await queryRunner.createTable(
        new Table({
          name: 'edm_document_templates',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'name', type: 'varchar' },
            { name: 'description', type: 'text', isNullable: true },
            { name: 'document_type', type: 'varchar' },
            { name: 'scope_type', type: 'varchar' },
            { name: 'department_id', type: 'int', isNullable: true },
            { name: 'is_active', type: 'boolean', default: true },
            { name: 'created_by', type: 'int' },
            { name: 'updated_by', type: 'int', isNullable: true },
            { name: 'created_at', type: 'timestamp', default: 'now()' },
            { name: 'updated_at', type: 'timestamp', default: 'now()' },
            { name: 'deleted_at', type: 'timestamp', isNullable: true },
          ],
        }),
      );

      await queryRunner.createForeignKeys('edm_document_templates', [
        new TableForeignKey({
          columnNames: ['department_id'],
          referencedTableName: 'departments',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
        new TableForeignKey({
          columnNames: ['created_by'],
          referencedTableName: 'user',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
        }),
        new TableForeignKey({
          columnNames: ['updated_by'],
          referencedTableName: 'user',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      ]);

      await queryRunner.createCheckConstraint(
        'edm_document_templates',
        new TableCheck({
          name: 'CHK_EDM_DOCUMENT_TEMPLATE_DOC_TYPE',
          expression: `"document_type" IN ('incoming','outgoing','internal','order','resolution')`,
        }),
      );

      await queryRunner.createCheckConstraint(
        'edm_document_templates',
        new TableCheck({
          name: 'CHK_EDM_DOCUMENT_TEMPLATE_SCOPE_TYPE',
          expression: `"scope_type" IN ('department','global')`,
        }),
      );

      await queryRunner.createIndices('edm_document_templates', [
        new TableIndex({
          name: 'IDX_EDM_DOCUMENT_TEMPLATE_SCOPE_ACTIVE',
          columnNames: ['scope_type', 'is_active'],
        }),
        new TableIndex({
          name: 'IDX_EDM_DOCUMENT_TEMPLATE_DEPARTMENT_ACTIVE',
          columnNames: ['department_id', 'is_active'],
        }),
      ]);
    }

    if (!(await queryRunner.hasTable('edm_document_template_fields'))) {
      await queryRunner.createTable(
        new Table({
          name: 'edm_document_template_fields',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'template_id', type: 'int' },
            { name: 'field_key', type: 'varchar' },
            { name: 'label', type: 'varchar' },
            { name: 'field_type', type: 'varchar', default: "'text'" },
            { name: 'is_required', type: 'boolean', default: false },
            { name: 'is_readonly', type: 'boolean', default: false },
            { name: 'default_value', type: 'text', isNullable: true },
            { name: 'sort_order', type: 'int', default: 100 },
            { name: 'validation_rules', type: 'jsonb', isNullable: true },
            { name: 'created_at', type: 'timestamp', default: 'now()' },
          ],
          uniques: [
            {
              name: 'UQ_EDM_DOCUMENT_TEMPLATE_FIELD',
              columnNames: ['template_id', 'field_key'],
            },
          ],
        }),
      );

      await queryRunner.createForeignKey(
        'edm_document_template_fields',
        new TableForeignKey({
          columnNames: ['template_id'],
          referencedTableName: 'edm_document_templates',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createCheckConstraint(
        'edm_document_template_fields',
        new TableCheck({
          name: 'CHK_EDM_DOCUMENT_TEMPLATE_FIELD_KEY',
          expression: `"field_key" IN ('title','subject','summary','resolutionText','dueAt','confidentiality','type')`,
        }),
      );

      await queryRunner.createIndices('edm_document_template_fields', [
        new TableIndex({
          name: 'IDX_EDM_DOCUMENT_TEMPLATE_FIELD_TEMPLATE',
          columnNames: ['template_id'],
        }),
        new TableIndex({
          name: 'IDX_EDM_DOCUMENT_TEMPLATE_FIELD_SORT',
          columnNames: ['template_id', 'sort_order'],
        }),
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('edm_document_template_fields')) {
      await queryRunner.dropTable('edm_document_template_fields');
    }
    if (await queryRunner.hasTable('edm_document_templates')) {
      await queryRunner.dropTable('edm_document_templates');
    }
  }
}
