import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
// node-sql-parser is not installed; use a simple allowlist approach instead
const ALLOWED_TABLES = new Set([
  'anl_fact_incidents', 'anl_fact_weather', 'anl_fact_seismic',
  'anl_fact_resource_deployment', 'anl_kpi_snapshots',
  'anl_dim_geography', 'anl_dim_incident_type', 'anl_dim_resource', 'anl_dim_dataset',
  'anl_geo_boundaries', 'anl_geo_risk_zones', 'anl_geo_infrastructure',
  'anl_agg_incidents_daily',
]);

const FORBIDDEN_KEYWORDS = /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXEC|EXECUTE|COPY|pg_read|pg_write)\b/i;

@Injectable()
export class ExplorerService {
  constructor(private readonly dataSource: DataSource) {}

  async execute(sql: string, params: unknown[] = [], isAnalyst = false): Promise<{ columns: string[]; rows: any[]; total: number }> {
    // Safety: reject write keywords
    if (FORBIDDEN_KEYWORDS.test(sql)) {
      throw new ForbiddenException('Write operations are not allowed in explorer');
    }

    // Must start with SELECT
    if (!sql.trim().toUpperCase().startsWith('SELECT')) {
      throw new BadRequestException('Only SELECT queries allowed');
    }

    // For non-analysts: enforce allowed table list
    if (!isAnalyst) {
      const tables = this.extractTables(sql);
      for (const t of tables) {
        if (!ALLOWED_TABLES.has(t.toLowerCase())) {
          throw new ForbiddenException(`Table ${t} is not accessible`);
        }
      }
    }

    // Add LIMIT if not present
    let safeSql = sql;
    if (!/\bLIMIT\b/i.test(sql)) {
      safeSql = `${sql} LIMIT 1000`;
    } else {
      // Clamp LIMIT to max 1000
      safeSql = sql.replace(/\bLIMIT\s+(\d+)/i, (_, n) => `LIMIT ${Math.min(parseInt(n), 1000)}`);
    }

    // Set statement timeout
    await this.dataSource.query(`SET LOCAL statement_timeout = '10s'`);
    const rows = await this.dataSource.query(safeSql, params);

    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { columns, rows, total: rows.length };
  }

  buildSql(builder: {
    table: string;
    columns?: string[];
    filters?: { column: string; op: string; value: unknown }[];
    orderBy?: string;
    orderDir?: 'ASC' | 'DESC';
    limit?: number;
  }): string {
    if (!ALLOWED_TABLES.has(builder.table)) {
      throw new ForbiddenException(`Table ${builder.table} not allowed`);
    }

    const cols = builder.columns?.length ? builder.columns.join(', ') : '*';
    let sql = `SELECT ${cols} FROM ${builder.table}`;

    if (builder.filters?.length) {
      const where = builder.filters
        .map((f, i) => `${f.column} ${f.op} $${i + 1}`)
        .join(' AND ');
      sql += ` WHERE ${where}`;
    }

    if (builder.orderBy) sql += ` ORDER BY ${builder.orderBy} ${builder.orderDir ?? 'ASC'}`;
    sql += ` LIMIT ${Math.min(builder.limit ?? 100, 1000)}`;

    return sql;
  }

  getAllowedTables() {
    return Array.from(ALLOWED_TABLES);
  }

  private extractTables(sql: string): string[] {
    const matches = sql.matchAll(/\bFROM\s+(\w+)\b|\bJOIN\s+(\w+)\b/gi);
    return Array.from(matches).map(m => m[1] ?? m[2]).filter(Boolean);
  }
}
