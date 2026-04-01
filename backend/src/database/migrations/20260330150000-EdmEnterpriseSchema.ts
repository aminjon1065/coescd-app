import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enterprise EDM Schema — full collaborative document management system.
 *
 * New tables (all prefixed `edm_v2_` to avoid collisions with legacy `edm_` tables):
 *   edm_v2_documents            — core documents
 *   edm_v2_document_versions    — immutable content snapshots
 *   edm_v2_document_permissions — RBAC + ABAC grants
 *   edm_v2_workflow_definitions — JSON FSM workflow templates
 *   edm_v2_workflow_instances   — per-document workflow runtime state
 *   edm_v2_workflow_assignments — who must act at each step
 *   edm_v2_workflow_transitions — full transition history
 *   edm_v2_comments             — threaded inline comments
 *   edm_v2_attachments          — file attachments with S3 keys
 *   edm_v2_audit_logs           — append-only audit trail
 */
export class EdmEnterpriseSchema20260330150000 implements MigrationInterface {
  name = 'EdmEnterpriseSchema20260330150000';

  async up(queryRunner: QueryRunner): Promise<void> {
    /* ─── UUID extension (safe: CREATE IF NOT EXISTS) ─── */
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    /* ──────────────────────────────────────────────────────────
     * 1. DOCUMENTS
     * ────────────────────────────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE edm_v2_documents (
        id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        title             VARCHAR(500) NOT NULL,
        doc_type          VARCHAR(100) NOT NULL,
        status            VARCHAR(50)  NOT NULL DEFAULT 'draft',
        owner_id          INTEGER      NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        department_id     INTEGER      REFERENCES departments(id) ON DELETE SET NULL,
        current_version   INTEGER      NOT NULL DEFAULT 1,
        is_deleted        BOOLEAN      NOT NULL DEFAULT FALSE,
        locked_by_id      INTEGER      REFERENCES "user"(id) ON DELETE SET NULL,
        locked_at         TIMESTAMPTZ,
        external_ref      VARCHAR(200),
        tags              TEXT[]       NOT NULL DEFAULT '{}',
        metadata          JSONB        NOT NULL DEFAULT '{}',
        created_by_id     INTEGER      NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        updated_by_id     INTEGER      REFERENCES "user"(id) ON DELETE SET NULL,
        created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        archived_at       TIMESTAMPTZ
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_docs_status      ON edm_v2_documents(status)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_docs_owner        ON edm_v2_documents(owner_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_docs_dept         ON edm_v2_documents(department_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_docs_deleted      ON edm_v2_documents(is_deleted)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_docs_tags         ON edm_v2_documents USING GIN(tags)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_docs_metadata     ON edm_v2_documents USING GIN(metadata)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_docs_created_at   ON edm_v2_documents(created_at DESC)`,
    );

    /* ──────────────────────────────────────────────────────────
     * 2. DOCUMENT VERSIONS  (immutable)
     * ────────────────────────────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE edm_v2_document_versions (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id     UUID        NOT NULL REFERENCES edm_v2_documents(id) ON DELETE CASCADE,
        version_number  INTEGER     NOT NULL,
        content         JSONB       NOT NULL DEFAULT '{}',
        change_summary  VARCHAR(500),
        change_type     VARCHAR(50) NOT NULL DEFAULT 'auto_save',
        word_count      INTEGER     NOT NULL DEFAULT 0,
        created_by_id   INTEGER     NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(document_id, version_number)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_vers_doc ON edm_v2_document_versions(document_id, version_number DESC)`,
    );

    /* ──────────────────────────────────────────────────────────
     * 3. DOCUMENT PERMISSIONS
     * ────────────────────────────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE edm_v2_document_permissions (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id     UUID        NOT NULL REFERENCES edm_v2_documents(id) ON DELETE CASCADE,
        principal_type  VARCHAR(20) NOT NULL,
        principal_id    INTEGER     NOT NULL,
        permission      VARCHAR(30) NOT NULL,
        granted_by_id   INTEGER     NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at      TIMESTAMPTZ,
        conditions      JSONB       NOT NULL DEFAULT '{}',
        UNIQUE(document_id, principal_type, principal_id, permission)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_perms_lookup ON edm_v2_document_permissions(document_id, principal_type, principal_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_perms_principal ON edm_v2_document_permissions(principal_type, principal_id)`,
    );

    /* ──────────────────────────────────────────────────────────
     * 4. WORKFLOW DEFINITIONS
     * ────────────────────────────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE edm_v2_workflow_definitions (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        name            VARCHAR(200) NOT NULL,
        version         INTEGER      NOT NULL DEFAULT 1,
        doc_types       TEXT[]       NOT NULL DEFAULT '{}',
        steps           JSONB        NOT NULL DEFAULT '[]',
        sla_config      JSONB        NOT NULL DEFAULT '{}',
        escalation      JSONB        NOT NULL DEFAULT '{}',
        is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
        created_by_id   INTEGER      NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    /* ──────────────────────────────────────────────────────────
     * 5. WORKFLOW INSTANCES
     * ────────────────────────────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE edm_v2_workflow_instances (
        id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id         UUID        NOT NULL UNIQUE REFERENCES edm_v2_documents(id) ON DELETE CASCADE,
        definition_id       UUID        NOT NULL REFERENCES edm_v2_workflow_definitions(id) ON DELETE RESTRICT,
        definition_snapshot JSONB       NOT NULL DEFAULT '{}',
        current_step_id     VARCHAR(100) NOT NULL,
        status              VARCHAR(50)  NOT NULL DEFAULT 'active',
        context             JSONB        NOT NULL DEFAULT '{}',
        started_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        completed_at        TIMESTAMPTZ,
        deadline            TIMESTAMPTZ
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_wi_status ON edm_v2_workflow_instances(status)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_wi_deadline ON edm_v2_workflow_instances(deadline) WHERE status = 'active'`,
    );

    /* ──────────────────────────────────────────────────────────
     * 6. WORKFLOW ASSIGNMENTS  (who must act at a step)
     * ────────────────────────────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE edm_v2_workflow_assignments (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        instance_id     UUID        NOT NULL REFERENCES edm_v2_workflow_instances(id) ON DELETE CASCADE,
        step_id         VARCHAR(100) NOT NULL,
        assignee_id     INTEGER      NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        assigned_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        deadline        TIMESTAMPTZ,
        acted_at        TIMESTAMPTZ,
        action          VARCHAR(50),
        comment         TEXT,
        is_required     BOOLEAN      NOT NULL DEFAULT TRUE,
        UNIQUE(instance_id, step_id, assignee_id)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_wa_assignee ON edm_v2_workflow_assignments(assignee_id) WHERE acted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_wa_instance ON edm_v2_workflow_assignments(instance_id, step_id)`,
    );

    /* ──────────────────────────────────────────────────────────
     * 7. WORKFLOW TRANSITIONS  (full history)
     * ────────────────────────────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE edm_v2_workflow_transitions (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        instance_id     UUID        NOT NULL REFERENCES edm_v2_workflow_instances(id) ON DELETE CASCADE,
        from_step_id    VARCHAR(100) NOT NULL,
        to_step_id      VARCHAR(100),
        action          VARCHAR(50)  NOT NULL,
        actor_id        INTEGER      NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        comment         TEXT,
        metadata        JSONB        NOT NULL DEFAULT '{}',
        transitioned_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_wt_instance ON edm_v2_workflow_transitions(instance_id, transitioned_at DESC)`,
    );

    /* ──────────────────────────────────────────────────────────
     * 8. COMMENTS  (threaded, with anchor)
     * ────────────────────────────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE edm_v2_comments (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id     UUID        NOT NULL REFERENCES edm_v2_documents(id) ON DELETE CASCADE,
        parent_id       UUID        REFERENCES edm_v2_comments(id) ON DELETE CASCADE,
        anchor          JSONB,
        body            TEXT        NOT NULL,
        is_suggestion   BOOLEAN     NOT NULL DEFAULT FALSE,
        suggestion_diff JSONB,
        status          VARCHAR(30) NOT NULL DEFAULT 'open',
        created_by_id   INTEGER     NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_by_id  INTEGER     REFERENCES "user"(id) ON DELETE SET NULL,
        resolved_at     TIMESTAMPTZ
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_comments_doc ON edm_v2_comments(document_id, created_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_comments_parent ON edm_v2_comments(parent_id) WHERE parent_id IS NOT NULL`,
    );

    /* ──────────────────────────────────────────────────────────
     * 9. ATTACHMENTS
     * ────────────────────────────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE edm_v2_attachments (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id     UUID        NOT NULL REFERENCES edm_v2_documents(id) ON DELETE CASCADE,
        version_id      UUID        REFERENCES edm_v2_document_versions(id) ON DELETE SET NULL,
        file_name       VARCHAR(500) NOT NULL,
        file_size       BIGINT       NOT NULL,
        mime_type       VARCHAR(200) NOT NULL,
        storage_key     VARCHAR(1000) NOT NULL,
        checksum        VARCHAR(64)  NOT NULL,
        is_signature    BOOLEAN      NOT NULL DEFAULT FALSE,
        uploaded_by_id  INTEGER      NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        uploaded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_attach_doc ON edm_v2_attachments(document_id)`,
    );

    /* ──────────────────────────────────────────────────────────
     * 10. AUDIT LOGS  (append-only, never DELETE)
     * ────────────────────────────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE edm_v2_audit_logs (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type     VARCHAR(50)  NOT NULL,
        entity_id       VARCHAR(100) NOT NULL,
        action          VARCHAR(100) NOT NULL,
        actor_id        INTEGER      REFERENCES "user"(id) ON DELETE SET NULL,
        actor_ip        VARCHAR(45),
        actor_agent     VARCHAR(500),
        changes         JSONB,
        context         JSONB        NOT NULL DEFAULT '{}',
        occurred_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_audit_entity  ON edm_v2_audit_logs(entity_type, entity_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_audit_actor   ON edm_v2_audit_logs(actor_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_edm_v2_audit_ts      ON edm_v2_audit_logs(occurred_at DESC)`,
    );

    /* ──────────────────────────────────────────────────────────
     * Seed: default workflow definition
     * ────────────────────────────────────────────────────────── */
    await queryRunner.query(`
      INSERT INTO edm_v2_workflow_definitions
        (id, name, version, doc_types, steps, sla_config, escalation, created_by_id)
      VALUES (
        gen_random_uuid(),
        'Стандартное согласование',
        1,
        ARRAY['order','resolution','internal','incoming','outgoing'],
        '[
          {"id":"draft","name":"Черновик","type":"editing","assignee":{"type":"document_owner"},"transitions":[{"action":"submit","to":"review","notify":["reviewer"]}]},
          {"id":"review","name":"Проверка","type":"review","assignee":{"type":"role","value":"Reviewer"},"requireComment":["reject"],"transitions":[{"action":"approve","to":"approval"},{"action":"reject","to":"draft","notify":["document_owner"]}]},
          {"id":"approval","name":"Согласование","type":"approval","assignee":{"type":"role","value":"Approver"},"requireComment":["reject"],"transitions":[{"action":"approve","to":"signed","notify":["document_owner","all_assignees"]},{"action":"reject","to":"review","notify":["document_owner"]}]},
          {"id":"signed","name":"Подписан","type":"terminal"},
          {"id":"archived","name":"Архив","type":"terminal"}
        ]'::jsonb,
        '{"review":2880,"approval":1440}'::jsonb,
        '{}'::jsonb,
        (SELECT id FROM "user" ORDER BY id LIMIT 1)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS edm_v2_audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS edm_v2_attachments`);
    await queryRunner.query(`DROP TABLE IF EXISTS edm_v2_comments`);
    await queryRunner.query(`DROP TABLE IF EXISTS edm_v2_workflow_transitions`);
    await queryRunner.query(`DROP TABLE IF EXISTS edm_v2_workflow_assignments`);
    await queryRunner.query(`DROP TABLE IF EXISTS edm_v2_workflow_instances`);
    await queryRunner.query(`DROP TABLE IF EXISTS edm_v2_workflow_definitions`);
    await queryRunner.query(`DROP TABLE IF EXISTS edm_v2_document_permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS edm_v2_document_versions`);
    await queryRunner.query(`DROP TABLE IF EXISTS edm_v2_documents`);
  }
}
