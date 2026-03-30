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

const qbMock = () => {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb;
  qb.select = jest.fn(chain);
  qb.addSelect = jest.fn(chain);
  qb.where = jest.fn(chain);
  qb.andWhere = jest.fn(chain);
  qb.groupBy = jest.fn(chain);
  qb.addGroupBy = jest.fn(chain);
  qb.orderBy = jest.fn(chain);
  qb.limit = jest.fn(chain);
  qb.leftJoin = jest.fn(chain);
  qb.leftJoinAndSelect = jest.fn(chain);
  qb.skip = jest.fn(chain);
  qb.take = jest.fn(chain);
  qb.getRawMany = jest.fn().mockResolvedValue([]);
  qb.getRawOne = jest.fn().mockResolvedValue({ avgHours: null });
  qb.getCount = jest.fn().mockResolvedValue(0);
  qb.clone = jest.fn(chain);
  return qb;
};

const repoStub = () => ({
  count: jest.fn().mockResolvedValue(0),
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(() => qbMock()),
});

describe('ReportsService', () => {
  let service: ReportsService;
  let disasterRepo: ReturnType<typeof repoStub>;
  let userRepo: ReturnType<typeof repoStub>;
  let departmentRepo: ReturnType<typeof repoStub>;
  let taskRepo: ReturnType<typeof repoStub>;

  beforeEach(async () => {
    disasterRepo = repoStub();
    userRepo = repoStub();
    departmentRepo = repoStub();
    taskRepo = repoStub();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(Disaster), useValue: disasterRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Department), useValue: departmentRepo },
        { provide: getRepositoryToken(Task), useValue: taskRepo },
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

  describe('getStats', () => {
    it('returns aggregated stats with correct shape', async () => {
      disasterRepo.count
        .mockResolvedValueOnce(10) // totalDisasters
        .mockResolvedValueOnce(3);  // activeDisasters
      userRepo.count.mockResolvedValue(25);
      departmentRepo.count.mockResolvedValue(5);
      taskRepo.count
        .mockResolvedValueOnce(40) // totalTasks
        .mockResolvedValueOnce(12); // activeTasks

      const result = await service.getStats();

      expect(result).toEqual({
        totalDisasters: 10,
        activeDisasters: 3,
        totalUsers: 25,
        totalDepartments: 5,
        totalTasks: 40,
        activeTasks: 12,
      });
    });

    it('returns zeros when all counts are zero', async () => {
      const result = await service.getStats();

      expect(result.totalDisasters).toBe(0);
      expect(result.activeDisasters).toBe(0);
      expect(result.totalUsers).toBe(0);
    });
  });

  describe('getIncidentsTrend', () => {
    it('returns raw rows from the query builder', async () => {
      const mockRows = [
        { date: '2026-01-01', count: 3 },
        { date: '2026-01-02', count: 1 },
      ];
      const qb = qbMock();
      qb.getRawMany.mockResolvedValue(mockRows);
      disasterRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getIncidentsTrend(
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );

      expect(result).toEqual(mockRows);
      expect(qb.where).toHaveBeenCalledWith(
        'disaster.createdAt >= :fromDate',
        expect.objectContaining({ fromDate: expect.any(Date) }),
      );
    });

    it('passes correct date range to query', async () => {
      const qb = qbMock();
      disasterRepo.createQueryBuilder.mockReturnValue(qb);

      const from = new Date('2025-06-01');
      const to = new Date('2025-12-31');
      await service.getIncidentsTrend(from, to);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'disaster.createdAt <= :toDate',
        expect.objectContaining({ toDate: to }),
      );
    });
  });

  describe('getTasksByDepartment', () => {
    it('returns task breakdown from query builder', async () => {
      const mockRows = [
        { departmentId: 1, name: 'Dept A', total: 5, new: 2, inProgress: 2, completed: 1 },
      ];
      const qb = qbMock();
      qb.getRawMany.mockResolvedValue(mockRows);
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTasksByDepartment();

      expect(result).toEqual(mockRows);
    });
  });
});
