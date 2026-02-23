import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class FileSharesSchema20260223030000 implements MigrationInterface {
  name = 'FileSharesSchema20260223030000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('file_shares');
    if (tableExists) return;

    await queryRunner.createTable(
      new Table({
        name: 'file_shares',
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
            isNullable: false,
          },
          {
            name: 'shared_with_user_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'shared_with_department_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'granted_by_id',
            type: 'int',
            isNullable: false,
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
      'file_shares',
      new TableForeignKey({
        name: 'FK_FILE_SHARES_FILE',
        columnNames: ['file_id'],
        referencedTableName: 'files',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'file_shares',
      new TableForeignKey({
        name: 'FK_FILE_SHARES_USER',
        columnNames: ['shared_with_user_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'file_shares',
      new TableForeignKey({
        name: 'FK_FILE_SHARES_DEPT',
        columnNames: ['shared_with_department_id'],
        referencedTableName: 'departments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'file_shares',
      new TableForeignKey({
        name: 'FK_FILE_SHARES_GRANTED_BY',
        columnNames: ['granted_by_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'file_shares',
      new TableIndex({
        name: 'IDX_FILE_SHARES_FILE',
        columnNames: ['file_id'],
      }),
    );

    await queryRunner.createIndex(
      'file_shares',
      new TableIndex({
        name: 'IDX_FILE_SHARES_USER',
        columnNames: ['shared_with_user_id'],
      }),
    );

    await queryRunner.createIndex(
      'file_shares',
      new TableIndex({
        name: 'IDX_FILE_SHARES_DEPT',
        columnNames: ['shared_with_department_id'],
      }),
    );

    // Partial unique indices — prevent duplicate shares
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_FILE_SHARES_USER"
       ON file_shares (file_id, shared_with_user_id)
       WHERE shared_with_user_id IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_FILE_SHARES_DEPT"
       ON file_shares (file_id, shared_with_department_id)
       WHERE shared_with_department_id IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('file_shares');
    if (!tableExists) return;

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_FILE_SHARES_DEPT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_FILE_SHARES_USER"`);

    await queryRunner.dropIndex('file_shares', 'IDX_FILE_SHARES_DEPT');
    await queryRunner.dropIndex('file_shares', 'IDX_FILE_SHARES_USER');
    await queryRunner.dropIndex('file_shares', 'IDX_FILE_SHARES_FILE');

    await queryRunner.dropForeignKey('file_shares', 'FK_FILE_SHARES_GRANTED_BY');
    await queryRunner.dropForeignKey('file_shares', 'FK_FILE_SHARES_DEPT');
    await queryRunner.dropForeignKey('file_shares', 'FK_FILE_SHARES_USER');
    await queryRunner.dropForeignKey('file_shares', 'FK_FILE_SHARES_FILE');

    await queryRunner.dropTable('file_shares');
  }
}
