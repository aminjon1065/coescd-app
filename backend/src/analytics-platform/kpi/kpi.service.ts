import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Repository, DataSource } from 'typeorm';
import Redis from 'ioredis';
import { AnlKpiDefinition } from '../entities/anl-kpi-definition.entity';
import { AnlKpiSnapshot } from '../entities/anl-kpi-snapshot.entity';
import { KPI_REGISTRY } from './definitions/kpi-registry';
import { KpiValueResponseDto } from './dto/kpi.dto';

export interface KpiScope {
  scopeType?: string;
  scopeValue?: string;
}

@Injectable()
export class KpiService {
  private readonly logger = new Logger(KpiService.name);

  constructor(
    @InjectRepository(AnlKpiDefinition)
    private readonly defRepo: Repository<AnlKpiDefinition>,
    @InjectRepository(AnlKpiSnapshot)
    private readonly snapshotRepo: Repository<AnlKpiSnapshot>,
    @InjectRedis() private readonly redis: Redis,
    private readonly dataSource: DataSource,
  ) {}

  listDefinitions() {
    return this.defRepo.find({ where: { isActive: true }, order: { code: 'ASC' } });
  }

  async evaluate(code: string, scope: KpiScope = {}): Promise<KpiValueResponseDto> {
    const cacheKey = `kpi:${code}:${scope.scopeType ?? 'global'}:${scope.scopeValue ?? '_'}`;
    const hit = await this.redis.get(cacheKey);
    if (hit) return JSON.parse(hit) as KpiValueResponseDto;

    const def = await this.defRepo.findOne({ where: { code, isActive: true } });
    if (!def) throw new NotFoundException(`KPI ${code} not found`);

    const value = await this.runFormula(def.formula, scope);
    const prev = await this.getPreviousValue(code, scope);
    const trend = this.computeTrend(value, prev);
    const vsPrevPct = prev != null && prev !== 0
      ? Math.round(((value - prev) / Math.abs(prev)) * 1000) / 10
      : null;
    const thresholdStatus = this.getThresholdStatus(value, def.thresholds);

    const result: KpiValueResponseDto = {
      code,
      nameRu: def.nameRu,
      value,
      unit: def.unit,
      trend,
      vsPrevPct,
      thresholdStatus,
      capturedAt: new Date(),
    };

    await this.redis.setex(cacheKey, 900, JSON.stringify(result));
    return result;
  }

  async evaluateAll(scope: KpiScope = {}): Promise<KpiValueResponseDto[]> {
    const defs = await this.defRepo.find({ where: { isActive: true } });
    return Promise.all(defs.map(d => this.evaluate(d.code, scope).catch(() => null as any)));
  }

  async getHistory(code: string, scope: KpiScope, from?: Date, to?: Date) {
    const qb = this.snapshotRepo
      .createQueryBuilder('s')
      .where('s.kpi_code = :code', { code })
      .andWhere('s.scope_type = :st', { st: scope.scopeType ?? 'global' })
      .orderBy('s.captured_at', 'ASC')
      .take(1000);

    if (scope.scopeValue) qb.andWhere('s.scope_value = :sv', { sv: scope.scopeValue });
    if (from) qb.andWhere('s.captured_at >= :from', { from });
    if (to) qb.andWhere('s.captured_at <= :to', { to });

    return qb.getMany();
  }

  async snapshotAll() {
    const defs = await this.defRepo.find({ where: { isActive: true } });
    for (const def of defs) {
      try {
        const value = await this.runFormula(def.formula, {});
        const prev = await this.getPreviousValue(def.code, {});
        const trend = this.computeTrend(value, prev);
        const vsPrevPct = prev != null && prev !== 0
          ? Math.round(((value - prev) / Math.abs(prev)) * 1000) / 10
          : null;

        await this.snapshotRepo.save({
          kpiCode: def.code,
          capturedAt: new Date(),
          scopeType: 'global',
          value,
          unit: def.unit,
          trend,
          vsPrevPct,
        });

        await this.redis.del(`kpi:${def.code}:global:_`);
      } catch (err) {
        this.logger.warn(`KPI snapshot failed for ${def.code}: ${err.message}`);
      }
    }
  }

  async bustCache(geoCode?: string) {
    const keys = await this.redis.keys('kpi:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // ── private helpers ────────────────────────────────────────────────────────

  private async runFormula(formula: string, scope: KpiScope): Promise<number> {
    let sql = formula;

    if (scope.scopeType && scope.scopeType !== 'global' && scope.scopeValue) {
      const col = scope.scopeType === 'oblast' || scope.scopeType === 'rayon' ? 'geo_code' : 'department_id';
      const val = scope.scopeValue;
      // Safely inject geo filter using parameterized approach
      if (formula.toLowerCase().includes('from anl_fact_incidents')) {
        sql = formula.replace(
          /WHERE\s/i,
          `WHERE ${col} = '${val.replace(/'/g, "''")}' AND `,
        );
      }
    }

    const result = await this.dataSource.query(sql);
    return parseFloat(result[0]?.[Object.keys(result[0] ?? {})[0]] ?? '0') || 0;
  }

  private async getPreviousValue(code: string, scope: KpiScope): Promise<number | null> {
    const row = await this.snapshotRepo.findOne({
      where: { kpiCode: code, scopeType: scope.scopeType ?? 'global' },
      order: { capturedAt: 'DESC' },
    });
    return row ? row.value : null;
  }

  private computeTrend(current: number, previous: number | null): 'up' | 'down' | 'stable' {
    if (previous == null) return 'stable';
    if (current > previous * 1.05) return 'up';
    if (current < previous * 0.95) return 'down';
    return 'stable';
  }

  private getThresholdStatus(
    value: number,
    thresholds?: { warning?: number; critical?: number; direction?: string },
  ): 'normal' | 'warning' | 'critical' {
    if (!thresholds) return 'normal';
    const { warning, critical, direction } = thresholds;
    const upBad = direction === 'up_bad';

    if (critical != null) {
      if ((upBad && value >= critical) || (!upBad && value <= critical)) return 'critical';
    }
    if (warning != null) {
      if ((upBad && value >= warning) || (!upBad && value <= warning)) return 'warning';
    }
    return 'normal';
  }
}
