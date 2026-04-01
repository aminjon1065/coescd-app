import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class RiskEnricherService {
  private readonly logger = new Logger(RiskEnricherService.name);

  constructor(private readonly dataSource: DataSource) {}

  async computeRiskIndex(geoCode: string): Promise<number> {
    const [incRow, wxRow, seisRow, popRow] = await Promise.all([
      // Incident score: SUM(severity × log(1+affected)) / 100, normalized 0-10
      this.dataSource.query(`
        SELECT LEAST(
          COALESCE(SUM(severity * LOG(1 + affected_count)), 0) / 100.0,
          10
        ) AS score
        FROM anl_fact_incidents
        WHERE geo_code = $1 AND occurred_at > NOW() - INTERVAL '365 days'
      `, [geoCode]),

      // Weather anomaly: current precip vs historical baseline
      this.dataSource.query(`
        SELECT LEAST(
          COALESCE(
            AVG(precip_mm) FILTER (WHERE observed_at > NOW() - INTERVAL '7 days')
            / NULLIF(AVG(precip_mm) FILTER (WHERE observed_at < NOW() - INTERVAL '7 days'), 0)
            * 3, 0
          ), 10
        ) AS score
        FROM anl_fact_weather
        WHERE geo_code = $1 AND observed_at > NOW() - INTERVAL '365 days'
      `, [geoCode]),

      // Seismic score: SUM(10^magnitude) within 100km / 1M
      this.dataSource.query(`
        SELECT LEAST(
          COALESCE(SUM(POWER(10, magnitude)), 0) / 1000000.0,
          10
        ) AS score
        FROM anl_fact_seismic s
        JOIN anl_geo_boundaries b ON b.code = $1
        WHERE ST_DWithin(s.epicenter::geography, ST_Centroid(b.boundary)::geography, 100000)
          AND s.occurred_at > NOW() - INTERVAL '30 days'
      `, [geoCode]),

      // Population
      this.dataSource.query(`SELECT population FROM anl_dim_geography WHERE code = $1`, [geoCode]),
    ]);

    const incScore = parseFloat(incRow[0]?.score ?? '0');
    const wxScore = parseFloat(wxRow[0]?.score ?? '0');
    const seisScore = parseFloat(seisRow[0]?.score ?? '0');
    const population = popRow[0]?.population ?? 100000;
    const popFactor = Math.min(population / 1_000_000, 1.5);

    const raw = incScore * 0.5 + wxScore * 0.2 + seisScore * 0.3;
    return Math.min(Math.round(raw * popFactor * 100) / 100, 10);
  }

  async computeAllRiskIndexes(): Promise<Record<string, number>> {
    const geoCodes = await this.dataSource.query(
      `SELECT code FROM anl_dim_geography WHERE level IN ('oblast', 'rayon')`,
    );

    const results: Record<string, number> = {};
    for (const { code } of geoCodes) {
      try {
        results[code] = await this.computeRiskIndex(code);
      } catch (err) {
        this.logger.warn(`Risk index failed for ${code}: ${err.message}`);
        results[code] = 0;
      }
    }
    return results;
  }
}
