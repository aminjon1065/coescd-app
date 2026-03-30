import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Disaster } from '../disasters/entities/disaster.entity';
import { PredictDisastersDto } from './dto/predict-disasters.dto';

export interface MonthlyPoint {
  /** YYYY-MM */
  month: string;
  count: number;
}

export interface PredictionPoint {
  /** YYYY-MM */
  month: string;
  predicted: number;
  /** lower bound of 95 % confidence interval (floored at 0) */
  lower: number;
  /** upper bound of 95 % confidence interval */
  upper: number;
}

export interface PredictionResult {
  historical: MonthlyPoint[];
  forecast: PredictionPoint[];
  model: {
    method: 'linear_regression';
    slope: number;
    intercept: number;
    /** R² — coefficient of determination */
    r2: number;
    rmse: number;
  };
  meta: {
    fromDate: string;
    toDate: string;
    horizonMonths: number;
    disasterTypeId?: number;
    departmentId?: number;
    generatedAt: string;
  };
}

@Injectable()
export class PredictionService {
  constructor(
    @InjectRepository(Disaster)
    private readonly disasterRepo: Repository<Disaster>,
  ) {}

  async predict(dto: PredictDisastersDto): Promise<PredictionResult> {
    const historical = await this.fetchMonthlyHistory(dto);
    const { slope, intercept, r2, rmse } = this.fitLinearRegression(historical);

    const lastHistoricalIndex = historical.length - 1;
    const forecast = this.buildForecast(
      historical,
      lastHistoricalIndex,
      slope,
      intercept,
      rmse,
      dto.horizonMonths,
    );

    return {
      historical,
      forecast,
      model: {
        method: 'linear_regression',
        slope: +slope.toFixed(4),
        intercept: +intercept.toFixed(4),
        r2: +r2.toFixed(4),
        rmse: +rmse.toFixed(4),
      },
      meta: {
        fromDate: dto.fromDate,
        toDate: dto.toDate,
        horizonMonths: dto.horizonMonths,
        disasterTypeId: dto.disasterTypeId,
        departmentId: dto.departmentId,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async fetchMonthlyHistory(
    dto: PredictDisastersDto,
  ): Promise<MonthlyPoint[]> {
    const qb = this.disasterRepo
      .createQueryBuilder('disaster')
      .select("TO_CHAR(disaster.created_at, 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)::int', 'count')
      .where('disaster.created_at >= :fromDate', { fromDate: dto.fromDate })
      .andWhere('disaster.created_at <= :toDate', { toDate: dto.toDate });

    if (dto.disasterTypeId) {
      qb.leftJoin('disaster.type', 'type').andWhere('type.id = :typeId', {
        typeId: dto.disasterTypeId,
      });
    }

    if (dto.departmentId) {
      qb.leftJoin('disaster.department', 'dept').andWhere(
        'dept.id = :deptId',
        { deptId: dto.departmentId },
      );
    }

    const raw = await qb
      .groupBy("TO_CHAR(disaster.created_at, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string; count: number }>();

    // Fill in zero-count months within the requested window so the regression
    // uses a complete, evenly-spaced series.
    return this.fillGaps(raw, dto.fromDate, dto.toDate);
  }

  /** Ensure every month between fromDate and toDate has a data point. */
  private fillGaps(
    raw: { month: string; count: number }[],
    fromDate: string,
    toDate: string,
  ): MonthlyPoint[] {
    const map = new Map(raw.map((r) => [r.month, r.count]));
    const result: MonthlyPoint[] = [];

    const cursor = new Date(fromDate);
    cursor.setDate(1);
    const end = new Date(toDate);
    end.setDate(1);

    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      result.push({ month: key, count: map.get(key) ?? 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return result;
  }

  /**
   * Ordinary least squares linear regression on the historical series.
   * x = index (0, 1, 2, …), y = count
   */
  private fitLinearRegression(points: MonthlyPoint[]): {
    slope: number;
    intercept: number;
    r2: number;
    rmse: number;
  } {
    const n = points.length;

    if (n < 2) {
      return { slope: 0, intercept: points[0]?.count ?? 0, r2: 0, rmse: 0 };
    }

    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += points[i].count;
      sumXY += i * points[i].count;
      sumX2 += i * i;
    }

    const meanX = sumX / n;
    const meanY = sumY / n;
    const slope = (sumXY - n * meanX * meanY) / (sumX2 - n * meanX * meanX);
    const intercept = meanY - slope * meanX;

    // R² and RMSE
    let ssTot = 0,
      ssRes = 0,
      sumSqErr = 0;
    for (let i = 0; i < n; i++) {
      const predicted = slope * i + intercept;
      ssTot += (points[i].count - meanY) ** 2;
      ssRes += (points[i].count - predicted) ** 2;
      sumSqErr += (points[i].count - predicted) ** 2;
    }

    const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
    const rmse = Math.sqrt(sumSqErr / n);

    return { slope, intercept, r2, rmse };
  }

  /** Build forecast points for the next horizonMonths after the history end. */
  private buildForecast(
    historical: MonthlyPoint[],
    lastIndex: number,
    slope: number,
    intercept: number,
    rmse: number,
    horizonMonths: number,
  ): PredictionPoint[] {
    const lastMonth = historical[lastIndex]?.month ?? '';
    const [yearStr, monthStr] = lastMonth.split('-');
    const cursor = new Date(+yearStr, +monthStr - 1, 1);

    const forecast: PredictionPoint[] = [];
    // 95 % CI multiplier (z = 1.96)
    const ci = 1.96 * rmse;

    for (let h = 1; h <= horizonMonths; h++) {
      cursor.setMonth(cursor.getMonth() + 1);
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const x = lastIndex + h;
      const predicted = Math.max(0, slope * x + intercept);

      forecast.push({
        month: key,
        predicted: +predicted.toFixed(2),
        lower: +Math.max(0, predicted - ci).toFixed(2),
        upper: +(predicted + ci).toFixed(2),
      });
    }

    return forecast;
  }
}
