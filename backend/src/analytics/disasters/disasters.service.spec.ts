import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DisastersService } from './disasters.service';
import { Disaster } from './entities/disaster.entity';
import { DisasterType } from '../disasterTypes/entities/disaster-type.entity';
import { Department } from '../../department/entities/department.entity';

describe('DisastersService', () => {
  let service: DisastersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisastersService,
        {
          provide: getRepositoryToken(Disaster),
          useValue: {},
        },
        {
          provide: getRepositoryToken(DisasterType),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Department),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<DisastersService>(DisastersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
