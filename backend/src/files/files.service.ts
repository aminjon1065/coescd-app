import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from './entities/file.entity';
import { FileLinkEntity } from './entities/file-link.entity';
import { FileAccessAuditEntity } from './entities/file-access-audit.entity';
import { CreateFileLinkDto } from './dto/create-file-link.dto';
import { User } from '../users/entities/user.entity';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { ScopeService } from '../iam/authorization/scope.service';
import { FilesStorageService } from './storage/files-storage.service';
import { createHash, randomUUID } from 'crypto';
import { Readable } from 'stream';
import {
  CompletePresignedUploadDto,
  CreatePresignedUploadDto,
} from './dto/create-presigned-upload.dto';
import { getFilesRuntimeConfig } from './files.config';
import { GetFilesQueryDto } from './dto/get-files-query.dto';
import { PaginatedResponse } from '../common/http/pagination-query.dto';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(FileLinkEntity)
    private readonly fileLinkRepository: Repository<FileLinkEntity>,
    @InjectRepository(FileAccessAuditEntity)
    private readonly fileAccessAuditRepository: Repository<FileAccessAuditEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly scopeService: ScopeService,
    private readonly filesStorageService: FilesStorageService,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!file.buffer || file.size === 0) {
      throw new BadRequestException('File content is empty');
    }

    this.assertUploadConstraints(file.mimetype, file.size);

    const owner = await this.userRepository.findOne({
      where: { id: actor.sub },
      relations: { department: true },
    });
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }

    const checksumSha256 = createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    const key = this.buildStorageKey(
      owner.department?.id ?? null,
      file.originalname,
    );
    await this.filesStorageService.uploadObject({
      key,
      body: file.buffer,
      mimeType: file.mimetype || 'application/octet-stream',
    });

    const created = await this.fileRepository.save(
      this.fileRepository.create({
        originalName: file.originalname,
        storageKey: key,
        bucket: this.filesStorageService.getBucket(),
        mimeType: file.mimetype || 'application/octet-stream',
        sizeBytes: String(file.size),
        checksumSha256,
        owner,
        department: owner.department ?? null,
        status: 'active',
        deletedAt: null,
      }),
    );
    await this.logAudit({
      file: created,
      actorId: actor.sub,
      action: 'upload',
      success: true,
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent,
      reason: null,
    });
    return created;
  }

  async createPresignedUpload(
    dto: CreatePresignedUploadDto,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    const config = this.getRuntimeConfig();
    if (!config.presignedEnabled) {
      throw new BadRequestException('Presigned mode is disabled');
    }

    this.assertUploadConstraints(dto.mimeType, dto.sizeBytes);

    const owner = await this.userRepository.findOne({
      where: { id: actor.sub },
      relations: { department: true },
    });
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }

    const key = this.buildStorageKey(
      owner.department?.id ?? null,
      dto.originalName,
    );
    const uploadUrl = await this.filesStorageService.getPresignedUploadUrl({
      key,
      mimeType: dto.mimeType,
      expiresInSeconds: config.presignedUploadTtlSeconds,
    });

    return {
      uploadUrl,
      key,
      bucket: this.filesStorageService.getBucket(),
      expiresInSeconds: config.presignedUploadTtlSeconds,
      requiredHeaders: {
        'Content-Type': dto.mimeType,
      },
    };
  }

  async completePresignedUpload(
    dto: CompletePresignedUploadDto,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    const config = this.getRuntimeConfig();
    if (!config.presignedEnabled) {
      throw new BadRequestException('Presigned mode is disabled');
    }

    this.assertUploadConstraints(dto.mimeType, dto.sizeBytes);

    const owner = await this.userRepository.findOne({
      where: { id: actor.sub },
      relations: { department: true },
    });
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }

    const existing = await this.fileRepository.findOneBy({
      storageKey: dto.key,
    });
    if (existing) {
      throw new BadRequestException(
        'File metadata already exists for this key',
      );
    }

    let metadata: { contentLength: number | null; contentType: string | null };
    try {
      metadata = await this.filesStorageService.getObjectMetadata(dto.key);
    } catch {
      throw new BadRequestException('Uploaded object was not found by key');
    }
    if (!metadata.contentLength || metadata.contentLength <= 0) {
      throw new BadRequestException('Uploaded object is empty or missing');
    }
    if (metadata.contentLength !== dto.sizeBytes) {
      throw new BadRequestException('Uploaded object size does not match');
    }
    if (metadata.contentType && metadata.contentType !== dto.mimeType) {
      throw new BadRequestException('Uploaded object mime type does not match');
    }

    const created = await this.fileRepository.save(
      this.fileRepository.create({
        originalName: dto.originalName,
        storageKey: dto.key,
        bucket: this.filesStorageService.getBucket(),
        mimeType: dto.mimeType,
        sizeBytes: String(dto.sizeBytes),
        checksumSha256: dto.checksumSha256,
        owner,
        department: owner.department ?? null,
        status: 'active',
        deletedAt: null,
      }),
    );

    await this.logAudit({
      file: created,
      actorId: actor.sub,
      action: 'upload',
      success: true,
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent,
      reason: 'presigned_complete',
    });

    return created;
  }

  async findAll(
    actor: ActiveUserData,
    query: GetFilesQueryDto = {},
  ): Promise<PaginatedResponse<FileEntity>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));
    const offset = (page - 1) * limit;

    const qb = this.fileRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.owner', 'owner')
      .leftJoinAndSelect('file.department', 'department')
      .orderBy('file.createdAt', query.sortOrder === 'asc' ? 'ASC' : 'DESC');

    if (query.status) {
      qb.where('file.status = :status', { status: query.status });
    } else {
      qb.where('file.status != :deletedStatus', { deletedStatus: 'deleted' });
    }

    if (query.q) {
      const search = `%${query.q.toLowerCase()}%`;
      qb.andWhere('LOWER(file.originalName) LIKE :q', { q: search });
    }

    this.scopeService.applyFileScope(qb, actor, {
      ownerAlias: 'owner',
      departmentAlias: 'department',
    });

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: number, actor: ActiveUserData) {
    const file = await this.fileRepository.findOne({
      where: { id },
      relations: {
        owner: true,
        department: true,
      },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    this.scopeService.assertFileScope(actor, file);
    return file;
  }

  async downloadFile(
    id: number,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ): Promise<{ file: FileEntity; stream: Readable }> {
    const file = await this.findOne(id, actor);
    if (file.status === 'deleted') {
      throw new NotFoundException('File is deleted');
    }
    try {
      const stream = await this.filesStorageService.getObjectStream(
        file.storageKey,
      );
      await this.logAudit({
        file,
        actorId: actor.sub,
        action: 'download',
        success: true,
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent,
        reason: null,
      });
      return { file, stream };
    } catch (error) {
      await this.logAudit({
        file,
        actorId: actor.sub,
        action: 'download',
        success: false,
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent,
        reason: error?.message ?? 'Download failed',
      });
      throw error;
    }
  }

  async createPresignedDownload(
    id: number,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    const config = this.getRuntimeConfig();
    if (!config.presignedEnabled) {
      throw new BadRequestException('Presigned mode is disabled');
    }

    const file = await this.findOne(id, actor);
    if (file.status === 'deleted') {
      throw new NotFoundException('File is deleted');
    }

    const downloadUrl = await this.filesStorageService.getPresignedDownloadUrl({
      key: file.storageKey,
      originalName: file.originalName,
      mimeType: file.mimeType,
      expiresInSeconds: config.presignedDownloadTtlSeconds,
    });

    await this.logAudit({
      file,
      actorId: actor.sub,
      action: 'presign_download',
      success: true,
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent,
      reason: null,
    });

    return {
      fileId: file.id,
      downloadUrl,
      expiresInSeconds: config.presignedDownloadTtlSeconds,
    };
  }

  async softDelete(
    id: number,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    const file = await this.findOne(id, actor);
    if (file.status === 'deleted') {
      return file;
    }
    try {
      await this.filesStorageService.deleteObject(file.storageKey);
      file.status = 'deleted';
      file.deletedAt = new Date();
      const saved = await this.fileRepository.save(file);
      await this.logAudit({
        file: saved,
        actorId: actor.sub,
        action: 'delete',
        success: true,
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent,
        reason: null,
      });
      return saved;
    } catch (error) {
      await this.logAudit({
        file,
        actorId: actor.sub,
        action: 'delete',
        success: false,
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent,
        reason: error?.message ?? 'Delete failed',
      });
      throw error;
    }
  }

  async createLink(
    fileId: number,
    dto: CreateFileLinkDto,
    activeUser: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    const [file, actor] = await Promise.all([
      this.findOne(fileId, activeUser),
      this.userRepository.findOneBy({ id: activeUser.sub }),
    ]);
    if (!actor) {
      throw new NotFoundException('Actor not found');
    }

    const link = this.fileLinkRepository.create({
      file,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      createdBy: actor,
    });
    const savedLink = await this.fileLinkRepository.save(link);

    await this.logAudit({
      file,
      actorId: actor.id,
      action: 'link',
      success: true,
      reason: null,
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent,
    });

    return savedLink;
  }

  private buildStorageKey(
    departmentId: number | null,
    originalName: string,
  ): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const normalizedName = originalName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_');
    const department = departmentId ?? 'no-department';
    return `local/${department}/${year}/${month}/${randomUUID()}-${normalizedName}`;
  }

  private getRuntimeConfig() {
    return getFilesRuntimeConfig();
  }

  private assertUploadConstraints(mimeType: string, sizeBytes: number): void {
    const config = this.getRuntimeConfig();
    const normalizedMime = mimeType.trim().toLowerCase();
    if (!config.allowedMimeTypes.includes(normalizedMime)) {
      throw new BadRequestException(`Unsupported mime type: ${mimeType}`);
    }
    if (sizeBytes > config.uploadMaxBytes) {
      throw new BadRequestException(
        `File size exceeds limit (${config.uploadMaxBytes} bytes)`,
      );
    }
  }

  private async logAudit(params: {
    file: FileEntity;
    actorId: number | null;
    action: FileAccessAuditEntity['action'];
    success: boolean;
    ip: string | null;
    userAgent: string | null;
    reason: string | null;
  }): Promise<void> {
    const existingFile = params.file.id
      ? await this.fileRepository.findOneBy({ id: params.file.id })
      : null;
    if (!existingFile) {
      return;
    }

    const actor = params.actorId
      ? await this.userRepository.findOneBy({ id: params.actorId })
      : null;
    await this.fileAccessAuditRepository.save(
      this.fileAccessAuditRepository.create({
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
