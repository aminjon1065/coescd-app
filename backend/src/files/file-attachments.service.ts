import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from './entities/file.entity';
import {
  FileLinkEntity,
  FileLinkResourceType,
} from './entities/file-link.entity';
import { FileAccessAuditEntity } from './entities/file-access-audit.entity';
import { User } from '../users/entities/user.entity';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { ScopeService } from '../iam/authorization/scope.service';

@Injectable()
export class FileAttachmentsService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,
    @InjectRepository(FileLinkEntity)
    private readonly fileLinkRepo: Repository<FileLinkEntity>,
    @InjectRepository(FileAccessAuditEntity)
    private readonly fileAuditRepo: Repository<FileAccessAuditEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly scopeService: ScopeService,
  ) {}

  async listResourceFiles(params: {
    resourceType: Extract<
      FileLinkResourceType,
      'document' | 'edm_document' | 'task'
    >;
    resourceId: number;
    actor: ActiveUserData;
  }): Promise<FileEntity[]> {
    const qb = this.fileRepo
      .createQueryBuilder('file')
      .innerJoin(
        'file_links',
        'link',
        'link.file_id = file.id AND link.resource_type = :resourceType AND link.resource_id = :resourceId',
        {
          resourceType: params.resourceType,
          resourceId: params.resourceId,
        },
      )
      .leftJoinAndSelect('file.owner', 'owner')
      .leftJoinAndSelect('file.department', 'department')
      .where('file.status != :deletedStatus', { deletedStatus: 'deleted' })
      .orderBy('file.createdAt', 'DESC');

    this.scopeService.applyFileScope(qb, params.actor, {
      ownerAlias: 'owner',
      departmentAlias: 'department',
    });

    return qb.getMany();
  }

  async linkResourceFile(params: {
    resourceType: Extract<
      FileLinkResourceType,
      'document' | 'edm_document' | 'task'
    >;
    resourceId: number;
    file: FileEntity;
    actor: ActiveUserData;
    requestMeta: { ip: string | null; userAgent: string | null };
  }): Promise<FileLinkEntity> {
    const [file, actorUser] = await Promise.all([
      this.findAttachableFile(params.file.id),
      this.userRepo.findOneBy({ id: params.actor.sub }),
    ]);
    if (!actorUser) {
      throw new NotFoundException('Actor not found');
    }

    const existing = await this.fileLinkRepo.findOne({
      where: {
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        file: { id: file.id },
      },
      relations: {
        file: true,
        createdBy: true,
      },
    });
    if (existing) {
      return existing;
    }

    const link = await this.fileLinkRepo.save(
      this.fileLinkRepo.create({
        file,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        createdBy: actorUser,
      }),
    );

    await this.logFileAudit({
      file,
      actorId: params.actor.sub,
      action: 'link',
      success: true,
      ip: params.requestMeta.ip,
      userAgent: params.requestMeta.userAgent,
      reason: `${params.resourceType}:${params.resourceId}`,
    });

    return link;
  }

  async unlinkResourceFile(params: {
    resourceType: Extract<
      FileLinkResourceType,
      'document' | 'edm_document' | 'task'
    >;
    resourceId: number;
    file: FileEntity;
    actor: ActiveUserData;
    requestMeta: { ip: string | null; userAgent: string | null };
  }): Promise<{ unlinked: true }> {
    const file = await this.findAttachableFile(params.file.id);

    const link = await this.fileLinkRepo.findOne({
      where: {
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        file: { id: file.id },
      },
      relations: {
        file: true,
      },
    });
    if (!link) {
      throw new NotFoundException('File link not found for this resource');
    }

    await this.fileLinkRepo.remove(link);

    await this.logFileAudit({
      file,
      actorId: params.actor.sub,
      action: 'unlink',
      success: true,
      ip: params.requestMeta.ip,
      userAgent: params.requestMeta.userAgent,
      reason: `${params.resourceType}:${params.resourceId}`,
    });

    return { unlinked: true };
  }

  async findAttachableFile(fileId: number): Promise<FileEntity> {
    const file = await this.fileRepo.findOne({
      where: { id: fileId },
      relations: {
        owner: true,
        department: true,
      },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    if (file.status === 'deleted') {
      throw new BadRequestException('Cannot link deleted file');
    }
    return file;
  }

  private async logFileAudit(params: {
    file: FileEntity;
    actorId: number | null;
    action: FileAccessAuditEntity['action'];
    success: boolean;
    ip: string | null;
    userAgent: string | null;
    reason: string | null;
  }): Promise<void> {
    const existingFile = await this.fileRepo.findOneBy({ id: params.file.id });
    if (!existingFile) {
      return;
    }

    const actor = params.actorId
      ? await this.userRepo.findOneBy({ id: params.actorId })
      : null;
    await this.fileAuditRepo.save(
      this.fileAuditRepo.create({
        file: existingFile,
        actor: actor ?? null,
        action: params.action,
        success: params.success,
        ip: params.ip,
        userAgent: params.userAgent,
        reason: params.reason,
      }),
    );
  }
}
