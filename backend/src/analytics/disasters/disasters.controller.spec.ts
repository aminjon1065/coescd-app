import { Test, TestingModule } from '@nestjs/testing';
import { DisastersController } from './disasters.controller';
import { DisastersService } from './disasters.service';

describe('DisastersController', () => {
  let controller: DisastersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisastersController],
      providers: [
        {
          provide: DisastersService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<DisastersController>(DisastersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
