import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class EdmSchemaV120260218234500 implements MigrationInterface {
  name = 'EdmSchemaV120260218234500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createDelegationsTable(queryRunner);
    await this.createDocumentsTable(queryRunner);
    await this.createRoutesTable(queryRunner);
    await this.ensureDocumentsCurrentRouteColumn(queryRunner);
    await this.createStagesTable(queryRunner);
    await this.createStageActionsTable(queryRunner);
    await this.createRegistrySequencesTable(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('edm_document_registry_sequences')) {
      await queryRunner.dropTable('edm_document_registry_sequences');
    }
    if (await queryRunner.hasTable('edm_stage_actions')) {
      await queryRunner.dropTable('edm_stage_actions');
    }
    if (await queryRunner.hasTable('edm_route_stages')) {
      await queryRunner.dropTable('edm_route_stages');
    }
    if (await queryRunner.hasTable('edm_document_routes')) {
      await queryRunner.dropTable('edm_document_routes');
    }
    if (await queryRunner.hasTable('edm_documents')) {
      await queryRunner.dropTable('edm_documents');
    }
    // `iam_delegations` is shared IAM infrastructure and intentionally preserved.
  }

  private async createDelegationsTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('iam_delegations')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'iam_delegations',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'delegator_user_id',
            type: 'int',
          },
          {
            name: 'delegate_user_id',
            type: 'int',
          },
          {
            name: 'scope_type',
            type: 'varchar',
          },
          {
            name: 'scope_department_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'permission_subset',
            type: 'jsonb',
          },
          {
            name: 'valid_from',
            type: 'timestamp',
          },
          {
            name: 'valid_to',
            type: 'timestamp',
          },
          {
            name: 'status',
            type: 'varchar',
          },
          {
            name: 'created_by',
            type: 'int',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys('iam_delegations', [
      new TableForeignKey({
        columnNames: ['delegator_user_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        columnNames: ['delegate_user_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        columnNames: ['scope_department_id'],
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
    ]);

    for (const check of [
      new TableCheck({
        name: 'CHK_IAM_DELEGATIONS_SCOPE_TYPE',
        expression: `"scope_type" IN ('department','global')`,
      }),
      new TableCheck({
        name: 'CHK_IAM_DELEGATIONS_STATUS',
        expression: `"status" IN ('active','revoked','expired')`,
      }),
      new TableCheck({
        name: 'CHK_IAM_DELEGATIONS_VALID_RANGE',
        expression: `"valid_from" < "valid_to"`,
      }),
      new TableCheck({
        name: 'CHK_IAM_DELEGATIONS_DISTINCT_USERS',
        expression: `"delegator_user_id" != "delegate_user_id"`,
      }),
    ]) {
      await queryRunner.createCheckConstraint('iam_delegations', check);
    }

    await queryRunner.createIndices('iam_delegations', [
      new TableIndex({
        name: 'IDX_DELEGATION_DELEGATE_VALIDITY',
        columnNames: ['delegate_user_id', 'valid_from', 'valid_to', 'status'],
      }),
      new TableIndex({
        name: 'IDX_DELEGATION_DELEGATOR_VALIDITY',
        columnNames: ['delegator_user_id', 'valid_from', 'valid_to', 'status'],
      }),
    ]);
  }

  private async createDocumentsTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('edm_documents')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'edm_documents',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'external_number',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'varchar',
          },
          {
            name: 'status',
            type: 'varchar',
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'subject',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'summary',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'resolution_text',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'confidentiality',
            type: 'varchar',
            default: "'public_internal'",
          },
          {
            name: 'department_id',
            type: 'int',
          },
          {
            name: 'creator_id',
            type: 'int',
          },
          {
            name: 'due_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'approved_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'rejected_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'archived_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
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

    await queryRunner.createForeignKeys('edm_documents', [
      new TableForeignKey({
        columnNames: ['department_id'],
        referencedTableName: 'departments',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        columnNames: ['creator_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);

    for (const check of [
      new TableCheck({
        name: 'CHK_EDM_DOCUMENT_STATUS',
        expression:
          `"status" IN ('draft','in_route','approved','rejected','returned_for_revision','archived')`,
      }),
      new TableCheck({
        name: 'CHK_EDM_DOCUMENT_TYPE',
        expression: `"type" IN ('incoming','outgoing','internal','order','resolution')`,
      }),
      new TableCheck({
        name: 'CHK_EDM_DOCUMENT_CONFIDENTIALITY',
        expression:
          `"confidentiality" IN ('public_internal','department_confidential','restricted')`,
      }),
    ]) {
      await queryRunner.createCheckConstraint('edm_documents', check);
    }

    await queryRunner.createIndices('edm_documents', [
      new TableIndex({
        name: 'IDX_EDM_DOC_STATUS_CREATED_AT',
        columnNames: ['status', 'created_at'],
      }),
      new TableIndex({
        name: 'IDX_EDM_DOC_DEPARTMENT_STATUS',
        columnNames: ['department_id', 'status'],
      }),
      new TableIndex({
        name: 'IDX_EDM_DOC_CREATOR_CREATED_AT',
        columnNames: ['creator_id', 'created_at'],
      }),
      new TableIndex({
        name: 'IDX_EDM_DOC_EXTERNAL_NUMBER',
        columnNames: ['external_number'],
        isUnique: true,
      }),
    ]);
  }

  private async createRoutesTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('edm_document_routes')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'edm_document_routes',
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
            name: 'version_no',
            type: 'int',
          },
          {
            name: 'state',
            type: 'varchar',
          },
          {
            name: 'completion_policy',
            type: 'varchar',
            default: "'sequential'",
          },
          {
            name: 'started_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'finished_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'int',
          },
          {
            name: 'override_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        uniques: [
          {
            name: 'UQ_EDM_ROUTE_DOCUMENT_VERSION',
            columnNames: ['document_id', 'version_no'],
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys('edm_document_routes', [
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
    ]);

    for (const check of [
      new TableCheck({
        name: 'CHK_EDM_ROUTE_STATE',
        expression: `"state" IN ('active','completed','rejected','returned','cancelled')`,
      }),
      new TableCheck({
        name: 'CHK_EDM_ROUTE_COMPLETION_POLICY',
        expression:
          `"completion_policy" IN ('sequential','parallel_all_of','parallel_any_of')`,
      }),
    ]) {
      await queryRunner.createCheckConstraint('edm_document_routes', check);
    }

    await queryRunner.createIndices('edm_document_routes', [
      new TableIndex({
        name: 'IDX_EDM_ROUTE_DOCUMENT_ID',
        columnNames: ['document_id'],
      }),
      new TableIndex({
        name: 'IDX_EDM_ROUTE_STATE_CREATED_AT',
        columnNames: ['state', 'created_at'],
      }),
    ]);
  }

  private async ensureDocumentsCurrentRouteColumn(
    queryRunner: QueryRunner,
  ): Promise<void> {
    if (!(await queryRunner.hasColumn('edm_documents', 'current_route_id'))) {
      await queryRunner.addColumn(
        'edm_documents',
        new TableColumn({
          name: 'current_route_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    const edmDocumentsTable = await queryRunner.getTable('edm_documents');
    if (!edmDocumentsTable) {
      return;
    }

    const hasCurrentRouteFk = edmDocumentsTable.foreignKeys.some(
      (foreignKey) =>
        foreignKey.columnNames.length === 1 &&
        foreignKey.columnNames[0] === 'current_route_id' &&
        foreignKey.referencedTableName === 'edm_document_routes',
    );

    if (!hasCurrentRouteFk) {
      await queryRunner.createForeignKey(
        'edm_documents',
        new TableForeignKey({
          columnNames: ['current_route_id'],
          referencedTableName: 'edm_document_routes',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  private async createStagesTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('edm_route_stages')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'edm_route_stages',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'route_id',
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
            name: 'state',
            type: 'varchar',
            default: "'pending'",
          },
          {
            name: 'due_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'started_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
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

    await queryRunner.createForeignKeys('edm_route_stages', [
      new TableForeignKey({
        columnNames: ['route_id'],
        referencedTableName: 'edm_document_routes',
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
        name: 'CHK_EDM_STAGE_TYPE',
        expression: `"stage_type" IN ('review','sign','approve')`,
      }),
      new TableCheck({
        name: 'CHK_EDM_ASSIGNEE_TYPE',
        expression: `"assignee_type" IN ('user','role','department_head')`,
      }),
      new TableCheck({
        name: 'CHK_EDM_STAGE_STATE',
        expression:
          `"state" IN ('pending','in_progress','approved','rejected','returned','skipped','expired')`,
      }),
      new TableCheck({
        name: 'CHK_EDM_ASSIGNEE_CONSISTENCY',
        expression:
          `(("assignee_type" = 'user' AND "assignee_user_id" IS NOT NULL) OR ` +
          `("assignee_type" = 'role' AND "assignee_role" IS NOT NULL) OR ` +
          `("assignee_type" = 'department_head' AND "assignee_department_id" IS NOT NULL))`,
      }),
    ]) {
      await queryRunner.createCheckConstraint('edm_route_stages', check);
    }

    await queryRunner.createIndices('edm_route_stages', [
      new TableIndex({
        name: 'IDX_EDM_STAGE_ROUTE_ORDER',
        columnNames: ['route_id', 'order_no'],
      }),
      new TableIndex({
        name: 'IDX_EDM_STAGE_ROUTE_STATE',
        columnNames: ['route_id', 'state'],
      }),
      new TableIndex({
        name: 'IDX_EDM_STAGE_ASSIGNEE_USER_STATE',
        columnNames: ['assignee_user_id', 'state'],
      }),
    ]);
  }

  private async createStageActionsTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('edm_stage_actions')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'edm_stage_actions',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'stage_id',
            type: 'int',
          },
          {
            name: 'document_id',
            type: 'int',
          },
          {
            name: 'action',
            type: 'varchar',
          },
          {
            name: 'action_result_state',
            type: 'varchar',
          },
          {
            name: 'actor_user_id',
            type: 'int',
          },
          {
            name: 'on_behalf_of_user_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'comment_text',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reason_code',
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
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys('edm_stage_actions', [
      new TableForeignKey({
        columnNames: ['stage_id'],
        referencedTableName: 'edm_route_stages',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['document_id'],
        referencedTableName: 'edm_documents',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['actor_user_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        columnNames: ['on_behalf_of_user_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    for (const check of [
      new TableCheck({
        name: 'CHK_EDM_ACTION',
        expression:
          `"action" IN ('approved','rejected','returned_for_revision','commented','override_approved','override_rejected')`,
      }),
      new TableCheck({
        name: 'CHK_EDM_ACTION_RESULT_STATE',
        expression: `"action_result_state" IN ('approved','rejected','returned','commented')`,
      }),
    ]) {
      await queryRunner.createCheckConstraint('edm_stage_actions', check);
    }

    await queryRunner.createIndices('edm_stage_actions', [
      new TableIndex({
        name: 'IDX_EDM_ACTION_STAGE_CREATED_AT',
        columnNames: ['stage_id', 'created_at'],
      }),
      new TableIndex({
        name: 'IDX_EDM_ACTION_DOCUMENT_CREATED_AT',
        columnNames: ['document_id', 'created_at'],
      }),
      new TableIndex({
        name: 'IDX_EDM_ACTION_ACTOR_CREATED_AT',
        columnNames: ['actor_user_id', 'created_at'],
      }),
    ]);
  }

  private async createRegistrySequencesTable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    if (await queryRunner.hasTable('edm_document_registry_sequences')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'edm_document_registry_sequences',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'department_id',
            type: 'int',
          },
          {
            name: 'doc_type',
            type: 'varchar',
          },
          {
            name: 'year',
            type: 'int',
          },
          {
            name: 'last_value',
            type: 'int',
            default: 0,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        uniques: [
          {
            name: 'UQ_EDM_REGISTRY_SCOPE',
            columnNames: ['department_id', 'doc_type', 'year'],
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'edm_document_registry_sequences',
      new TableForeignKey({
        columnNames: ['department_id'],
        referencedTableName: 'departments',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createIndex(
      'edm_document_registry_sequences',
      new TableIndex({
        name: 'IDX_EDM_REGISTRY_SCOPE',
        columnNames: ['department_id', 'doc_type', 'year'],
        isUnique: true,
      }),
    );
  }
}
