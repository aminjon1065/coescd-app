import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class EdmRouteTemplatesSchema20260219003000
  implements MigrationInterface
{
  name = 'EdmRouteTemplatesSchema20260219003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('edm_route_templates'))) {
      await queryRunner.createTable(
        new Table({
          name: 'edm_route_templates',
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
              name: 'description',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'scope_type',
              type: 'varchar',
            },
            {
              name: 'department_id',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'is_active',
              type: 'boolean',
              default: true,
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
            {
              name: 'deleted_at',
              type: 'timestamp',
              isNullable: true,
            },
          ],
        }),
      );

      await queryRunner.createForeignKeys('edm_route_templates', [
        new TableForeignKey({
          columnNames: ['department_id'],
          referencedTableName: 'departments',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
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
        'edm_route_templates',
        new TableCheck({
          name: 'CHK_EDM_ROUTE_TEMPLATE_SCOPE_TYPE',
          expression: `"scope_type" IN ('department','global')`,
        }),
      );

      await queryRunner.createIndices('edm_route_templates', [
        new TableIndex({
          name: 'IDX_EDM_ROUTE_TEMPLATE_SCOPE_ACTIVE',
          columnNames: ['scope_type', 'is_active'],
        }),
        new TableIndex({
          name: 'IDX_EDM_ROUTE_TEMPLATE_DEPARTMENT_ACTIVE',
          columnNames: ['department_id', 'is_active'],
        }),
      ]);
    }

    if (!(await queryRunner.hasTable('edm_route_template_stages'))) {
      await queryRunner.createTable(
        new Table({
          name: 'edm_route_template_stages',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'template_id',
              type: 'int',
            },
            {
              name: 'order_no',
              type: 'int',
            },
            {
              name: 'stage_group_no',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'stage_type',
              type: 'varchar',
            },
            {
              name: 'assignee_type',
              type: 'varchar',
            },
            {
              name: 'assignee_user_id',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'assignee_role',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'assignee_department_id',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'due_in_hours',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'escalation_policy',
              type: 'jsonb',
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

      await queryRunner.createForeignKeys('edm_route_template_stages', [
        new TableForeignKey({
          columnNames: ['template_id'],
          referencedTableName: 'edm_route_templates',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
        new TableForeignKey({
          columnNames: ['assignee_user_id'],
          referencedTableName: 'user',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
        new TableForeignKey({
          columnNames: ['assignee_department_id'],
          referencedTableName: 'departments',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      ]);

      for (const check of [
        new TableCheck({
          name: 'CHK_EDM_ROUTE_TEMPLATE_STAGE_TYPE',
          expression: `"stage_type" IN ('review','sign','approve')`,
        }),
        new TableCheck({
          name: 'CHK_EDM_ROUTE_TEMPLATE_ASSIGNEE_TYPE',
          expression: `"assignee_type" IN ('user','role','department_head')`,
        }),
        new TableCheck({
          name: 'CHK_EDM_ROUTE_TEMPLATE_ASSIGNEE_CONSISTENCY',
          expression:
            `(("assignee_type" = 'user' AND "assignee_user_id" IS NOT NULL) OR ` +
            `("assignee_type" = 'role' AND "assignee_role" IS NOT NULL) OR ` +
            `("assignee_type" = 'department_head'))`,
        }),
      ]) {
        await queryRunner.createCheckConstraint(
          'edm_route_template_stages',
          check,
        );
      }

      await queryRunner.createIndices('edm_route_template_stages', [
        new TableIndex({
          name: 'IDX_EDM_ROUTE_TEMPLATE_STAGE_TEMPLATE_ORDER',
          columnNames: ['template_id', 'order_no'],
        }),
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('edm_route_template_stages')) {
      await queryRunner.dropTable('edm_route_template_stages');
    }
    if (await queryRunner.hasTable('edm_route_templates')) {
      await queryRunner.dropTable('edm_route_templates');
    }
  }
}
