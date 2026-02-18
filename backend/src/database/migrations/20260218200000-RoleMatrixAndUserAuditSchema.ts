import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class RoleMatrixAndUserAuditSchema20260218200000
  implements MigrationInterface
{
  name = 'RoleMatrixAndUserAuditSchema20260218200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasRoleProfiles = await queryRunner.hasTable('role_permission_profiles');
    if (!hasRoleProfiles) {
      await queryRunner.createTable(
        new Table({
          name: 'role_permission_profiles',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'role',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'permissions',
              type: 'json',
              default: "'[]'",
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
              name: 'UQ_ROLE_PERMISSION_PROFILE_ROLE',
              columnNames: ['role'],
            },
          ],
        }),
      );
    }

    const hasUserAudit = await queryRunner.hasTable('user_change_audit_logs');
    if (!hasUserAudit) {
      await queryRunner.createTable(
        new Table({
          name: 'user_change_audit_logs',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'actor_id',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'target_user_id',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'action',
              type: 'varchar',
            },
            {
              name: 'success',
              type: 'boolean',
              default: true,
            },
            {
              name: 'changes',
              type: 'json',
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

      await queryRunner.createForeignKeys('user_change_audit_logs', [
        new TableForeignKey({
          columnNames: ['actor_id'],
          referencedTableName: 'user',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
        new TableForeignKey({
          columnNames: ['target_user_id'],
          referencedTableName: 'user',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      ]);

      await queryRunner.createIndices('user_change_audit_logs', [
        new TableIndex({
          name: 'IDX_USER_CHANGE_AUDIT_ACTOR_ID',
          columnNames: ['actor_id'],
        }),
        new TableIndex({
          name: 'IDX_USER_CHANGE_AUDIT_TARGET_USER_ID',
          columnNames: ['target_user_id'],
        }),
        new TableIndex({
          name: 'IDX_USER_CHANGE_AUDIT_ACTION',
          columnNames: ['action'],
        }),
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('user_change_audit_logs')) {
      await queryRunner.dropTable('user_change_audit_logs');
    }
    if (await queryRunner.hasTable('role_permission_profiles')) {
      await queryRunner.dropTable('role_permission_profiles');
    }
  }
}
