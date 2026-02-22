import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class ChatSchema20260223000000 implements MigrationInterface {
  name = 'ChatSchema20260223000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('chat_messages');
    if (!hasTable) {
      await queryRunner.createTable(
        new Table({
          name: 'chat_messages',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'room', type: 'varchar', length: '100' },
            { name: 'sender_id', type: 'int', isNullable: true },
            { name: 'content', type: 'text' },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'now()',
            },
          ],
        }),
        true,
      );

      if (await queryRunner.hasTable('user')) {
        await queryRunner.createForeignKey(
          'chat_messages',
          new TableForeignKey({
            columnNames: ['sender_id'],
            referencedTableName: 'user',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
        );
      }

      await queryRunner.createIndices('chat_messages', [
        new TableIndex({
          name: 'IDX_CHAT_MESSAGES_ROOM_CREATED',
          columnNames: ['room', 'created_at'],
        }),
        new TableIndex({
          name: 'IDX_CHAT_MESSAGES_SENDER',
          columnNames: ['sender_id'],
        }),
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('chat_messages')) {
      await queryRunner.dropTable('chat_messages', true, true, true);
    }
  }
}
