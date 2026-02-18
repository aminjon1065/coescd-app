import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class EdmDocumentTaskLinksSchema20260219023000
  implements MigrationInterface
{
  name = 'EdmDocumentTaskLinksSchema20260219023000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('edm_document_task_links')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'edm_document_task_links',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'document_id',
            type: 'int',
          },
          {
            name: 'task_id',
            type: 'int',
          },
          {
            name: 'created_by',
            type: 'int',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        uniques: [
          {
            name: 'UQ_EDM_DOCUMENT_TASK_LINK',
            columnNames: ['document_id', 'task_id'],
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys('edm_document_task_links', [
      new TableForeignKey({
        columnNames: ['document_id'],
        referencedTableName: 'edm_documents',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['task_id'],
        referencedTableName: 'tasks',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);

    await queryRunner.createIndices('edm_document_task_links', [
      new TableIndex({
        name: 'IDX_EDM_DOC_TASK_LINK_DOCUMENT',
        columnNames: ['document_id'],
      }),
      new TableIndex({
        name: 'IDX_EDM_DOC_TASK_LINK_TASK',
        columnNames: ['task_id'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('edm_document_task_links')) {
      await queryRunner.dropTable('edm_document_task_links');
    }
  }
}
