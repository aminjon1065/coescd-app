import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TypesService } from './types.service';
import { DisasterType } from './entities/disaster-type.entity';
import { DisasterCategory } from '../disasterCategories/entities/category.entity';

describe('TypesService', () => {
  let service: TypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypesService,
        {
          provide: getRepositoryToken(DisasterType),
          useValue: {},
        },
        {
          provide: getRepositoryToken(DisasterCategory),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<TypesService>(TypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
