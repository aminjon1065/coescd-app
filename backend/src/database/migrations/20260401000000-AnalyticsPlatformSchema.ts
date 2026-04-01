import { MigrationInterface, QueryRunner } from 'typeorm';

export class AnalyticsPlatformSchema20260401000000 implements MigrationInterface {
  name = 'AnalyticsPlatformSchema20260401000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Extensions ───────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE`);

    // ─── Raw Layer ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE anl_raw_ingestion_log (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_type  TEXT NOT NULL,
        source_key   TEXT NOT NULL,
        batch_id     UUID NOT NULL,
        raw_payload  JSONB NOT NULL,
        row_count    INTEGER,
        status       TEXT NOT NULL DEFAULT 'pending',
        error_detail TEXT,
        ingested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE anl_raw_external_feeds (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        feed_type  TEXT NOT NULL,
        region_code TEXT,
        raw_json   JSONB NOT NULL,
        source_url TEXT,
        fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── Dimension Tables ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE anl_dim_time (
        time_key    INTEGER PRIMARY KEY,
        full_date   DATE NOT NULL,
        year        SMALLINT NOT NULL,
        quarter     SMALLINT NOT NULL,
        month       SMALLINT NOT NULL,
        week        SMALLINT NOT NULL,
        day_of_week SMALLINT NOT NULL,
        is_weekend  BOOLEAN NOT NULL,
        is_holiday  BOOLEAN NOT NULL DEFAULT FALSE,
        season      TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE anl_dim_geography (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code        TEXT UNIQUE NOT NULL,
        name_ru     TEXT NOT NULL,
        name_ky     TEXT,
        level       TEXT NOT NULL,
        parent_code TEXT,
        population  INTEGER,
        area_km2    NUMERIC(12,2),
        boundary    geometry(MultiPolygon, 4326),
        centroid    geometry(Point, 4326)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE anl_dim_incident_type (
        id                  SERIAL PRIMARY KEY,
        code                TEXT UNIQUE NOT NULL,
        name_ru             TEXT NOT NULL,
        category            TEXT NOT NULL,
        severity_base       SMALLINT,
        response_sla_hours  INTEGER
      )
    `);

    await queryRunner.query(`
      CREATE TABLE anl_dim_resource (
        id            SERIAL PRIMARY KEY,
        code          TEXT UNIQUE NOT NULL,
        name_ru       TEXT NOT NULL,
        type          TEXT NOT NULL,
        unit          TEXT NOT NULL,
        department_id INTEGER REFERENCES departments(id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE anl_dim_dataset (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        TEXT NOT NULL,
        description TEXT,
        source_type TEXT NOT NULL,
        schema_def  JSONB,
        owner_id    INTEGER REFERENCES "user"(id),
        is_public   BOOLEAN NOT NULL DEFAULT FALSE,
        tags        TEXT[] DEFAULT '{}',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── Fact Tables (TimescaleDB hypertables) ─────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE anl_fact_incidents (
        id                   UUID NOT NULL DEFAULT gen_random_uuid(),
        time_key             INTEGER,
        occurred_at          TIMESTAMPTZ NOT NULL,
        geo_code             TEXT,
        incident_type_id     INTEGER REFERENCES anl_dim_incident_type(id),
        severity             SMALLINT NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
        affected_count       INTEGER NOT NULL DEFAULT 0,
        fatalities           INTEGER NOT NULL DEFAULT 0,
        injuries             INTEGER NOT NULL DEFAULT 0,
        economic_loss_usd    NUMERIC(15,2),
        response_time_min    INTEGER,
        resolution_time_min  INTEGER,
        location             geometry(Point, 4326),
        source_doc_id        UUID,
        raw_data             JSONB,
        PRIMARY KEY (id, occurred_at)
      )
    `);
    await queryRunner.query(`SELECT create_hypertable('anl_fact_incidents', 'occurred_at', chunk_time_interval => INTERVAL '1 month', if_not_exists => TRUE)`);

    await queryRunner.query(`
      CREATE TABLE anl_fact_weather (
        id           UUID NOT NULL DEFAULT gen_random_uuid(),
        observed_at  TIMESTAMPTZ NOT NULL,
        station_code TEXT NOT NULL,
        geo_code     TEXT,
        temp_celsius NUMERIC(5,2),
        humidity_pct NUMERIC(5,2),
        precip_mm    NUMERIC(8,3),
        wind_speed_ms NUMERIC(6,2),
        wind_dir_deg SMALLINT,
        pressure_hpa NUMERIC(7,2),
        snow_depth_cm NUMERIC(7,2),
        river_level_cm NUMERIC(8,2),
        raw_json     JSONB,
        PRIMARY KEY (id, observed_at)
      )
    `);
    await queryRunner.query(`SELECT create_hypertable('anl_fact_weather', 'observed_at', chunk_time_interval => INTERVAL '1 week', if_not_exists => TRUE)`);

    await queryRunner.query(`
      CREATE TABLE anl_fact_seismic (
        id           UUID NOT NULL DEFAULT gen_random_uuid(),
        occurred_at  TIMESTAMPTZ NOT NULL,
        magnitude    NUMERIC(4,2),
        depth_km     NUMERIC(7,2),
        epicenter    geometry(Point, 4326),
        geo_code     TEXT,
        intensity_msk NUMERIC(4,2),
        source       TEXT,
        raw_json     JSONB,
        PRIMARY KEY (id, occurred_at)
      )
    `);
    await queryRunner.query(`SELECT create_hypertable('anl_fact_seismic', 'occurred_at', chunk_time_interval => INTERVAL '1 month', if_not_exists => TRUE)`);

    await queryRunner.query(`
      CREATE TABLE anl_fact_resource_deployment (
        id            UUID NOT NULL DEFAULT gen_random_uuid(),
        deployed_at   TIMESTAMPTZ NOT NULL,
        incident_id   UUID,
        resource_id   INTEGER REFERENCES anl_dim_resource(id),
        quantity      NUMERIC(10,2),
        geo_code      TEXT,
        department_id INTEGER REFERENCES departments(id),
        cost_som      NUMERIC(15,2),
        returned_at   TIMESTAMPTZ,
        PRIMARY KEY (id, deployed_at)
      )
    `);
    await queryRunner.query(`SELECT create_hypertable('anl_fact_resource_deployment', 'deployed_at', chunk_time_interval => INTERVAL '1 month', if_not_exists => TRUE)`);

    await queryRunner.query(`
      CREATE TABLE anl_kpi_snapshots (
        id           UUID NOT NULL DEFAULT gen_random_uuid(),
        captured_at  TIMESTAMPTZ NOT NULL,
        kpi_code     TEXT NOT NULL,
        scope_type   TEXT NOT NULL DEFAULT 'global',
        scope_value  TEXT,
        value        NUMERIC(20,6) NOT NULL,
        unit         TEXT,
        trend        TEXT,
        vs_prev_pct  NUMERIC(8,2),
        metadata     JSONB,
        PRIMARY KEY (id, captured_at)
      )
    `);
    await queryRunner.query(`SELECT create_hypertable('anl_kpi_snapshots', 'captured_at', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE)`);

    // ─── Geo Layer ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE anl_geo_boundaries (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code       TEXT UNIQUE NOT NULL,
        level      TEXT NOT NULL,
        name_ru    TEXT NOT NULL,
        name_ky    TEXT,
        boundary   geometry(MultiPolygon, 4326) NOT NULL,
        centroid   geometry(Point, 4326),
        properties JSONB DEFAULT '{}'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE anl_geo_risk_zones (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name              TEXT NOT NULL,
        risk_type         TEXT NOT NULL,
        severity          SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
        geometry          geometry(MultiPolygon, 4326) NOT NULL,
        population_at_risk INTEGER,
        last_assessed     TIMESTAMPTZ,
        valid_from        TIMESTAMPTZ,
        valid_until       TIMESTAMPTZ,
        source            TEXT,
        properties        JSONB DEFAULT '{}'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE anl_geo_infrastructure (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        TEXT NOT NULL,
        infra_type  TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'operational',
        capacity    INTEGER,
        location    geometry(Point, 4326) NOT NULL,
        service_area geometry(Polygon, 4326),
        properties  JSONB DEFAULT '{}'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE anl_geo_event_layers (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        incident_id  UUID,
        event_time   TIMESTAMPTZ NOT NULL,
        geometry     geometry(Geometry, 4326),
        layer_type   TEXT NOT NULL,
        properties   JSONB DEFAULT '{}'
      )
    `);

    // ─── Platform Config Tables ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE anl_kpi_definitions (
        code          TEXT PRIMARY KEY,
        name_ru       TEXT NOT NULL,
        description   TEXT,
        formula       TEXT NOT NULL,
        unit          TEXT,
        thresholds    JSONB,
        scope_levels  TEXT[] DEFAULT '{global}',
        refresh_cron  TEXT DEFAULT '0 * * * *',
        is_active     BOOLEAN NOT NULL DEFAULT TRUE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE anl_data_sources (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name         TEXT NOT NULL,
        type         TEXT NOT NULL,
        config       JSONB NOT NULL,
        schema_def   JSONB,
        last_fetched TIMESTAMPTZ,
        last_status  TEXT,
        is_active    BOOLEAN NOT NULL DEFAULT TRUE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE anl_pipeline_runs (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id     UUID REFERENCES anl_data_sources(id),
        queue_name    TEXT NOT NULL,
        status        TEXT NOT NULL DEFAULT 'queued',
        records_in    INTEGER,
        records_out   INTEGER,
        records_err   INTEGER,
        error_log     JSONB,
        started_at    TIMESTAMPTZ,
        finished_at   TIMESTAMPTZ,
        triggered_by  TEXT NOT NULL DEFAULT 'scheduler'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE anl_dashboards (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id   INTEGER NOT NULL REFERENCES "user"(id),
        title      TEXT NOT NULL,
        layout     JSONB NOT NULL DEFAULT '{"widgets":[]}',
        filters    JSONB NOT NULL DEFAULT '{}',
        is_public  BOOLEAN NOT NULL DEFAULT FALSE,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        tags       TEXT[] DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE anl_dashboard_permissions (
        dashboard_id UUID NOT NULL REFERENCES anl_dashboards(id) ON DELETE CASCADE,
        principal_id INTEGER NOT NULL REFERENCES "user"(id),
        can_edit     BOOLEAN NOT NULL DEFAULT FALSE,
        PRIMARY KEY (dashboard_id, principal_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE anl_reports (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title        TEXT NOT NULL,
        template     TEXT NOT NULL,
        params       JSONB NOT NULL DEFAULT '{}',
        status       TEXT NOT NULL DEFAULT 'pending',
        file_key     TEXT,
        owner_id     INTEGER NOT NULL REFERENCES "user"(id),
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE anl_access_policies (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        principal_id  INTEGER NOT NULL REFERENCES "user"(id),
        resource_type TEXT NOT NULL,
        resource_id   TEXT,
        can_read      BOOLEAN NOT NULL DEFAULT TRUE,
        can_export    BOOLEAN NOT NULL DEFAULT FALSE,
        can_manage    BOOLEAN NOT NULL DEFAULT FALSE,
        granted_by    INTEGER REFERENCES "user"(id),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE anl_lineage (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        target_table TEXT NOT NULL,
        target_id    UUID NOT NULL,
        source_type  TEXT NOT NULL,
        source_id    UUID NOT NULL,
        transform    TEXT,
        applied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actor_id     INTEGER REFERENCES "user"(id)
      )
    `);

    // ─── Spatial Indexes ───────────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX ON anl_geo_boundaries     USING GIST (boundary)`);
    await queryRunner.query(`CREATE INDEX ON anl_geo_risk_zones      USING GIST (geometry)`);
    await queryRunner.query(`CREATE INDEX ON anl_geo_infrastructure  USING GIST (location)`);
    await queryRunner.query(`CREATE INDEX ON anl_fact_incidents      USING GIST (location)`);
    await queryRunner.query(`CREATE INDEX ON anl_dim_geography       USING GIST (boundary)`);
    await queryRunner.query(`CREATE INDEX ON anl_fact_seismic        USING GIST (epicenter)`);

    // ─── Composite Indexes ─────────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX ON anl_fact_incidents (occurred_at DESC, geo_code)`);
    await queryRunner.query(`CREATE INDEX ON anl_kpi_snapshots  (kpi_code, captured_at DESC, scope_value)`);
    await queryRunner.query(`
      CREATE INDEX idx_incidents_active ON anl_fact_incidents (occurred_at DESC, geo_code)
      WHERE resolution_time_min IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_kpi_lookup ON anl_kpi_snapshots (kpi_code, scope_type, scope_value, captured_at DESC)
    `);

    // ─── Trigger: pg_notify on new incident → bust mat.view cache ─────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION anl_notify_incident_change() RETURNS trigger AS $$
      BEGIN
        PERFORM pg_notify('anl_incident_change', NEW.geo_code);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_anl_incident_change
      AFTER INSERT OR UPDATE ON anl_fact_incidents
      FOR EACH ROW EXECUTE FUNCTION anl_notify_incident_change()
    `);

    // ─── Seed: KPI definitions ─────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO anl_kpi_definitions (code, name_ru, formula, unit, thresholds, scope_levels, refresh_cron) VALUES
      ('INC_TOTAL_30D',        'ЧС за 30 дней',
       'SELECT COUNT(*)::numeric FROM anl_fact_incidents WHERE occurred_at > NOW() - INTERVAL ''30 days''',
       'штук', '{"warning":50,"critical":100,"direction":"up_bad"}', '{global,oblast}', '0 * * * *'),
      ('INC_AVG_RESPONSE_7D',  'Ср. время реагирования (7 дн.)',
       'SELECT COALESCE(ROUND(AVG(response_time_min)),0)::numeric FROM anl_fact_incidents WHERE occurred_at > NOW() - INTERVAL ''7 days''',
       'минут', '{"warning":45,"critical":90,"direction":"up_bad"}', '{global,oblast,rayon}', '0 * * * *'),
      ('INC_FATALITY_RATE',    'Уровень смертности (%)',
       'SELECT COALESCE(ROUND(SUM(fatalities)::numeric/NULLIF(SUM(affected_count),0)*100,2),0) FROM anl_fact_incidents WHERE occurred_at > NOW() - INTERVAL ''30 days''',
       '%', '{"warning":1.0,"critical":3.0,"direction":"up_bad"}', '{global,oblast}', '0 */6 * * *'),
      ('RES_UTILIZATION_RATE', 'Использование ресурсов',
       'SELECT COALESCE(ROUND(COUNT(CASE WHEN returned_at IS NULL THEN 1 END)::numeric/NULLIF(COUNT(*),0)*100,1),0) FROM anl_fact_resource_deployment WHERE deployed_at > NOW() - INTERVAL ''7 days''',
       '%', '{"warning":80,"critical":95,"direction":"up_bad"}', '{global,department}', '0 */1 * * *'),
      ('EDM_PENDING_APPROVALS','Документы на согласовании',
       'SELECT COUNT(*)::numeric FROM edm_v2_documents WHERE status = ''approval''',
       'штук', '{"warning":20,"critical":50,"direction":"up_bad"}', '{global,department}', '*/15 * * * *')
      ON CONFLICT (code) DO NOTHING
    `);

    // ─── Seed: Incident types ──────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO anl_dim_incident_type (code, name_ru, category, severity_base, response_sla_hours) VALUES
      ('FLOOD',      'Паводок',            'natural',     4, 2),
      ('EARTHQUAKE', 'Землетрясение',      'natural',     5, 1),
      ('LANDSLIDE',  'Оползень',           'natural',     4, 2),
      ('WILDFIRE',   'Лесной пожар',       'natural',     3, 2),
      ('AVALANCHE',  'Сель/Снежная лавина','natural',     4, 2),
      ('FIRE',       'Пожар',              'technogenic', 3, 1),
      ('HAZMAT',     'Техн. авария (АХОВ)','technogenic', 5, 1),
      ('ROAD',       'ДТП',               'technogenic', 2, 1),
      ('EPIDEMIC',   'Эпидемия',           'biological',  3, 24),
      ('DROUGHT',    'Засуха',             'natural',     2, 168)
      ON CONFLICT (code) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_anl_incident_change ON anl_fact_incidents`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS anl_notify_incident_change`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_lineage`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_access_policies`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_reports`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_dashboard_permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_dashboards`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_pipeline_runs`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_data_sources`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_kpi_definitions`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_geo_event_layers`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_geo_infrastructure`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_geo_risk_zones`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_geo_boundaries`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_kpi_snapshots`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_fact_resource_deployment`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_fact_seismic`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_fact_weather`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_fact_incidents`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_dim_dataset`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_dim_resource`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_dim_incident_type`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_dim_geography`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_dim_time`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_raw_external_feeds`);
    await queryRunner.query(`DROP TABLE IF EXISTS anl_raw_ingestion_log`);
  }
}
