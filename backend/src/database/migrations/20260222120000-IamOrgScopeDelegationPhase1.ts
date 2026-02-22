import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class IamOrgScopeDelegationPhase120260222120000
  implements MigrationInterface
{
  name = 'IamOrgScopeDelegationPhase120260222120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS ltree`);

    await this.createOrgUnitsTable(queryRunner);
    await this.extendUsersTable(queryRunner);
    await this.extendDelegationsTable(queryRunner);
    await this.createBusinessRolesAndProfiles(queryRunner);
    await this.extendAuthAuditLogs(queryRunner);
    await this.seedBusinessRolesAndProfiles(queryRunner);
  }

  public async down(): Promise<void> {
    // Intentionally non-destructive for production safety and backward compatibility.
  }

  private async createOrgUnitsTable(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('org_units'))) {
      await queryRunner.createTable(
        new Table({
          name: 'org_units',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'name',
              type: 'varchar',
            },
            {
              name: 'type',
              type: 'varchar',
            },
            {
              name: 'parent_id',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'path',
              type: 'ltree',
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
        'org_units',
        new TableForeignKey({
          columnNames: ['parent_id'],
          referencedTableName: 'org_units',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );

      await queryRunner.createCheckConstraint(
        'org_units',
        new TableCheck({
          name: 'CHK_ORG_UNITS_TYPE',
          expression: `"type" IN ('committee','department','division')`,
        }),
      );
    }

    const table = await queryRunner.getTable('org_units');
    if (!table) {
      return;
    }

    if (!table.indices.some((idx) => idx.name === 'IDX_ORG_UNITS_PARENT_ID')) {
      await queryRunner.createIndex(
        'org_units',
        new TableIndex({
          name: 'IDX_ORG_UNITS_PARENT_ID',
          columnNames: ['parent_id'],
        }),
      );
    }

    if (!table.indices.some((idx) => idx.name === 'IDX_ORG_UNITS_TYPE')) {
      await queryRunner.createIndex(
        'org_units',
        new TableIndex({
          name: 'IDX_ORG_UNITS_TYPE',
          columnNames: ['type'],
        }),
      );
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ORG_UNITS_PATH_GIST"
      ON "org_units" USING GIST ("path")
    `);
  }

  private async extendUsersTable(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('user', 'business_role'))) {
      await queryRunner.addColumn(
        'user',
        new TableColumn({
          name: 'business_role',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    if (!(await queryRunner.hasColumn('user', 'org_unit_id'))) {
      await queryRunner.addColumn(
        'user',
        new TableColumn({
          name: 'org_unit_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    const table = await queryRunner.getTable('user');
    if (!table) {
      return;
    }

    if (
      !table.foreignKeys.some((fk) =>
        fk.columnNames.includes('org_unit_id'),
      ) &&
      (await queryRunner.hasTable('org_units'))
    ) {
      await queryRunner.createForeignKey(
        'user',
        new TableForeignKey({
          columnNames: ['org_unit_id'],
          referencedTableName: 'org_units',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }

    if (!table.indices.some((idx) => idx.name === 'IDX_USER_BUSINESS_ROLE')) {
      await queryRunner.createIndex(
        'user',
        new TableIndex({
          name: 'IDX_USER_BUSINESS_ROLE',
          columnNames: ['business_role'],
        }),
      );
    }

    if (!table.indices.some((idx) => idx.name === 'IDX_USER_ORG_UNIT_ID')) {
      await queryRunner.createIndex(
        'user',
        new TableIndex({
          name: 'IDX_USER_ORG_UNIT_ID',
          columnNames: ['org_unit_id'],
        }),
      );
    }
  }

  private async extendDelegationsTable(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('iam_delegations'))) {
      return;
    }

    if (!(await queryRunner.hasColumn('iam_delegations', 'scope_org_unit_id'))) {
      await queryRunner.addColumn(
        'iam_delegations',
        new TableColumn({
          name: 'scope_org_unit_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    const table = await queryRunner.getTable('iam_delegations');
    if (!table) {
      return;
    }

    if (
      !table.foreignKeys.some((fk) =>
        fk.columnNames.includes('scope_org_unit_id'),
      ) &&
      (await queryRunner.hasTable('org_units'))
    ) {
      await queryRunner.createForeignKey(
        'iam_delegations',
        new TableForeignKey({
          columnNames: ['scope_org_unit_id'],
          referencedTableName: 'org_units',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }

    if (
      !table.indices.some((idx) => idx.name === 'IDX_DELEGATION_SCOPE_ORG_UNIT')
    ) {
      await queryRunner.createIndex(
        'iam_delegations',
        new TableIndex({
          name: 'IDX_DELEGATION_SCOPE_ORG_UNIT',
          columnNames: ['scope_org_unit_id'],
        }),
      );
    }
  }

  private async createBusinessRolesAndProfiles(
    queryRunner: QueryRunner,
  ): Promise<void> {
    if (!(await queryRunner.hasTable('iam_business_roles'))) {
      await queryRunner.createTable(
        new Table({
          name: 'iam_business_roles',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'code',
              type: 'varchar',
            },
            {
              name: 'name',
              type: 'varchar',
            },
            {
              name: 'default_scope',
              type: 'varchar',
            },
            {
              name: 'is_active',
              type: 'boolean',
              default: true,
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
          uniques: [{ name: 'UQ_IAM_BUSINESS_ROLES_CODE', columnNames: ['code'] }],
        }),
      );
      await queryRunner.createCheckConstraint(
        'iam_business_roles',
        new TableCheck({
          name: 'CHK_IAM_BUSINESS_ROLES_DEFAULT_SCOPE',
          expression: `"default_scope" IN ('self','department','subtree','global')`,
        }),
      );
    }

    if (!(await queryRunner.hasTable('permission_profiles'))) {
      await queryRunner.createTable(
        new Table({
          name: 'permission_profiles',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'code',
              type: 'varchar',
            },
            {
              name: 'name',
              type: 'varchar',
            },
            {
              name: 'permissions',
              type: 'jsonb',
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
          uniques: [{ name: 'UQ_PERMISSION_PROFILES_CODE', columnNames: ['code'] }],
        }),
      );
    }

    if (!(await queryRunner.hasTable('business_role_permission_profiles'))) {
      await queryRunner.createTable(
        new Table({
          name: 'business_role_permission_profiles',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'business_role_id',
              type: 'int',
            },
            {
              name: 'permission_profile_id',
              type: 'int',
            },
            {
              name: 'priority',
              type: 'int',
              default: 100,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'now()',
            },
          ],
          uniques: [
            {
              name: 'UQ_BUSINESS_ROLE_PERMISSION_PROFILE_PAIR',
              columnNames: ['business_role_id', 'permission_profile_id'],
            },
          ],
        }),
      );

      await queryRunner.createForeignKeys('business_role_permission_profiles', [
        new TableForeignKey({
          columnNames: ['business_role_id'],
          referencedTableName: 'iam_business_roles',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
        new TableForeignKey({
          columnNames: ['permission_profile_id'],
          referencedTableName: 'permission_profiles',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      ]);
    }

    const userTable = await queryRunner.getTable('user');
    if (
      userTable &&
      !userTable.foreignKeys.some((fk) => fk.columnNames.includes('business_role'))
    ) {
      await queryRunner.createForeignKey(
        'user',
        new TableForeignKey({
          columnNames: ['business_role'],
          referencedTableName: 'iam_business_roles',
          referencedColumnNames: ['code'],
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  private async extendAuthAuditLogs(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('auth_audit_logs'))) {
      return;
    }

    if (!(await queryRunner.hasColumn('auth_audit_logs', 'actor_user_id'))) {
      await queryRunner.addColumn(
        'auth_audit_logs',
        new TableColumn({
          name: 'actor_user_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    if (
      !(await queryRunner.hasColumn('auth_audit_logs', 'on_behalf_of_user_id'))
    ) {
      await queryRunner.addColumn(
        'auth_audit_logs',
        new TableColumn({
          name: 'on_behalf_of_user_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    const table = await queryRunner.getTable('auth_audit_logs');
    if (!table) {
      return;
    }

    if (
      !table.foreignKeys.some((fk) => fk.columnNames.includes('actor_user_id'))
    ) {
      await queryRunner.createForeignKey(
        'auth_audit_logs',
        new TableForeignKey({
          columnNames: ['actor_user_id'],
          referencedTableName: 'user',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }

    if (
      !table.foreignKeys.some((fk) =>
        fk.columnNames.includes('on_behalf_of_user_id'),
      )
    ) {
      await queryRunner.createForeignKey(
        'auth_audit_logs',
        new TableForeignKey({
          columnNames: ['on_behalf_of_user_id'],
          referencedTableName: 'user',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  private async seedBusinessRolesAndProfiles(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "iam_business_roles" ("code", "name", "default_scope", "is_active")
      SELECT v.code, v.name, v.default_scope, true
      FROM (
        VALUES
          ('CHAIRPERSON', 'Chairperson', 'global'),
          ('FIRST_DEPUTY', 'First Deputy', 'global'),
          ('DEPUTY', 'Deputy', 'subtree'),
          ('CHANCELLERY', 'Chancellery', 'global'),
          ('DEPARTMENT_HEAD', 'Department Head', 'department'),
          ('DIVISION_HEAD', 'Division Head', 'subtree'),
          ('EMPLOYEE', 'Employee', 'self'),
          ('ANALYST', 'Analyst', 'subtree')
      ) AS v(code, name, default_scope)
      WHERE NOT EXISTS (
        SELECT 1 FROM "iam_business_roles" b WHERE b."code" = v.code
      )
    `);

    await queryRunner.query(`
      INSERT INTO "permission_profiles" ("code", "name", "permissions")
      SELECT v.code, v.name, v.permissions::jsonb
      FROM (
        VALUES
          ('CHAIRPERSON_PROFILE', 'Chairperson Profile', '[]'),
          ('FIRST_DEPUTY_PROFILE', 'First Deputy Profile', '[]'),
          ('DEPUTY_PROFILE', 'Deputy Profile', '[]'),
          ('CHANCELLERY_PROFILE', 'Chancellery Profile', '[]'),
          ('DEPARTMENT_HEAD_PROFILE', 'Department Head Profile', '[]'),
          ('DIVISION_HEAD_PROFILE', 'Division Head Profile', '[]'),
          ('EMPLOYEE_PROFILE', 'Employee Profile', '[]'),
          ('ANALYST_PROFILE', 'Analyst Profile', '[]')
      ) AS v(code, name, permissions)
      WHERE NOT EXISTS (
        SELECT 1 FROM "permission_profiles" p WHERE p."code" = v.code
      )
    `);

    await queryRunner.query(`
      INSERT INTO "business_role_permission_profiles" ("business_role_id", "permission_profile_id", "priority")
      SELECT br.id, pp.id, 100
      FROM (
        VALUES
          ('CHAIRPERSON', 'CHAIRPERSON_PROFILE'),
          ('FIRST_DEPUTY', 'FIRST_DEPUTY_PROFILE'),
          ('DEPUTY', 'DEPUTY_PROFILE'),
          ('CHANCELLERY', 'CHANCELLERY_PROFILE'),
          ('DEPARTMENT_HEAD', 'DEPARTMENT_HEAD_PROFILE'),
          ('DIVISION_HEAD', 'DIVISION_HEAD_PROFILE'),
          ('EMPLOYEE', 'EMPLOYEE_PROFILE'),
          ('ANALYST', 'ANALYST_PROFILE')
      ) AS m(role_code, profile_code)
      JOIN "iam_business_roles" br ON br."code" = m.role_code
      JOIN "permission_profiles" pp ON pp."code" = m.profile_code
      WHERE NOT EXISTS (
        SELECT 1
        FROM "business_role_permission_profiles" x
        WHERE x."business_role_id" = br.id
          AND x."permission_profile_id" = pp.id
      )
    `);
  }
}
