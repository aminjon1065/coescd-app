import { Test, TestingModule } from '@nestjs/testing';
import { PredictionController } from './prediction.controller';
import { PredictionService } from './prediction.service';

const mockPredictionService = {
  predict: jest.fn().mockResolvedValue({
    historical: [],
    forecast: [],
    model: { method: 'linear_regression', slope: 0, intercept: 0, r2: 0, rmse: 0 },
    meta: { fromDate: '2025-01-01', toDate: '2025-06-30', horizonMonths: 3, generatedAt: '' },
  }),
};

describe('PredictionController', () => {
  let controller: PredictionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PredictionController],
      providers: [{ provide: PredictionService, useValue: mockPredictionService }],
    }).compile();

    controller = module.get<PredictionController>(PredictionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('predict() delegates to PredictionService', async () => {
    const dto = { fromDate: '2025-01-01', toDate: '2025-06-30', horizonMonths: 3 };
    const result = await controller.predict(dto as any);
    expect(mockPredictionService.predict).toHaveBeenCalledWith(dto);
    expect(result).toBeDefined();
  });
});
