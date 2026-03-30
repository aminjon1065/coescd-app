import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { FileEntity } from './entities/file.entity';
import { FileLinkEntity } from './entities/file-link.entity';
import { FileAccessAuditEntity } from './entities/file-access-audit.entity';
import { FileShareEntity } from './entities/file-share.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../department/entities/department.entity';
import { ScopeService } from '../iam/authorization/scope.service';
import { FilesStorageService } from './storage/files-storage.service';
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
  qb.skip = jest.fn(chain);
  qb.take = jest.fn(chain);
  qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  qb.getMany = jest.fn().mockResolvedValue([]);
  return qb;
};

const repoStub = () => ({
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(() => qbMock()),
});

const actor: ActiveUserData = {
  sub: 1,
  email: 'user@test.com',
  name: 'Test User',
  role: Role.Employee,
  departmentId: 5,
  permissions: [],
};

const adminActor: ActiveUserData = {
  sub: 2,
  email: 'admin@test.com',
  name: 'Test Admin',
  role: Role.Admin,
  departmentId: null,
  permissions: [],
};

describe('FilesService', () => {
  let service: FilesService;
  let fileRepo: ReturnType<typeof repoStub>;
  let fileShareRepo: ReturnType<typeof repoStub>;
  let scopeService: jest.Mocked<ScopeService>;
  let storageService: jest.Mocked<FilesStorageService>;

  beforeEach(async () => {
    fileRepo = repoStub();
    fileShareRepo = repoStub();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: getRepositoryToken(FileEntity), useValue: fileRepo },
        {
          provide: getRepositoryToken(FileLinkEntity),
          useValue: repoStub(),
        },
        {
          provide: getRepositoryToken(FileAccessAuditEntity),
          useValue: repoStub(),
        },
        { provide: getRepositoryToken(FileShareEntity), useValue: fileShareRepo },
        { provide: getRepositoryToken(User), useValue: repoStub() },
        { provide: getRepositoryToken(Department), useValue: repoStub() },
        {
          provide: ScopeService,
          useValue: { assertFileScope: jest.fn() },
        },
        {
          provide: FilesStorageService,
          useValue: {
            uploadObject: jest.fn(),
            getObjectStream: jest.fn(),
            getPresignedUploadUrl: jest.fn(),
            getPresignedDownloadUrl: jest.fn(),
            deleteObject: jest.fn(),
            headObject: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    scopeService = module.get(ScopeService);
    storageService = module.get(FilesStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('throws BadRequestException when no file provided', async () => {
      await expect(
        service.uploadFile(
          undefined as unknown as Express.Multer.File,
          actor,
          { ip: null, userAgent: null },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when file buffer is empty', async () => {
      await expect(
        service.uploadFile(
          { buffer: Buffer.alloc(0), size: 0, mimetype: 'text/plain', originalname: 'test.txt' } as Express.Multer.File,
          actor,
          { ip: null, userAgent: null },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when actor user not found', async () => {
      const fileRepoInner = repoStub();
      fileRepoInner.findOne.mockResolvedValue(null);
      (service as unknown as { userRepository: typeof fileRepoInner }).userRepository = fileRepoInner;

      await expect(
        service.uploadFile(
          {
            buffer: Buffer.from('%PDF-1.4 test'),
            size: 13,
            mimetype: 'application/pdf',
            originalname: 'test.pdf',
          } as Express.Multer.File,
          actor,
          { ip: null, userAgent: null },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when file not found', async () => {
      fileRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(99, actor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns file when scope check passes', async () => {
      const mockFile = { id: 1, owner: { id: 1 }, department: null };
      fileRepo.findOne.mockResolvedValue(mockFile);
      scopeService.assertFileScope.mockReturnValue(undefined);

      const result = await service.findOne(1, actor);

      expect(result).toEqual(mockFile);
    });

    it('throws ForbiddenException when scope fails and no share exists', async () => {
      const mockFile = { id: 5, owner: { id: 99 }, department: { id: 99 } };
      fileRepo.findOne.mockResolvedValue(mockFile);
      scopeService.assertFileScope.mockImplementation(() => {
        throw new ForbiddenException();
      });
      fileShareRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(5, actor)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns file when scope fails but share exists', async () => {
      const mockFile = { id: 5, owner: { id: 99 }, department: { id: 99 } };
      fileRepo.findOne.mockResolvedValue(mockFile);
      scopeService.assertFileScope.mockImplementation(() => {
        throw new ForbiddenException();
      });
      fileShareRepo.findOne.mockResolvedValue({ id: 1 });

      const result = await service.findOne(5, actor);

      expect(result).toEqual(mockFile);
    });
  });

  describe('softDelete', () => {
    it('throws NotFoundException when file not found', async () => {
      fileRepo.findOne.mockResolvedValue(null);

      await expect(
        service.softDelete(99, actor, { ip: null, userAgent: null }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
