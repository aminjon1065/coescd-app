import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class EdmSavedFiltersSchema20260219043000 implements MigrationInterface {
  name = 'EdmSavedFiltersSchema20260219043000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('edm_saved_filters')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'edm_saved_filters',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'int',
          },
          {
            name: 'scope',
            type: 'varchar',
            default: "'documents'",
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'criteria',
            type: 'jsonb',
          },
          {
            name: 'is_default',
            type: 'boolean',
            default: false,
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

    await queryRunner.createForeignKey(
      'edm_saved_filters',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createCheckConstraint(
      'edm_saved_filters',
      new TableCheck({
        name: 'CHK_EDM_SAVED_FILTER_SCOPE',
        expression: `"scope" IN ('documents')`,
      }),
    );

    await queryRunner.createIndices('edm_saved_filters', [
      new TableIndex({
        name: 'IDX_EDM_SAVED_FILTER_USER_SCOPE',
        columnNames: ['user_id', 'scope'],
      }),
      new TableIndex({
        name: 'IDX_EDM_SAVED_FILTER_USER_DEFAULT',
        columnNames: ['user_id', 'scope', 'is_default'],
      }),
      new TableIndex({
        name: 'IDX_EDM_SAVED_FILTER_USER_NAME',
        columnNames: ['user_id', 'name'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('edm_saved_filters')) {
      await queryRunner.dropTable('edm_saved_filters');
    }
  }
}
