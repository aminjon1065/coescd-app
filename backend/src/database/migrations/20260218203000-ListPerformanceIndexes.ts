import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class ListPerformanceIndexes20260218203000
  implements MigrationInterface
{
  name = 'ListPerformanceIndexes20260218203000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createIndexIfMissing(
      queryRunner,
      'user',
      new TableIndex({ name: 'IDX_USER_ROLE', columnNames: ['role'] }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'user',
      new TableIndex({ name: 'IDX_USER_IS_ACTIVE', columnNames: ['isActive'] }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'user',
      new TableIndex({
        name: 'IDX_USER_CREATED_AT',
        columnNames: ['created_at'],
      }),
    );

    await this.createIndexIfMissing(
      queryRunner,
      'tasks',
      new TableIndex({ name: 'IDX_TASKS_STATUS', columnNames: ['status'] }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'tasks',
      new TableIndex({
        name: 'IDX_TASKS_CREATOR_ID',
        columnNames: ['creator_id'],
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'tasks',
      new TableIndex({
        name: 'IDX_TASKS_RECEIVER_ID',
        columnNames: ['receiver_id'],
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'tasks',
      new TableIndex({
        name: 'IDX_TASKS_CREATED_AT',
        columnNames: ['created_at'],
      }),
    );

    await this.createIndexIfMissing(
      queryRunner,
      'documents',
      new TableIndex({ name: 'IDX_DOCUMENTS_TYPE', columnNames: ['type'] }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'documents',
      new TableIndex({ name: 'IDX_DOCUMENTS_STATUS', columnNames: ['status'] }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'documents',
      new TableIndex({
        name: 'IDX_DOCUMENTS_SENDER_ID',
        columnNames: ['sender_id'],
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'documents',
      new TableIndex({
        name: 'IDX_DOCUMENTS_RECEIVER_ID',
        columnNames: ['receiver_id'],
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'documents',
      new TableIndex({
        name: 'IDX_DOCUMENTS_DEPARTMENT_ID',
        columnNames: ['department_id'],
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'documents',
      new TableIndex({
        name: 'IDX_DOCUMENTS_CREATED_AT',
        columnNames: ['created_at'],
      }),
    );

    await this.createIndexIfMissing(
      queryRunner,
      'disasters',
      new TableIndex({ name: 'IDX_DISASTERS_STATUS', columnNames: ['status'] }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'disasters',
      new TableIndex({
        name: 'IDX_DISASTERS_SEVERITY',
        columnNames: ['severity'],
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'disasters',
      new TableIndex({
        name: 'IDX_DISASTERS_DEPARTMENT_ID',
        columnNames: ['department_id'],
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'disasters',
      new TableIndex({
        name: 'IDX_DISASTERS_CREATED_AT',
        columnNames: ['created_at'],
      }),
    );

    await this.createIndexIfMissing(
      queryRunner,
      'auth_audit_logs',
      new TableIndex({
        name: 'IDX_AUTH_AUDIT_LOGS_USER_ID',
        columnNames: ['user_id'],
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'auth_audit_logs',
      new TableIndex({
        name: 'IDX_AUTH_AUDIT_LOGS_ACTION',
        columnNames: ['action'],
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'auth_audit_logs',
      new TableIndex({
        name: 'IDX_AUTH_AUDIT_LOGS_CREATED_AT',
        columnNames: ['created_at'],
      }),
    );

    await this.createIndexIfMissing(
      queryRunner,
      'user_change_audit_logs',
      new TableIndex({
        name: 'IDX_USER_CHANGE_AUDIT_CREATED_AT',
        columnNames: ['created_at'],
      }),
    );

    await this.createIndexIfMissing(
      queryRunner,
      'file_access_audit',
      new TableIndex({
        name: 'IDX_FILE_ACCESS_AUDIT_CREATED_AT',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropIndexIfExists(
      queryRunner,
      'file_access_audit',
      'IDX_FILE_ACCESS_AUDIT_CREATED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'user_change_audit_logs',
      'IDX_USER_CHANGE_AUDIT_CREATED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'auth_audit_logs',
      'IDX_AUTH_AUDIT_LOGS_CREATED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'auth_audit_logs',
      'IDX_AUTH_AUDIT_LOGS_ACTION',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'auth_audit_logs',
      'IDX_AUTH_AUDIT_LOGS_USER_ID',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'disasters',
      'IDX_DISASTERS_CREATED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'disasters',
      'IDX_DISASTERS_DEPARTMENT_ID',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'disasters',
      'IDX_DISASTERS_SEVERITY',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'disasters',
      'IDX_DISASTERS_STATUS',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'documents',
      'IDX_DOCUMENTS_CREATED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'documents',
      'IDX_DOCUMENTS_DEPARTMENT_ID',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'documents',
      'IDX_DOCUMENTS_RECEIVER_ID',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'documents',
      'IDX_DOCUMENTS_SENDER_ID',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'documents',
      'IDX_DOCUMENTS_STATUS',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'documents',
      'IDX_DOCUMENTS_TYPE',
    );
    await this.dropIndexIfExists(queryRunner, 'tasks', 'IDX_TASKS_CREATED_AT');
    await this.dropIndexIfExists(queryRunner, 'tasks', 'IDX_TASKS_RECEIVER_ID');
    await this.dropIndexIfExists(queryRunner, 'tasks', 'IDX_TASKS_CREATOR_ID');
    await this.dropIndexIfExists(queryRunner, 'tasks', 'IDX_TASKS_STATUS');
    await this.dropIndexIfExists(queryRunner, 'user', 'IDX_USER_CREATED_AT');
    await this.dropIndexIfExists(queryRunner, 'user', 'IDX_USER_IS_ACTIVE');
    await this.dropIndexIfExists(queryRunner, 'user', 'IDX_USER_ROLE');
  }

  private async createIndexIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    index: TableIndex,
  ): Promise<void> {
    if (!(await queryRunner.hasTable(tableName))) {
      return;
    }
    const table = await queryRunner.getTable(tableName);
    if (!table) {
      return;
    }
    const exists = table.indices.some(
      (tableIndex) => tableIndex.name === index.name,
    );
    if (!exists) {
      await queryRunner.createIndex(tableName, index);
    }
  }

  private async dropIndexIfExists(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
  ): Promise<void> {
    if (!(await queryRunner.hasTable(tableName))) {
      return;
    }
    const table = await queryRunner.getTable(tableName);
    if (!table) {
      return;
    }
    const exists = table.indices.some((index) => index.name === indexName);
    if (exists) {
      await queryRunner.dropIndex(tableName, indexName);
    }
  }
}
