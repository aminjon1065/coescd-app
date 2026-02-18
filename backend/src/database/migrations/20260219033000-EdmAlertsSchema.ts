import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class EdmAlertsSchema20260219033000 implements MigrationInterface {
  name = 'EdmAlertsSchema20260219033000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('edm_alerts')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'edm_alerts',
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
            name: 'stage_id',
            type: 'int',
          },
          {
            name: 'recipient_user_id',
            type: 'int',
          },
          {
            name: 'kind',
            type: 'varchar',
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'unread'",
          },
          {
            name: 'message',
            type: 'text',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'read_at',
            type: 'timestamp',
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

    await queryRunner.createForeignKeys('edm_alerts', [
      new TableForeignKey({
        columnNames: ['document_id'],
        referencedTableName: 'edm_documents',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['stage_id'],
        referencedTableName: 'edm_route_stages',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['recipient_user_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createCheckConstraint(
      'edm_alerts',
      new TableCheck({
        name: 'CHK_EDM_ALERT_KIND',
        expression: `"kind" IN ('due_soon','overdue','escalation')`,
      }),
    );

    await queryRunner.createCheckConstraint(
      'edm_alerts',
      new TableCheck({
        name: 'CHK_EDM_ALERT_STATUS',
        expression: `"status" IN ('unread','read')`,
      }),
    );

    await queryRunner.createIndices('edm_alerts', [
      new TableIndex({
        name: 'IDX_EDM_ALERT_RECIPIENT_STATUS',
        columnNames: ['recipient_user_id', 'status'],
      }),
      new TableIndex({
        name: 'IDX_EDM_ALERT_STAGE_KIND',
        columnNames: ['stage_id', 'kind'],
      }),
      new TableIndex({
        name: 'IDX_EDM_ALERT_CREATED_AT',
        columnNames: ['created_at'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('edm_alerts')) {
      await queryRunner.dropTable('edm_alerts');
    }
  }
}
