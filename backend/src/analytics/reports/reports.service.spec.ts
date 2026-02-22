import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { Disaster } from '../disasters/entities/disaster.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';
import { Task } from '../../task/entities/task.entity';
import { EdmDocument } from '../../edm/entities/edm-document.entity';
import { EdmRouteStage } from '../../edm/entities/edm-route-stage.entity';
import { EdmAlert } from '../../edm/entities/edm-alert.entity';
import { EdmDocumentRoute } from '../../edm/entities/edm-document-route.entity';
import { FileEntity } from '../../files/entities/file.entity';

const repoStub = () => ({
  count: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(Disaster), useValue: repoStub() },
        { provide: getRepositoryToken(User), useValue: repoStub() },
        { provide: getRepositoryToken(Department), useValue: repoStub() },
        { provide: getRepositoryToken(Task), useValue: repoStub() },
        { provide: getRepositoryToken(EdmDocument), useValue: repoStub() },
        { provide: getRepositoryToken(EdmRouteStage), useValue: repoStub() },
        { provide: getRepositoryToken(EdmAlert), useValue: repoStub() },
        { provide: getRepositoryToken(EdmDocumentRoute), useValue: repoStub() },
        { provide: getRepositoryToken(FileEntity), useValue: repoStub() },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
