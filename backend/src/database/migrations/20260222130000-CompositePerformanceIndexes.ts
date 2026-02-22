import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * Composite indexes for high-volume list queries at 200+ user scale.
 *
 * Covers the most common multi-filter patterns used by list endpoints:
 *  - Manager-scoped user lists (dept + isActive + created_at)
 *  - Task inbox queries (receiver + status + created_at)
 *  - File scope queries (owner/dept + status + created_at)
 *  - Audit log pagination per user (user_id + created_at)
 */
export class CompositePerformanceIndexes20260222130000
  implements MigrationInterface
{
  name = 'CompositePerformanceIndexes20260222130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // users: manager-scoped list with isActive + created_at ordering
    await this.createIndexIfMissing(
      queryRunner,
      'user',
      new TableIndex({
        name: 'IDX_USER_DEPT_ACTIVE_CREATED_AT',
        columnNames: ['department_id', 'isActive', 'created_at'],
      }),
    );
    // users: admin filter by dept + role + active
    await this.createIndexIfMissing(
      queryRunner,
      'user',
      new TableIndex({
        name: 'IDX_USER_DEPT_ROLE_ACTIVE',
        columnNames: ['department_id', 'role', 'isActive'],
      }),
    );

    // tasks: inbox view — receiver + status + created_at (most common task query)
    await this.createIndexIfMissing(
      queryRunner,
      'tasks',
      new TableIndex({
        name: 'IDX_TASKS_RECEIVER_STATUS_CREATED_AT',
        columnNames: ['receiver_id', 'status', 'created_at'],
      }),
    );
    // tasks: outbox view — creator + status + created_at
    await this.createIndexIfMissing(
      queryRunner,
      'tasks',
      new TableIndex({
        name: 'IDX_TASKS_CREATOR_STATUS_CREATED_AT',
        columnNames: ['creator_id', 'status', 'created_at'],
      }),
    );

    // files: owner-scoped active files list
    await this.createIndexIfMissing(
      queryRunner,
      'files',
      new TableIndex({
        name: 'IDX_FILES_OWNER_STATUS_CREATED_AT',
        columnNames: ['owner_id', 'status', 'created_at'],
      }),
    );
    // files: department-scoped active files list
    await this.createIndexIfMissing(
      queryRunner,
      'files',
      new TableIndex({
        name: 'IDX_FILES_DEPT_STATUS_CREATED_AT',
        columnNames: ['department_id', 'status', 'created_at'],
      }),
    );

    // auth_audit_logs: per-user paginated audit trail
    await this.createIndexIfMissing(
      queryRunner,
      'auth_audit_logs',
      new TableIndex({
        name: 'IDX_AUTH_AUDIT_USER_CREATED_AT',
        columnNames: ['user_id', 'created_at'],
      }),
    );

    // user_change_audit_logs: per-user paginated change history
    await this.createIndexIfMissing(
      queryRunner,
      'user_change_audit_logs',
      new TableIndex({
        name: 'IDX_USER_CHANGE_AUDIT_TARGET_CREATED_AT',
        columnNames: ['target_user_id', 'created_at'],
      }),
    );

    // file_access_audit: per-file and per-user access history
    await this.createIndexIfMissing(
      queryRunner,
      'file_access_audit',
      new TableIndex({
        name: 'IDX_FILE_ACCESS_AUDIT_USER_CREATED_AT',
        columnNames: ['actor_id', 'created_at'],
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'file_access_audit',
      new TableIndex({
        name: 'IDX_FILE_ACCESS_AUDIT_FILE_CREATED_AT',
        columnNames: ['file_id', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropIndexIfExists(
      queryRunner,
      'file_access_audit',
      'IDX_FILE_ACCESS_AUDIT_FILE_CREATED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'file_access_audit',
      'IDX_FILE_ACCESS_AUDIT_USER_CREATED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'user_change_audit_logs',
      'IDX_USER_CHANGE_AUDIT_TARGET_CREATED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'auth_audit_logs',
      'IDX_AUTH_AUDIT_USER_CREATED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'files',
      'IDX_FILES_DEPT_STATUS_CREATED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'files',
      'IDX_FILES_OWNER_STATUS_CREATED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'tasks',
      'IDX_TASKS_CREATOR_STATUS_CREATED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'tasks',
      'IDX_TASKS_RECEIVER_STATUS_CREATED_AT',
    );
    await this.dropIndexIfExists(queryRunner, 'user', 'IDX_USER_DEPT_ROLE_ACTIVE');
    await this.dropIndexIfExists(
      queryRunner,
      'user',
      'IDX_USER_DEPT_ACTIVE_CREATED_AT',
    );
  }

  private async createIndexIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    index: TableIndex,
  ): Promise<void> {
    if (!(await queryRunner.hasTable(tableName))) return;
    const table = await queryRunner.getTable(tableName);
    if (!table) return;
    const exists = table.indices.some((i) => i.name === index.name);
    if (!exists) {
      await queryRunner.createIndex(tableName, index);
    }
  }

  private async dropIndexIfExists(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
  ): Promise<void> {
    if (!(await queryRunner.hasTable(tableName))) return;
    const table = await queryRunner.getTable(tableName);
    if (!table) return;
    const exists = table.indices.some((i) => i.name === indexName);
    if (exists) {
      await queryRunner.dropIndex(tableName, indexName);
    }
  }
}
