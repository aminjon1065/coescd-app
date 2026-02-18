import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class BulkImportOperationsAudit20260218223000
  implements MigrationInterface
{
  name = 'BulkImportOperationsAudit20260218223000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('bulk_import_operations')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'bulk_import_operations',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'operation_id',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'session_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'actor_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'varchar',
          },
          {
            name: 'status',
            type: 'varchar',
          },
          {
            name: 'mode',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'idempotency_key',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'total_rows',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'valid_rows',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'invalid_rows',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'created_count',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'updated_count',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'skipped_count',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'failed_count',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'warnings_count',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'errors_count',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'details',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'ip',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'bulk_import_operations',
      new TableForeignKey({
        columnNames: ['actor_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndices('bulk_import_operations', [
      new TableIndex({
        name: 'IDX_BULK_IMPORT_OPS_CREATED_AT',
        columnNames: ['created_at'],
      }),
      new TableIndex({
        name: 'IDX_BULK_IMPORT_OPS_ACTOR_ID',
        columnNames: ['actor_id'],
      }),
      new TableIndex({
        name: 'IDX_BULK_IMPORT_OPS_TYPE',
        columnNames: ['type'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('bulk_import_operations')) {
      await queryRunner.dropTable('bulk_import_operations');
    }
  }
}
