import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class EdmPerformanceIndexesV220260219080000
  implements MigrationInterface
{
  name = 'EdmPerformanceIndexesV220260219080000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createIndexIfMissing(
      queryRunner,
      'edm_documents',
      new TableIndex({
        name: 'IDX_EDM_DOC_DELETED_CREATED_AT',
        columnNames: ['deleted_at', 'created_at'],
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'edm_documents',
      new TableIndex({
        name: 'IDX_EDM_DOC_DEPT_STATUS_CREATED_AT',
        columnNames: ['department_id', 'status', 'created_at'],
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'edm_documents',
      new TableIndex({
        name: 'IDX_EDM_DOC_TYPE_STATUS_CREATED_AT',
        columnNames: ['type', 'status', 'created_at'],
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'edm_documents',
      new TableIndex({
        name: 'IDX_EDM_DOC_CURRENT_ROUTE_ID',
        columnNames: ['current_route_id'],
      }),
    );

    await this.createIndexIfMissing(
      queryRunner,
      'edm_document_routes',
      new TableIndex({
        name: 'IDX_EDM_ROUTE_CREATED_AT',
        columnNames: ['created_at'],
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'edm_document_routes',
      new TableIndex({
        name: 'IDX_EDM_ROUTE_DOCUMENT_VERSION',
        columnNames: ['document_id', 'version_no'],
      }),
    );

    await this.createIndexIfMissing(
      queryRunner,
      'edm_route_stages',
      new TableIndex({
        name: 'IDX_EDM_STAGE_STATE_DUE_AT',
        columnNames: ['state', 'due_at'],
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'edm_route_stages',
      new TableIndex({
        name: 'IDX_EDM_STAGE_ASSIGNEE_USER_STATE_DUE_AT',
        columnNames: ['assignee_user_id', 'state', 'due_at'],
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'edm_route_stages',
      new TableIndex({
        name: 'IDX_EDM_STAGE_ASSIGNEE_DEPT_STATE_DUE_AT',
        columnNames: [
          'assignee_department_id',
          'assignee_type',
          'state',
          'due_at',
        ],
      }),
    );

    await this.createIndexIfMissing(
      queryRunner,
      'edm_alerts',
      new TableIndex({
        name: 'IDX_EDM_ALERT_RECIPIENT_CREATED_AT',
        columnNames: ['recipient_user_id', 'created_at'],
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'edm_alerts',
      new TableIndex({
        name: 'IDX_EDM_ALERT_RECIPIENT_KIND_STATUS_CREATED',
        columnNames: ['recipient_user_id', 'kind', 'status', 'created_at'],
      }),
    );

    await this.createIndexIfMissing(
      queryRunner,
      'edm_registration_journal',
      new TableIndex({
        name: 'IDX_EDM_REG_JOURNAL_TYPE_STATUS_REGISTERED_AT',
        columnNames: ['journal_type', 'status', 'registered_at'],
      }),
    );

    await this.createIndexIfMissing(
      queryRunner,
      'edm_route_templates',
      new TableIndex({
        name: 'IDX_EDM_ROUTE_TEMPLATE_ACTIVE_UPDATED_AT',
        columnNames: ['is_active', 'updated_at'],
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'edm_document_templates',
      new TableIndex({
        name: 'IDX_EDM_DOCUMENT_TEMPLATE_ACTIVE_UPDATED_AT',
        columnNames: ['is_active', 'updated_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropIndexIfExists(
      queryRunner,
      'edm_document_templates',
      'IDX_EDM_DOCUMENT_TEMPLATE_ACTIVE_UPDATED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'edm_route_templates',
      'IDX_EDM_ROUTE_TEMPLATE_ACTIVE_UPDATED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'edm_registration_journal',
      'IDX_EDM_REG_JOURNAL_TYPE_STATUS_REGISTERED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'edm_alerts',
      'IDX_EDM_ALERT_RECIPIENT_KIND_STATUS_CREATED',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'edm_alerts',
      'IDX_EDM_ALERT_RECIPIENT_CREATED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'edm_route_stages',
      'IDX_EDM_STAGE_ASSIGNEE_DEPT_STATE_DUE_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'edm_route_stages',
      'IDX_EDM_STAGE_ASSIGNEE_USER_STATE_DUE_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'edm_route_stages',
      'IDX_EDM_STAGE_STATE_DUE_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'edm_document_routes',
      'IDX_EDM_ROUTE_DOCUMENT_VERSION',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'edm_document_routes',
      'IDX_EDM_ROUTE_CREATED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'edm_documents',
      'IDX_EDM_DOC_CURRENT_ROUTE_ID',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'edm_documents',
      'IDX_EDM_DOC_TYPE_STATUS_CREATED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'edm_documents',
      'IDX_EDM_DOC_DEPT_STATUS_CREATED_AT',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'edm_documents',
      'IDX_EDM_DOC_DELETED_CREATED_AT',
    );
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
