import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CallsSchema20260223010000 implements MigrationInterface {
  name = 'CallsSchema20260223010000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('calls');
    if (tableExists) return;

    await queryRunner.createTable(
      new Table({
        name: 'calls',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'initiator_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'receiver_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'has_video',
            type: 'boolean',
            default: false,
          },
          {
            name: 'started_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'ended_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'duration_sec',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'calls',
      new TableForeignKey({
        name: 'FK_CALLS_INITIATOR',
        columnNames: ['initiator_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'calls',
      new TableForeignKey({
        name: 'FK_CALLS_RECEIVER',
        columnNames: ['receiver_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndex(
      'calls',
      new TableIndex({
        name: 'IDX_CALLS_INITIATOR',
        columnNames: ['initiator_id', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'calls',
      new TableIndex({
        name: 'IDX_CALLS_RECEIVER',
        columnNames: ['receiver_id', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'calls',
      new TableIndex({
        name: 'IDX_CALLS_STATUS',
        columnNames: ['status'],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('calls');
    if (!tableExists) return;

    await queryRunner.dropIndex('calls', 'IDX_CALLS_STATUS');
    await queryRunner.dropIndex('calls', 'IDX_CALLS_RECEIVER');
    await queryRunner.dropIndex('calls', 'IDX_CALLS_INITIATOR');
    await queryRunner.dropForeignKey('calls', 'FK_CALLS_RECEIVER');
    await queryRunner.dropForeignKey('calls', 'FK_CALLS_INITIATOR');
    await queryRunner.dropTable('calls');
  }
}
