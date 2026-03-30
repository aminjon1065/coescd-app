import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GisService } from './gis.service';
import { GisLayer } from './entities/gis-layer.entity';
import { GisFeature } from './entities/gis-feature.entity';
import { Department } from '../department/entities/department.entity';
import { User } from '../users/entities/user.entity';
import type { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Role } from '../users/enums/role.enum';

const qbMock = () => {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb;
  qb.leftJoinAndSelect = jest.fn(chain);
  qb.leftJoin = jest.fn(chain);
  qb.where = jest.fn(chain);
  qb.andWhere = jest.fn(chain);
  qb.orWhere = jest.fn(chain);
  qb.orderBy = jest.fn(chain);
  qb.skip = jest.fn(chain);
  qb.take = jest.fn(chain);
  qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  qb.getMany = jest.fn().mockResolvedValue([]);
  return qb;
};

const repoStub = () => ({
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn().mockResolvedValue(undefined),
  createQueryBuilder: jest.fn(() => qbMock()),
});

const adminActor: ActiveUserData = {
  sub: 1,
  email: 'admin@test.com',
  name: 'Test Admin',
  role: Role.Admin,
  departmentId: null,
  permissions: [],
};

const staffActor: ActiveUserData = {
  sub: 2,
  email: 'staff@test.com',
  name: 'Test Staff',
  role: Role.Employee,
  departmentId: 10,
  permissions: [],
};

describe('GisService', () => {
  let service: GisService;
  let layerRepo: ReturnType<typeof repoStub>;
  let featureRepo: ReturnType<typeof repoStub>;
  let deptRepo: ReturnType<typeof repoStub>;
  let userRepo: ReturnType<typeof repoStub>;

  beforeEach(async () => {
    layerRepo = repoStub();
    featureRepo = repoStub();
    deptRepo = repoStub();
    userRepo = repoStub();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GisService,
        { provide: getRepositoryToken(GisLayer), useValue: layerRepo },
        { provide: getRepositoryToken(GisFeature), useValue: featureRepo },
        { provide: getRepositoryToken(Department), useValue: deptRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<GisService>(GisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLayer', () => {
    it('throws NotFoundException when actor user not found', async () => {
      userRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.createLayer({ name: 'Layer A' }, adminActor),
      ).rejects.toThrow(NotFoundException);
    });

    it('saves layer with department when actor has departmentId', async () => {
      const mockUser = { id: 2 };
      const mockDept = { id: 10 };
      const mockLayer = { id: 1, name: 'Layer B' };

      userRepo.findOneBy.mockResolvedValue(mockUser);
      deptRepo.findOneBy.mockResolvedValue(mockDept);
      layerRepo.create.mockReturnValue(mockLayer);
      layerRepo.save.mockResolvedValue(mockLayer);

      const result = await service.createLayer({ name: 'Layer B' }, staffActor);

      expect(deptRepo.findOneBy).toHaveBeenCalledWith({ id: 10 });
      expect(layerRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockLayer);
    });

    it('saves layer without department when actor has no departmentId', async () => {
      const mockUser = { id: 1 };
      const mockLayer = { id: 2, name: 'Global Layer' };

      userRepo.findOneBy.mockResolvedValue(mockUser);
      layerRepo.create.mockReturnValue(mockLayer);
      layerRepo.save.mockResolvedValue(mockLayer);

      await service.createLayer({ name: 'Global Layer' }, adminActor);

      expect(deptRepo.findOneBy).not.toHaveBeenCalled();
    });
  });

  describe('removeLayer', () => {
    it('throws NotFoundException when layer does not exist', async () => {
      layerRepo.findOne.mockResolvedValue(null);

      await expect(service.removeLayer(999, adminActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when non-admin tries to delete another dept layer', async () => {
      layerRepo.findOne.mockResolvedValue({
        id: 5,
        department: { id: 99 },
        createdBy: { id: 999 },
      });

      await expect(service.removeLayer(5, staffActor)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deletes layer when admin', async () => {
      const mockLayer = { id: 5, department: null, createdBy: { id: 999 } };
      layerRepo.findOne.mockResolvedValue(mockLayer);
      layerRepo.remove.mockResolvedValue(mockLayer);

      await service.removeLayer(5, adminActor);

      expect(layerRepo.remove).toHaveBeenCalledWith(mockLayer);
    });
  });

  describe('findOneFeature', () => {
    it('throws NotFoundException when feature not found', async () => {
      featureRepo.findOne.mockResolvedValue(null);

      await expect(service.findOneFeature(42)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns feature when found', async () => {
      const mockFeature = { id: 42, name: 'Point A' };
      featureRepo.findOne.mockResolvedValue(mockFeature);

      const result = await service.findOneFeature(42);

      expect(result).toEqual(mockFeature);
    });
  });
});
