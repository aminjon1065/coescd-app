import { MigrationInterface, QueryRunner } from 'typeorm';

export class TaskManagementSchema20260401100000 implements MigrationInterface {
  name = 'TaskManagementSchema20260401100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Task boards ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tm_task_boards (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(200) NOT NULL,
        description   TEXT,
        department_id INT REFERENCES departments(id) ON DELETE SET NULL,
        created_by    INT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        visibility    VARCHAR(20) NOT NULL DEFAULT 'department',
        is_default    BOOLEAN NOT NULL DEFAULT false,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tm_task_board_columns (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        board_id    UUID NOT NULL REFERENCES tm_task_boards(id) ON DELETE CASCADE,
        name        VARCHAR(100) NOT NULL,
        status      VARCHAR(30) NOT NULL,
        order_index INT NOT NULL DEFAULT 0,
        color       VARCHAR(7) NOT NULL DEFAULT '#94a3b8',
        wip_limit   INT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_board_columns_board
        ON tm_task_board_columns(board_id)
    `);

    // ── Task number sequence ─────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS tm_task_number_seq START WITH 1 INCREMENT BY 1`,
    );

    // ── Core tasks table ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tm_tasks (
        id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_number             VARCHAR(30) UNIQUE NOT NULL,
        title                   VARCHAR(500) NOT NULL,
        description             TEXT,
        type                    VARCHAR(30) NOT NULL DEFAULT 'simple',
        status                  VARCHAR(30) NOT NULL DEFAULT 'created',
        priority                VARCHAR(20) NOT NULL DEFAULT 'medium',
        visibility              VARCHAR(30) NOT NULL DEFAULT 'department',
        parent_task_id          UUID REFERENCES tm_tasks(id) ON DELETE SET NULL,
        created_by              INT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        department_id           INT REFERENCES departments(id) ON DELETE SET NULL,
        assignee_user_id        INT REFERENCES "user"(id) ON DELETE SET NULL,
        assignee_department_id  INT REFERENCES departments(id) ON DELETE SET NULL,
        assignee_role           VARCHAR(100),
        due_at                  TIMESTAMPTZ,
        started_at              TIMESTAMPTZ,
        completed_at            TIMESTAMPTZ,
        closed_at               TIMESTAMPTZ,
        sla_deadline            TIMESTAMPTZ,
        sla_breached            BOOLEAN NOT NULL DEFAULT false,
        estimated_hours         DECIMAL(6,2),
        actual_hours            DECIMAL(6,2),
        linked_document_id      INT REFERENCES edm_documents(id) ON DELETE SET NULL,
        linked_document_version INT,
        linked_incident_id      INT REFERENCES disasters(id) ON DELETE SET NULL,
        workflow_instance_id    UUID,
        board_id                UUID REFERENCES tm_task_boards(id) ON DELETE SET NULL,
        board_column_id         UUID REFERENCES tm_task_board_columns(id) ON DELETE SET NULL,
        order_index             INT NOT NULL DEFAULT 0,
        tags                    TEXT[] NOT NULL DEFAULT '{}',
        metadata                JSONB NOT NULL DEFAULT '{}',
        blocked_reason          TEXT,
        rejection_reason        TEXT,
        deleted_at              TIMESTAMPTZ,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_tasks_status
        ON tm_tasks(status) WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_tasks_priority
        ON tm_tasks(priority) WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_tasks_department
        ON tm_tasks(department_id) WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_tasks_assignee_user
        ON tm_tasks(assignee_user_id) WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_tasks_created_by
        ON tm_tasks(created_by) WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_tasks_due_at
        ON tm_tasks(due_at) WHERE deleted_at IS NULL
    `);
    // Partial index optimised for the SLA scheduler hot query
    // (due_at < now() AND sla_breached = false AND deleted_at IS NULL)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_tasks_sla_check
        ON tm_tasks(due_at)
        WHERE sla_breached = false AND deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_tasks_linked_doc
        ON tm_tasks(linked_document_id) WHERE linked_document_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_tasks_linked_incident
        ON tm_tasks(linked_incident_id) WHERE linked_incident_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_tasks_parent
        ON tm_tasks(parent_task_id) WHERE parent_task_id IS NOT NULL
    `);
    // Board index is partial to exclude soft-deleted tasks
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_tasks_board
        ON tm_tasks(board_id, board_column_id, order_index)
        WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_tasks_task_number
        ON tm_tasks(task_number)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_tasks_tags
        ON tm_tasks USING GIN(tags)
        WHERE deleted_at IS NULL
    `);

    // ── Task assignments ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tm_task_assignments (
        id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id                   UUID NOT NULL REFERENCES tm_tasks(id) ON DELETE CASCADE,
        assigned_to_user_id       INT REFERENCES "user"(id) ON DELETE SET NULL,
        assigned_to_department_id INT REFERENCES departments(id) ON DELETE SET NULL,
        assigned_to_role          VARCHAR(100),
        assigned_by               INT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        assigned_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
        is_active                 BOOLEAN NOT NULL DEFAULT true,
        notes                     TEXT,
        response_deadline         TIMESTAMPTZ,
        delegated_from_id         UUID REFERENCES tm_task_assignments(id) ON DELETE SET NULL,
        CONSTRAINT chk_tm_assignment_target
          CHECK (
            assigned_to_user_id       IS NOT NULL OR
            assigned_to_department_id IS NOT NULL OR
            assigned_to_role          IS NOT NULL
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_assignments_task
        ON tm_task_assignments(task_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_assignments_user
        ON tm_task_assignments(assigned_to_user_id) WHERE is_active = true
    `);

    // ── Delegation chains ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tm_task_delegation_chains (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id      UUID NOT NULL REFERENCES tm_tasks(id) ON DELETE CASCADE,
        from_user_id INT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        to_user_id   INT REFERENCES "user"(id) ON DELETE SET NULL,
        to_dept_id   INT REFERENCES departments(id) ON DELETE SET NULL,
        to_role      VARCHAR(100),
        delegated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        reason       TEXT,
        level        INT NOT NULL DEFAULT 1,
        is_revoked   BOOLEAN NOT NULL DEFAULT false,
        revoked_at   TIMESTAMPTZ,
        CONSTRAINT chk_tm_delegation_target
          CHECK (
            to_user_id IS NOT NULL OR
            to_dept_id IS NOT NULL OR
            to_role    IS NOT NULL
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_delegation_task
        ON tm_task_delegation_chains(task_id)
    `);
    // Composite index for "find current depth" query (ORDER BY level DESC)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_delegation_task_level
        ON tm_task_delegation_chains(task_id, level DESC)
    `);

    // ── Task history (audit trail) ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tm_task_history (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id         UUID NOT NULL REFERENCES tm_tasks(id) ON DELETE CASCADE,
        actor_id        INT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        action          VARCHAR(50) NOT NULL,
        previous_value  JSONB,
        new_value       JSONB NOT NULL DEFAULT '{}',
        ip_address      VARCHAR(45),
        user_agent      TEXT,
        notes           TEXT,
        occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_history_task
        ON tm_task_history(task_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_history_actor
        ON tm_task_history(actor_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_history_occurred_at
        ON tm_task_history(occurred_at DESC)
    `);

    // ── Task comments ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tm_task_comments (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id          UUID NOT NULL REFERENCES tm_tasks(id) ON DELETE CASCADE,
        author_id        INT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        content          TEXT NOT NULL,
        parent_id        UUID REFERENCES tm_task_comments(id) ON DELETE CASCADE,
        mention_user_ids INT[] NOT NULL DEFAULT '{}',
        is_edited        BOOLEAN NOT NULL DEFAULT false,
        edited_at        TIMESTAMPTZ,
        deleted_at       TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_comments_task
        ON tm_task_comments(task_id) WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_comments_parent
        ON tm_task_comments(parent_id) WHERE parent_id IS NOT NULL
    `);

    // ── Checklist items ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tm_task_checklist_items (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id      UUID NOT NULL REFERENCES tm_tasks(id) ON DELETE CASCADE,
        title        VARCHAR(500) NOT NULL,
        is_completed BOOLEAN NOT NULL DEFAULT false,
        completed_by INT REFERENCES "user"(id) ON DELETE SET NULL,
        completed_at TIMESTAMPTZ,
        order_index  INT NOT NULL DEFAULT 0,
        assigned_to  INT REFERENCES "user"(id) ON DELETE SET NULL,
        due_at       TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_checklist_task
        ON tm_task_checklist_items(task_id)
    `);

    // ── Escalation rules ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tm_task_escalation_rules (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name                  VARCHAR(200) NOT NULL,
        trigger_type          VARCHAR(30) NOT NULL,
        trigger_hours         INT NOT NULL,
        priority_filter       VARCHAR(20),
        department_id         INT REFERENCES departments(id) ON DELETE SET NULL,
        escalate_to           VARCHAR(30) NOT NULL,
        escalate_to_user_id   INT REFERENCES "user"(id) ON DELETE SET NULL,
        escalate_to_role      VARCHAR(100),
        notification_channels TEXT[] NOT NULL DEFAULT '{in_app,websocket}',
        is_active             BOOLEAN NOT NULL DEFAULT true,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse creation order (children before parents)
    await queryRunner.query(`DROP TABLE IF EXISTS tm_task_escalation_rules CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS tm_task_checklist_items CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS tm_task_comments CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS tm_task_history CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS tm_task_delegation_chains CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS tm_task_assignments CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS tm_tasks CASCADE`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS tm_task_number_seq`);
    await queryRunner.query(`DROP TABLE IF EXISTS tm_task_board_columns CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS tm_task_boards CASCADE`);
  }
}
