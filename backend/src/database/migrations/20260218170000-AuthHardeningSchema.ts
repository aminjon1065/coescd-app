import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class AuthHardeningSchema20260218170000 implements MigrationInterface {
  name = 'AuthHardeningSchema20260218170000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasIsActive = await queryRunner.hasColumn('user', 'isActive');
    if (!hasIsActive) {
      await queryRunner.addColumn(
        'user',
        new TableColumn({
          name: 'isActive',
          type: 'boolean',
          isNullable: false,
          default: true,
        }),
      );
    }

    const hasAuditTable = await queryRunner.hasTable('auth_audit_logs');
    if (!hasAuditTable) {
      await queryRunner.createTable(
        new Table({
          name: 'auth_audit_logs',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'action',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'success',
              type: 'boolean',
              isNullable: false,
              default: false,
            },
            {
              name: 'user_id',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'email',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'ip',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'user_agent',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'reason',
              type: 'varchar',
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
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasAuditTable = await queryRunner.hasTable('auth_audit_logs');
    if (hasAuditTable) {
      await queryRunner.dropTable('auth_audit_logs');
    }

    const hasIsActive = await queryRunner.hasColumn('user', 'isActive');
    if (hasIsActive) {
      await queryRunner.dropColumn('user', 'isActive');
    }
  }
}
