import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CoreDomainExplicitBaseline20260218165000
  implements MigrationInterface
{
  name = 'CoreDomainExplicitBaseline20260218165000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createUsersTable(queryRunner);
    await this.createDepartmentsTable(queryRunner);
    await this.ensureUserDepartmentRelation(queryRunner);
    await this.createTasksTable(queryRunner);
    await this.createDocumentsTable(queryRunner);
    await this.createDisasterCategoriesTable(queryRunner);
    await this.createDisasterTypesTable(queryRunner);
    await this.createDisastersTable(queryRunner);
  }

  public async down(): Promise<void> {
    // No-op by design. This baseline migration is idempotent and can run on
    // environments where core tables already exist and contain data.
  }

  private async createUsersTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('user')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'user',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'password',
            type: 'varchar',
          },
          {
            name: 'avatar',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'position',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'isVerified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'role',
            type: 'varchar',
            default: "'regular'",
          },
          {
            name: 'permissions',
            type: 'json',
            default: "'[]'",
          },
          {
            name: 'department_id',
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
      }),
    );
  }

  private async createDepartmentsTable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    if (await queryRunner.hasTable('departments')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'departments',
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
            name: 'chief_id',
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
      }),
    );

    await queryRunner.createForeignKeys('departments', [
      new TableForeignKey({
        columnNames: ['parent_id'],
        referencedTableName: 'departments',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        columnNames: ['chief_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createIndices('departments', [
      new TableIndex({
        name: 'IDX_DEPARTMENTS_PARENT_ID',
        columnNames: ['parent_id'],
      }),
      new TableIndex({ name: 'IDX_DEPARTMENTS_TYPE', columnNames: ['type'] }),
    ]);
  }

  private async ensureUserDepartmentRelation(
    queryRunner: QueryRunner,
  ): Promise<void> {
    if (!(await queryRunner.hasTable('user'))) {
      return;
    }

    const hasDepartmentColumn = await queryRunner.hasColumn(
      'user',
      'department_id',
    );
    if (!hasDepartmentColumn) {
      await queryRunner.query(
        'ALTER TABLE "user" ADD COLUMN "department_id" int',
      );
    }

    const userTable = await queryRunner.getTable('user');
    if (!userTable) {
      return;
    }

    const hasDepartmentFk = userTable.foreignKeys.some(
      (fk) =>
        fk.columnNames.length === 1 &&
        fk.columnNames[0] === 'department_id' &&
        fk.referencedTableName === 'departments',
    );

    if (!hasDepartmentFk) {
      await queryRunner.createForeignKey(
        'user',
        new TableForeignKey({
          columnNames: ['department_id'],
          referencedTableName: 'departments',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }

    const hasDepartmentIndex = userTable.indices.some(
      (index) => index.name === 'IDX_USER_DEPARTMENT_ID',
    );

    if (!hasDepartmentIndex) {
      await queryRunner.createIndex(
        'user',
        new TableIndex({
          name: 'IDX_USER_DEPARTMENT_ID',
          columnNames: ['department_id'],
        }),
      );
    }
  }

  private async createTasksTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('tasks')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'tasks',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'creator_id',
            type: 'int',
          },
          {
            name: 'receiver_id',
            type: 'int',
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'new'",
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

    await queryRunner.createForeignKeys('tasks', [
      new TableForeignKey({
        columnNames: ['creator_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        columnNames: ['receiver_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);

    await queryRunner.createIndices('tasks', [
      new TableIndex({ name: 'IDX_TASKS_STATUS', columnNames: ['status'] }),
      new TableIndex({
        name: 'IDX_TASKS_CREATOR_ID',
        columnNames: ['creator_id'],
      }),
      new TableIndex({
        name: 'IDX_TASKS_RECEIVER_ID',
        columnNames: ['receiver_id'],
      }),
      new TableIndex({
        name: 'IDX_TASKS_CREATED_AT',
        columnNames: ['created_at'],
      }),
    ]);
  }

  private async createDocumentsTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('documents')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'documents',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'type',
            type: 'varchar',
            default: "'internal'",
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'draft'",
          },
          {
            name: 'sender_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'receiver_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'department_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'file_name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'file_path',
            type: 'varchar',
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
      }),
    );

    await queryRunner.createForeignKeys('documents', [
      new TableForeignKey({
        columnNames: ['sender_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        columnNames: ['receiver_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        columnNames: ['department_id'],
        referencedTableName: 'departments',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createIndices('documents', [
      new TableIndex({ name: 'IDX_DOCUMENTS_TYPE', columnNames: ['type'] }),
      new TableIndex({ name: 'IDX_DOCUMENTS_STATUS', columnNames: ['status'] }),
      new TableIndex({
        name: 'IDX_DOCUMENTS_DEPARTMENT_ID',
        columnNames: ['department_id'],
      }),
      new TableIndex({
        name: 'IDX_DOCUMENTS_CREATED_AT',
        columnNames: ['created_at'],
      }),
    ]);
  }

  private async createDisasterCategoriesTable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    if (await queryRunner.hasTable('disaster_categories')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'disaster_categories',
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
        ],
      }),
    );
  }

  private async createDisasterTypesTable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    if (await queryRunner.hasTable('disaster_types')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'disaster_types',
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
            name: 'category_id',
            type: 'int',
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'disaster_types',
      new TableForeignKey({
        columnNames: ['category_id'],
        referencedTableName: 'disaster_categories',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'disaster_types',
      new TableIndex({
        name: 'IDX_DISASTER_TYPES_CATEGORY_ID',
        columnNames: ['category_id'],
      }),
    );
  }

  private async createDisastersTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('disasters')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'disasters',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'location',
            type: 'varchar',
          },
          {
            name: 'latitude',
            type: 'float',
          },
          {
            name: 'longitude',
            type: 'float',
          },
          {
            name: 'severity',
            type: 'varchar',
            default: "'medium'",
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'active'",
          },
          {
            name: 'type_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'department_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'casualties',
            type: 'int',
            default: 0,
          },
          {
            name: 'affected_people',
            type: 'int',
            default: 0,
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

    await queryRunner.createForeignKeys('disasters', [
      new TableForeignKey({
        columnNames: ['type_id'],
        referencedTableName: 'disaster_types',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        columnNames: ['department_id'],
        referencedTableName: 'departments',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createIndices('disasters', [
      new TableIndex({ name: 'IDX_DISASTERS_STATUS', columnNames: ['status'] }),
      new TableIndex({
        name: 'IDX_DISASTERS_SEVERITY',
        columnNames: ['severity'],
      }),
      new TableIndex({
        name: 'IDX_DISASTERS_DEPARTMENT_ID',
        columnNames: ['department_id'],
      }),
      new TableIndex({
        name: 'IDX_DISASTERS_CREATED_AT',
        columnNames: ['created_at'],
      }),
    ]);
  }
}
