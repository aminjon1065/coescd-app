import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class EdmDocumentHistorySchema20260219110000
  implements MigrationInterface
{
  name = 'EdmDocumentHistorySchema20260219110000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('edm_document_timeline_events'))) {
      await queryRunner.createTable(
        new Table({
          name: 'edm_document_timeline_events',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'document_id', type: 'int' },
            { name: 'event_type', type: 'varchar' },
            { name: 'actor_user_id', type: 'int' },
            { name: 'from_user_id', type: 'int', isNullable: true },
            { name: 'to_user_id', type: 'int', isNullable: true },
            { name: 'from_role', type: 'varchar', isNullable: true },
            { name: 'to_role', type: 'varchar', isNullable: true },
            { name: 'responsible_user_id', type: 'int', isNullable: true },
            { name: 'parent_event_id', type: 'int', isNullable: true },
            { name: 'thread_id', type: 'varchar', isNullable: true },
            { name: 'comment_text', type: 'text', isNullable: true },
            { name: 'meta', type: 'jsonb', isNullable: true },
            { name: 'created_at', type: 'timestamp', default: 'now()' },
          ],
        }),
      );

      await queryRunner.createForeignKeys('edm_document_timeline_events', [
        new TableForeignKey({
          columnNames: ['document_id'],
          referencedTableName: 'edm_documents',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
        new TableForeignKey({
          columnNames: ['actor_user_id'],
          referencedTableName: 'user',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
        }),
        new TableForeignKey({
          columnNames: ['from_user_id'],
          referencedTableName: 'user',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
        new TableForeignKey({
          columnNames: ['to_user_id'],
          referencedTableName: 'user',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
        new TableForeignKey({
          columnNames: ['responsible_user_id'],
          referencedTableName: 'user',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
        new TableForeignKey({
          columnNames: ['parent_event_id'],
          referencedTableName: 'edm_document_timeline_events',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      ]);

      await queryRunner.createCheckConstraint(
        'edm_document_timeline_events',
        new TableCheck({
          name: 'CHK_EDM_TIMELINE_EVENT_TYPE',
          expression: `"event_type" IN ('created','forwarded','responsible_assigned','responsible_reassigned','reply_sent','route_action','override','archived')`,
        }),
      );

      await queryRunner.createIndices('edm_document_timeline_events', [
        new TableIndex({
          name: 'IDX_EDM_TIMELINE_DOCUMENT_CREATED_AT',
          columnNames: ['document_id', 'created_at'],
        }),
        new TableIndex({
          name: 'IDX_EDM_TIMELINE_THREAD_CREATED_AT',
          columnNames: ['thread_id', 'created_at'],
        }),
        new TableIndex({
          name: 'IDX_EDM_TIMELINE_EVENT_TYPE_CREATED_AT',
          columnNames: ['event_type', 'created_at'],
        }),
      ]);
    }

    if (!(await queryRunner.hasTable('edm_document_replies'))) {
      await queryRunner.createTable(
        new Table({
          name: 'edm_document_replies',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'document_id', type: 'int' },
            { name: 'timeline_event_id', type: 'int' },
            { name: 'sender_user_id', type: 'int' },
            { name: 'parent_reply_id', type: 'int', isNullable: true },
            { name: 'thread_id', type: 'varchar' },
            { name: 'message_text', type: 'text' },
            { name: 'created_at', type: 'timestamp', default: 'now()' },
          ],
        }),
      );

      await queryRunner.createForeignKeys('edm_document_replies', [
        new TableForeignKey({
          columnNames: ['document_id'],
          referencedTableName: 'edm_documents',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
        new TableForeignKey({
          columnNames: ['timeline_event_id'],
          referencedTableName: 'edm_document_timeline_events',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
        new TableForeignKey({
          columnNames: ['sender_user_id'],
          referencedTableName: 'user',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
        }),
        new TableForeignKey({
          columnNames: ['parent_reply_id'],
          referencedTableName: 'edm_document_replies',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      ]);

      await queryRunner.createIndices('edm_document_replies', [
        new TableIndex({
          name: 'IDX_EDM_REPLY_DOCUMENT_CREATED_AT',
          columnNames: ['document_id', 'created_at'],
        }),
        new TableIndex({
          name: 'IDX_EDM_REPLY_THREAD_CREATED_AT',
          columnNames: ['thread_id', 'created_at'],
        }),
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('edm_document_replies')) {
      await queryRunner.dropTable('edm_document_replies');
    }
    if (await queryRunner.hasTable('edm_document_timeline_events')) {
      await queryRunner.dropTable('edm_document_timeline_events');
    }
  }
}
