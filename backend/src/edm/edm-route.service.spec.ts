import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EdmRouteService } from './edm-route.service';
import { EdmDocument } from './entities/edm-document.entity';
import { EdmDocumentRoute } from './entities/edm-document-route.entity';
import { EdmRouteStage } from './entities/edm-route-stage.entity';
import { EdmStageAction } from './entities/edm-stage-action.entity';
import { EdmDocumentTimelineEvent } from './entities/edm-document-timeline-event.entity';
import { IamDelegation } from './entities/iam-delegation.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../department/entities/department.entity';
import { EdmCoreService } from './edm-core.service';
import { EdmTemplatesService } from './edm-templates.service';
import { EdmReportsService } from './edm-reports.service';
import type { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Role } from '../users/enums/role.enum';

const qbMock = () => {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb;
  qb.leftJoinAndSelect = jest.fn(chain);
  qb.leftJoin = jest.fn(chain);
  qb.where = jest.fn(chain);
  qb.andWhere = jest.fn(chain);
  qb.orderBy = jest.fn(chain);
  qb.addOrderBy = jest.fn(chain);
  qb.skip = jest.fn(chain);
  qb.take = jest.fn(chain);
  qb.getMany = jest.fn().mockResolvedValue([]);
  qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  qb.getOne = jest.fn().mockResolvedValue(null);
  return qb;
};

const repoStub = () => ({
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(() => qbMock()),
});

const actor: ActiveUserData = {
  sub: 1,
  email: 'user@test.com',
  name: 'Test Admin',
  role: Role.Admin,
  departmentId: null,
  permissions: [],
};

describe('EdmRouteService', () => {
  let service: EdmRouteService;
  let coreService: jest.Mocked<EdmCoreService>;
  let actionRepo: ReturnType<typeof repoStub>;
  let timelineRepo: ReturnType<typeof repoStub>;

  beforeEach(async () => {
    actionRepo = repoStub();
    timelineRepo = repoStub();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EdmRouteService,
        { provide: getRepositoryToken(EdmDocument), useValue: repoStub() },
        { provide: getRepositoryToken(EdmDocumentRoute), useValue: repoStub() },
        { provide: getRepositoryToken(EdmRouteStage), useValue: repoStub() },
        { provide: getRepositoryToken(EdmStageAction), useValue: actionRepo },
        {
          provide: getRepositoryToken(EdmDocumentTimelineEvent),
          useValue: timelineRepo,
        },
        { provide: getRepositoryToken(IamDelegation), useValue: repoStub() },
        { provide: getRepositoryToken(User), useValue: repoStub() },
        { provide: getRepositoryToken(Department), useValue: repoStub() },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn() },
        },
        {
          provide: EdmCoreService,
          useValue: {
            getDocumentOrFail: jest.fn(),
            assertDocumentReadScope: jest.fn(),
          },
        },
        {
          provide: EdmTemplatesService,
          useValue: {},
        },
        {
          provide: EdmReportsService,
          useValue: {},
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<EdmRouteService>(EdmRouteService);
    coreService = module.get(EdmCoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAudit', () => {
    it('throws NotFoundException when document does not exist', async () => {
      coreService.getDocumentOrFail.mockRejectedValue(
        new NotFoundException('Document 99 not found'),
      );

      await expect(
        service.findAudit(99, actor, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns actions for the document', async () => {
      const mockDoc = { id: 1 };
      const mockActions = [{ id: 10, action: 'approved' }];
      coreService.getDocumentOrFail.mockResolvedValue(mockDoc as EdmDocument);
      coreService.assertDocumentReadScope.mockResolvedValue(undefined);

      const qb = qbMock();
      qb.getMany.mockResolvedValue(mockActions);
      actionRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAudit(1, actor, {});

      expect(coreService.getDocumentOrFail).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockActions);
    });

    it('applies actorUserId filter when provided', async () => {
      const mockDoc = { id: 1 };
      coreService.getDocumentOrFail.mockResolvedValue(mockDoc as EdmDocument);
      coreService.assertDocumentReadScope.mockResolvedValue(undefined);

      const qb = qbMock();
      actionRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAudit(1, actor, { actorUserId: 5 });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'actorUser.id = :actorUserId',
        { actorUserId: 5 },
      );
    });
  });

  describe('findHistory', () => {
    it('throws NotFoundException when document does not exist', async () => {
      coreService.getDocumentOrFail.mockRejectedValue(
        new NotFoundException('Document 99 not found'),
      );

      await expect(
        service.findHistory(99, actor, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns timeline events for the document', async () => {
      const mockDoc = { id: 1 };
      const mockEvents = [{ id: 20, kind: 'submitted' }];
      coreService.getDocumentOrFail.mockResolvedValue(mockDoc as EdmDocument);
      coreService.assertDocumentReadScope.mockResolvedValue(undefined);

      const qb = qbMock();
      qb.getMany.mockResolvedValue(mockEvents);
      timelineRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findHistory(1, actor, {});

      expect(result).toEqual(mockEvents);
    });
  });
});
