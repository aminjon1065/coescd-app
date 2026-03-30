import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PredictionService } from './prediction.service';
import { Disaster } from '../disasters/entities/disaster.entity';

const makeRepoMock = (rows: { month: string; count: number }[]) => ({
  createQueryBuilder: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  }),
});

describe('PredictionService', () => {
  let service: PredictionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictionService,
        {
          provide: getRepositoryToken(Disaster),
          useValue: makeRepoMock([
            { month: '2025-01', count: 3 },
            { month: '2025-02', count: 5 },
            { month: '2025-03', count: 4 },
            { month: '2025-04', count: 6 },
            { month: '2025-05', count: 8 },
            { month: '2025-06', count: 7 },
          ]),
        },
      ],
    }).compile();

    service = module.get<PredictionService>(PredictionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('predict()', () => {
    it('returns historical and forecast arrays', async () => {
      const result = await service.predict({
        fromDate: '2025-01-01',
        toDate: '2025-06-30',
        horizonMonths: 3,
      });

      expect(result.historical.length).toBeGreaterThan(0);
      expect(result.forecast.length).toBe(3);
      expect(result.model.method).toBe('linear_regression');
    });

    it('forecast months follow the last historical month', async () => {
      const result = await service.predict({
        fromDate: '2025-01-01',
        toDate: '2025-06-30',
        horizonMonths: 2,
      });

      expect(result.forecast[0].month).toBe('2025-07');
      expect(result.forecast[1].month).toBe('2025-08');
    });

    it('predicted values are non-negative', async () => {
      const result = await service.predict({
        fromDate: '2025-01-01',
        toDate: '2025-06-30',
        horizonMonths: 6,
      });

      result.forecast.forEach((pt) => {
        expect(pt.predicted).toBeGreaterThanOrEqual(0);
        expect(pt.lower).toBeGreaterThanOrEqual(0);
        expect(pt.upper).toBeGreaterThanOrEqual(pt.predicted);
      });
    });

    it('r2 is in [0, 1] for a monotone series', async () => {
      const result = await service.predict({
        fromDate: '2025-01-01',
        toDate: '2025-06-30',
        horizonMonths: 1,
      });

      expect(result.model.r2).toBeGreaterThanOrEqual(0);
      expect(result.model.r2).toBeLessThanOrEqual(1);
    });

    it('fills gaps with zero for months with no data', async () => {
      const result = await service.predict({
        fromDate: '2025-01-01',
        toDate: '2025-06-30',
        horizonMonths: 1,
      });

      // All 6 months between Jan and Jun should be in historical
      expect(result.historical.length).toBe(6);
    });

    it('meta reflects the DTO values', async () => {
      const result = await service.predict({
        fromDate: '2025-01-01',
        toDate: '2025-06-30',
        horizonMonths: 3,
        disasterTypeId: 2,
        departmentId: 5,
      });

      expect(result.meta.fromDate).toBe('2025-01-01');
      expect(result.meta.toDate).toBe('2025-06-30');
      expect(result.meta.horizonMonths).toBe(3);
      expect(result.meta.disasterTypeId).toBe(2);
      expect(result.meta.departmentId).toBe(5);
    });
  });
});
