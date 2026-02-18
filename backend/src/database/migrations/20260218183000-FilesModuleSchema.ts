import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class FilesModuleSchema20260218183000 implements MigrationInterface {
  name = 'FilesModuleSchema20260218183000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasFilesTable = await queryRunner.hasTable('files');
    if (!hasFilesTable) {
      await queryRunner.createTable(
        new Table({
          name: 'files',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'original_name',
              type: 'varchar',
            },
            {
              name: 'storage_key',
              type: 'varchar',
              isUnique: true,
            },
            {
              name: 'bucket',
              type: 'varchar',
            },
            {
              name: 'mime_type',
              type: 'varchar',
            },
            {
              name: 'size_bytes',
              type: 'bigint',
            },
            {
              name: 'checksum_sha256',
              type: 'varchar',
            },
            {
              name: 'owner_id',
              type: 'int',
            },
            {
              name: 'department_id',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'status',
              type: 'varchar',
              default: "'active'",
            },
            {
              name: 'deleted_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'now()',
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'now()',
            },
          ],
        }),
      );

      await queryRunner.createForeignKeys('files', [
        new TableForeignKey({
          columnNames: ['owner_id'],
          referencedTableName: 'user',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
        }),
        new TableForeignKey({
          columnNames: ['department_id'],
          referencedTableName: 'departments',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      ]);

      await queryRunner.createIndices('files', [
        new TableIndex({
          name: 'IDX_FILES_OWNER_ID',
          columnNames: ['owner_id'],
        }),
        new TableIndex({
          name: 'IDX_FILES_DEPARTMENT_ID',
          columnNames: ['department_id'],
        }),
        new TableIndex({
          name: 'IDX_FILES_STATUS',
          columnNames: ['status'],
        }),
      ]);
    }

    const hasLinksTable = await queryRunner.hasTable('file_links');
    if (!hasLinksTable) {
      await queryRunner.createTable(
        new Table({
          name: 'file_links',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'file_id',
              type: 'int',
            },
            {
              name: 'resource_type',
              type: 'varchar',
            },
            {
              name: 'resource_id',
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
              name: 'UQ_FILE_LINK_RESOURCE',
              columnNames: ['file_id', 'resource_type', 'resource_id'],
            },
          ],
        }),
      );

      await queryRunner.createForeignKeys('file_links', [
        new TableForeignKey({
          columnNames: ['file_id'],
          referencedTableName: 'files',
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

      await queryRunner.createIndices('file_links', [
        new TableIndex({
          name: 'IDX_FILE_LINKS_FILE_ID',
          columnNames: ['file_id'],
        }),
        new TableIndex({
          name: 'IDX_FILE_LINKS_RESOURCE',
          columnNames: ['resource_type', 'resource_id'],
        }),
      ]);
    }

    const hasAuditTable = await queryRunner.hasTable('file_access_audit');
    if (!hasAuditTable) {
      await queryRunner.createTable(
        new Table({
          name: 'file_access_audit',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'file_id',
              type: 'int',
            },
            {
              name: 'actor_id',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'action',
              type: 'varchar',
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
              name: 'success',
              type: 'boolean',
              default: false,
            },
            {
              name: 'reason',
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

      await queryRunner.createForeignKeys('file_access_audit', [
        new TableForeignKey({
          columnNames: ['file_id'],
          referencedTableName: 'files',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
        new TableForeignKey({
          columnNames: ['actor_id'],
          referencedTableName: 'user',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      ]);

      await queryRunner.createIndices('file_access_audit', [
        new TableIndex({
          name: 'IDX_FILE_ACCESS_AUDIT_FILE_ID',
          columnNames: ['file_id'],
        }),
        new TableIndex({
          name: 'IDX_FILE_ACCESS_AUDIT_ACTOR_ID',
          columnNames: ['actor_id'],
        }),
        new TableIndex({
          name: 'IDX_FILE_ACCESS_AUDIT_ACTION',
          columnNames: ['action'],
        }),
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('file_access_audit')) {
      await queryRunner.dropTable('file_access_audit');
    }
    if (await queryRunner.hasTable('file_links')) {
      await queryRunner.dropTable('file_links');
    }
    if (await queryRunner.hasTable('files')) {
      await queryRunner.dropTable('files');
    }
  }
}
