import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { FileAttachmentsService } from './file-attachments.service';
import { FileEntity } from './entities/file.entity';
import { FileLinkEntity } from './entities/file-link.entity';
import { FileAccessAuditEntity } from './entities/file-access-audit.entity';
import { User } from '../users/entities/user.entity';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Role } from '../users/enums/role.enum';

function makeActor(): ActiveUserData {
  return {
    sub: 11,
    email: 'actor@test.local',
    name: 'Actor',
    role: Role.Manager,
    departmentId: 1,
    permissions: [],
  };
}

function createService() {
  const fileRepo = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };
  const fileLinkRepo = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const fileAuditRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(),
  };
  const userRepo = {
    findOneBy: jest.fn(),
  };

  const service = new FileAttachmentsService(
    fileRepo as unknown as Repository<FileEntity>,
    fileLinkRepo as unknown as Repository<FileLinkEntity>,
    fileAuditRepo as unknown as Repository<FileAccessAuditEntity>,
    userRepo as unknown as Repository<User>,
    {
      applyFileScope: jest.fn(),
    } as any,
  );

  return { service, fileRepo, fileLinkRepo, fileAuditRepo, userRepo };
}

describe('FileAttachmentsService', () => {
  it('findAttachableFile throws when file does not exist', async () => {
    const { service, fileRepo } = createService();
    fileRepo.findOne.mockResolvedValue(null);

    await expect(service.findAttachableFile(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findAttachableFile throws for deleted file', async () => {
    const { service, fileRepo } = createService();
    fileRepo.findOne.mockResolvedValue({
      id: 1,
      status: 'deleted',
    });

    await expect(service.findAttachableFile(1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('linkResourceFile returns existing link if present', async () => {
    const { service, fileRepo, fileLinkRepo, userRepo, fileAuditRepo } =
      createService();
    const actor = makeActor();

    fileRepo.findOne.mockResolvedValue({
      id: 10,
      status: 'active',
    });
    userRepo.findOneBy.mockResolvedValue({ id: actor.sub });

    const existing = { id: 77 } as FileLinkEntity;
    fileLinkRepo.findOne.mockResolvedValue(existing);

    const result = await service.linkResourceFile({
      resourceType: 'document',
      resourceId: 5,
      file: { id: 10 } as FileEntity,
      actor,
      requestMeta: { ip: '1.1.1.1', userAgent: 'jest' },
    });

    expect(result).toBe(existing);
    expect(fileLinkRepo.save).not.toHaveBeenCalled();
    expect(fileAuditRepo.save).not.toHaveBeenCalled();
  });

  it('linkResourceFile creates link and audit when no existing link', async () => {
    const { service, fileRepo, fileLinkRepo, userRepo, fileAuditRepo } =
      createService();
    const actor = makeActor();

    const file = { id: 10, status: 'active' } as FileEntity;
    fileRepo.findOne.mockResolvedValue(file);
    fileRepo.findOneBy.mockResolvedValue(file);
    userRepo.findOneBy.mockResolvedValue({ id: actor.sub });
    fileLinkRepo.findOne.mockResolvedValue(null);
    fileLinkRepo.save.mockResolvedValue({ id: 99 });

    const result = await service.linkResourceFile({
      resourceType: 'task',
      resourceId: 9,
      file,
      actor,
      requestMeta: { ip: '2.2.2.2', userAgent: 'jest' },
    });

    expect(result).toEqual({ id: 99 });
    expect(fileLinkRepo.save).toHaveBeenCalled();
    expect(fileAuditRepo.save).toHaveBeenCalled();
  });

  it('unlinkResourceFile throws when link does not exist', async () => {
    const { service, fileRepo, fileLinkRepo } = createService();
    const actor = makeActor();
    const file = { id: 10, status: 'active' } as FileEntity;

    fileRepo.findOne.mockResolvedValue(file);
    fileLinkRepo.findOne.mockResolvedValue(null);

    await expect(
      service.unlinkResourceFile({
        resourceType: 'document',
        resourceId: 3,
        file,
        actor,
        requestMeta: { ip: null, userAgent: null },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('unlinkResourceFile removes link and writes audit', async () => {
    const { service, fileRepo, fileLinkRepo, fileAuditRepo, userRepo } =
      createService();
    const actor = makeActor();
    const file = { id: 10, status: 'active' } as FileEntity;

    fileRepo.findOne.mockResolvedValue(file);
    fileRepo.findOneBy.mockResolvedValue(file);
    fileLinkRepo.findOne.mockResolvedValue({
      id: 8,
      file,
    } as FileLinkEntity);
    userRepo.findOneBy.mockResolvedValue({ id: actor.sub });

    const result = await service.unlinkResourceFile({
      resourceType: 'task',
      resourceId: 4,
      file,
      actor,
      requestMeta: { ip: '3.3.3.3', userAgent: 'jest' },
    });

    expect(result).toEqual({ unlinked: true });
    expect(fileLinkRepo.remove).toHaveBeenCalled();
    expect(fileAuditRepo.save).toHaveBeenCalled();
  });
});
