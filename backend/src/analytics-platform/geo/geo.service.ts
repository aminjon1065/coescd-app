import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AnlGeoBoundary } from '../entities/anl-geo-boundary.entity';
import { AnlGeoRiskZone } from '../entities/anl-geo-risk-zone.entity';
import { AnlGeoInfrastructure } from '../entities/anl-geo-infrastructure.entity';

@Injectable()
export class GeoService {
  constructor(
    @InjectRepository(AnlGeoBoundary) private readonly boundaryRepo: Repository<AnlGeoBoundary>,
    @InjectRepository(AnlGeoRiskZone) private readonly riskZoneRepo: Repository<AnlGeoRiskZone>,
    @InjectRepository(AnlGeoInfrastructure) private readonly infraRepo: Repository<AnlGeoInfrastructure>,
    private readonly dataSource: DataSource,
  ) {}

  async getBoundaries(level?: string) {
    const rows = await this.dataSource.query(
      `SELECT code, level, name_ru, name_ky,
              ST_AsGeoJSON(boundary)::json AS boundary,
              ST_AsGeoJSON(centroid)::json AS centroid,
              properties
       FROM anl_geo_boundaries
       ${level ? `WHERE level = $1` : ''}
       ORDER BY name_ru`,
      level ? [level] : [],
    );
    return this.toFeatureCollection(rows, (r) => ({
      type: 'Feature',
      geometry: r.boundary,
      properties: { code: r.code, level: r.level, nameRu: r.name_ru, ...r.properties },
    }));
  }

  async getRiskZones(riskType?: string, minSeverity = 1) {
    const params: unknown[] = [minSeverity];
    let where = `WHERE severity >= $1`;
    if (riskType) {
      params.push(riskType);
      where += ` AND risk_type = $2`;
    }

    const rows = await this.dataSource.query(
      `SELECT id, name, risk_type, severity, population_at_risk,
              ST_AsGeoJSON(geometry)::json AS geometry, properties
       FROM anl_geo_risk_zones ${where} ORDER BY severity DESC`,
      params,
    );

    return this.toFeatureCollection(rows, (r) => ({
      type: 'Feature',
      geometry: r.geometry,
      properties: {
        id: r.id, name: r.name, riskType: r.risk_type,
        severity: r.severity, populationAtRisk: r.population_at_risk,
        ...r.properties,
      },
    }));
  }

  async getInfrastructure(infraType?: string) {
    const params: unknown[] = [];
    const where = infraType ? `WHERE infra_type = $1` : '';
    if (infraType) params.push(infraType);

    const rows = await this.dataSource.query(
      `SELECT id, name, infra_type, status, capacity,
              ST_AsGeoJSON(location)::json AS location, properties
       FROM anl_geo_infrastructure ${where} ORDER BY name`,
      params,
    );

    return this.toFeatureCollection(rows, (r) => ({
      type: 'Feature',
      geometry: r.location,
      properties: {
        id: r.id, name: r.name, infraType: r.infra_type,
        status: r.status, capacity: r.capacity, ...r.properties,
      },
    }));
  }

  async getActiveIncidents() {
    const rows = await this.dataSource.query(`
      SELECT i.id, i.occurred_at, i.geo_code, i.severity, i.affected_count, i.fatalities,
             t.name_ru AS type_name, t.category,
             ST_AsGeoJSON(i.location)::json AS location
      FROM anl_fact_incidents i
      LEFT JOIN anl_dim_incident_type t ON t.id = i.incident_type_id
      WHERE i.resolution_time_min IS NULL AND i.location IS NOT NULL
        AND i.occurred_at > NOW() - INTERVAL '30 days'
      ORDER BY i.occurred_at DESC
      LIMIT 500
    `);

    return this.toFeatureCollection(rows, (r) => ({
      type: 'Feature',
      geometry: r.location,
      properties: {
        id: r.id, occurredAt: r.occurred_at, geoCode: r.geo_code,
        severity: r.severity, affectedCount: r.affected_count,
        typeName: r.type_name, category: r.category,
      },
    }));
  }

  async getIncidentDensity(from?: Date, to?: Date, severityMin = 1) {
    const fromDate = from ?? new Date(Date.now() - 90 * 24 * 3600 * 1000);
    const toDate = to ?? new Date();

    const rows = await this.dataSource.query(`
      SELECT
        ST_X(ST_SnapToGrid(location, 0.1)) AS lon,
        ST_Y(ST_SnapToGrid(location, 0.1)) AS lat,
        COUNT(*) AS count,
        AVG(severity) AS avg_severity,
        SUM(affected_count) AS total_affected
      FROM anl_fact_incidents
      WHERE occurred_at BETWEEN $1 AND $2
        AND severity >= $3
        AND location IS NOT NULL
      GROUP BY ST_SnapToGrid(location, 0.1)
      ORDER BY count DESC
      LIMIT 2000
    `, [fromDate, toDate, severityMin]);

    return rows.map((r: any) => ({
      lon: parseFloat(r.lon),
      lat: parseFloat(r.lat),
      count: parseInt(r.count),
      avgSeverity: parseFloat(r.avg_severity),
      totalAffected: parseInt(r.total_affected),
    }));
  }

  async getPlaybackData(from: Date, to: Date, resolution: 'hour' | 'day' = 'day') {
    const bucket = resolution === 'hour' ? '1 hour' : '1 day';
    const rows = await this.dataSource.query(`
      SELECT
        time_bucket($1::interval, occurred_at) AS bucket,
        geo_code,
        COUNT(*) AS count,
        AVG(severity) AS avg_severity,
        JSONB_AGG(ST_AsGeoJSON(location)::json) FILTER (WHERE location IS NOT NULL) AS points
      FROM anl_fact_incidents
      WHERE occurred_at BETWEEN $2 AND $3 AND location IS NOT NULL
      GROUP BY 1, 2
      ORDER BY 1
      LIMIT 2000
    `, [bucket, from, to]);

    return rows;
  }

  async spatialQuery(type: 'buffer' | 'nearest' | 'intersection', params: Record<string, unknown>) {
    if (type === 'nearest') {
      const { lon, lat, infraType, radius = 20000 } = params as any;
      return this.dataSource.query(`
        SELECT id, name, infra_type, status, capacity,
               ST_Distance(location::geography, ST_SetSRID(ST_Point($1,$2),4326)::geography)/1000 AS dist_km
        FROM anl_geo_infrastructure
        WHERE infra_type = $3
          AND ST_DWithin(location::geography, ST_SetSRID(ST_Point($1,$2),4326)::geography, $4)
        ORDER BY location <-> ST_SetSRID(ST_Point($1,$2),4326)
        LIMIT 10
      `, [lon, lat, infraType, radius]);
    }

    if (type === 'buffer') {
      const { lon, lat, radiusMeters = 10000 } = params as any;
      return this.dataSource.query(`
        SELECT id, name, infra_type, status,
               ST_Distance(location::geography, ST_SetSRID(ST_Point($1,$2),4326)::geography)/1000 AS dist_km
        FROM anl_geo_infrastructure
        WHERE ST_DWithin(location::geography, ST_SetSRID(ST_Point($1,$2),4326)::geography, $3)
        ORDER BY dist_km
        LIMIT 50
      `, [lon, lat, radiusMeters]);
    }

    return [];
  }

  async getIncidentTrend(days = 30, groupBy: 'day' | 'week' | 'month' = 'day', geoCode?: string) {
    const bucket = groupBy === 'day' ? '1 day' : groupBy === 'week' ? '1 week' : '1 month';
    const params: unknown[] = [bucket, days];
    const geoFilter = geoCode ? `AND geo_code = $3` : '';
    if (geoCode) params.push(geoCode);

    return this.dataSource.query(`
      SELECT
        time_bucket($1::interval, occurred_at) AS bucket,
        COUNT(*) AS count,
        AVG(severity) AS avg_severity,
        SUM(affected_count) AS total_affected,
        SUM(fatalities) AS total_fatalities,
        AVG(response_time_min) AS avg_response_min
      FROM anl_fact_incidents
      WHERE occurred_at > NOW() - ($2 || ' days')::interval ${geoFilter}
      GROUP BY 1
      ORDER BY 1
    `, params);
  }

  async queryIncidents(opts: {
    from?: Date; to?: Date; geoCode?: string; incidentTypeId?: number;
    severityMin?: number; page?: number; limit?: number;
  }) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 50, 500);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (opts.from) { conditions.push(`occurred_at >= $${i++}`); params.push(opts.from); }
    if (opts.to) { conditions.push(`occurred_at <= $${i++}`); params.push(opts.to); }
    if (opts.geoCode) { conditions.push(`geo_code = $${i++}`); params.push(opts.geoCode); }
    if (opts.incidentTypeId) { conditions.push(`incident_type_id = $${i++}`); params.push(opts.incidentTypeId); }
    if (opts.severityMin) { conditions.push(`severity >= $${i++}`); params.push(opts.severityMin); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, total] = await Promise.all([
      this.dataSource.query(
        `SELECT i.id, i.occurred_at, i.geo_code, i.severity, i.affected_count, i.fatalities,
                i.response_time_min, i.resolution_time_min, i.economic_loss_usd,
                t.name_ru AS type_name, t.category,
                ST_AsGeoJSON(i.location)::json AS location
         FROM anl_fact_incidents i
         LEFT JOIN anl_dim_incident_type t ON t.id = i.incident_type_id
         ${where} ORDER BY i.occurred_at DESC LIMIT $${i} OFFSET $${i + 1}`,
        [...params, limit, offset],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) AS total FROM anl_fact_incidents ${where}`, params,
      ),
    ]);

    return { data, total: parseInt(total[0].total), page, limit };
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private toFeatureCollection(rows: any[], mapper: (r: any) => any) {
    return { type: 'FeatureCollection', features: rows.map(mapper) };
  }
}
