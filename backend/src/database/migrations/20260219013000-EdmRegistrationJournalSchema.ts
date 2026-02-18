import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class EdmRegistrationJournalSchema20260219013000
  implements MigrationInterface
{
  name = 'EdmRegistrationJournalSchema20260219013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('edm_registration_journal')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'edm_registration_journal',
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
            name: 'journal_type',
            type: 'varchar',
          },
          {
            name: 'registration_number',
            type: 'varchar',
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'registered'",
          },
          {
            name: 'registered_at',
            type: 'timestamp',
          },
          {
            name: 'cancelled_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'int',
          },
          {
            name: 'updated_by',
            type: 'int',
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
        uniques: [
          {
            name: 'UQ_EDM_REG_JOURNAL_DOCUMENT',
            columnNames: ['document_id'],
          },
          {
            name: 'UQ_EDM_REG_JOURNAL_NUMBER',
            columnNames: ['registration_number'],
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys('edm_registration_journal', [
      new TableForeignKey({
        columnNames: ['document_id'],
        referencedTableName: 'edm_documents',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        columnNames: ['updated_by'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createCheckConstraint(
      'edm_registration_journal',
      new TableCheck({
        name: 'CHK_EDM_REG_JOURNAL_TYPE',
        expression: `"journal_type" IN ('incoming','outgoing')`,
      }),
    );
    await queryRunner.createCheckConstraint(
      'edm_registration_journal',
      new TableCheck({
        name: 'CHK_EDM_REG_JOURNAL_STATUS',
        expression: `"status" IN ('registered','cancelled')`,
      }),
    );

    await queryRunner.createIndices('edm_registration_journal', [
      new TableIndex({
        name: 'IDX_EDM_REG_JOURNAL_TYPE_STATUS',
        columnNames: ['journal_type', 'status'],
      }),
      new TableIndex({
        name: 'IDX_EDM_REG_JOURNAL_REGISTERED_AT',
        columnNames: ['registered_at'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('edm_registration_journal')) {
      await queryRunner.dropTable('edm_registration_journal');
    }
  }
}
