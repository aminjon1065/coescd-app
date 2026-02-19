import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../department/entities/department.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { ScopeService } from '../iam/authorization/scope.service';
import { FileLinkEntity } from '../files/entities/file-link.entity';
import { FileEntity } from '../files/entities/file.entity';
import { FileAttachmentsService } from '../files/file-attachments.service';
import { GetDocumentsQueryDto } from './dto/get-documents-query.dto';
import { PaginatedResponse } from '../common/http/pagination-query.dto';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    private readonly scopeService: ScopeService,
    private readonly fileAttachmentsService: FileAttachmentsService,
  ) {}

  async create(dto: CreateDocumentDto, senderId: number): Promise<Document> {
    const sender = await this.userRepo.findOneBy({ id: senderId });
    if (!sender) throw new NotFoundException('Sender not found');

    const doc = this.documentRepo.create({
      title: dto.title,
      description: dto.description,
      type: dto.type as Document['type'],
      status: dto.status as Document['status'],
      sender,
      fileName: dto.fileName,
      filePath: dto.filePath,
    });

    if (dto.receiverId) {
      const receiver = await this.userRepo.findOneBy({ id: dto.receiverId });
      if (!receiver) throw new NotFoundException('Receiver not found');
      doc.receiver = receiver;
    }

    if (dto.departmentId) {
      const dept = await this.departmentRepo.findOneBy({
        id: dto.departmentId,
      });
      if (!dept) throw new NotFoundException('Department not found');
      doc.department = dept;
    }

    return this.documentRepo.save(doc);
  }

  async findAll(
    actor: ActiveUserData,
    query: GetDocumentsQueryDto,
  ): Promise<PaginatedResponse<Document>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));
    const offset = (page - 1) * limit;
    const search = query.q?.toLowerCase();

    const qb = this.documentRepo
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.sender', 'sender')
      .leftJoinAndSelect('sender.department', 'senderDepartment')
      .leftJoinAndSelect('document.receiver', 'receiver')
      .leftJoinAndSelect('receiver.department', 'receiverDepartment')
      .leftJoinAndSelect('document.department', 'department')
      .orderBy('document.createdAt', 'DESC');

    if (query.type) {
      qb.andWhere('document.type = :type', { type: query.type });
    }
    if (query.status) {
      qb.andWhere('document.status = :status', { status: query.status });
    }
    if (search) {
      qb.andWhere(
        new Brackets((scopeQb) => {
          scopeQb
            .where('LOWER(document.title) LIKE :q', {
              q: `%${search}%`,
            })
            .orWhere('LOWER(document.description) LIKE :q', {
              q: `%${search}%`,
            });
        }),
      );
    }

    this.scopeService.applyDocumentScope(qb, actor, {
      senderAlias: 'sender',
      receiverAlias: 'receiver',
      departmentAlias: 'department',
    });

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number, actor: ActiveUserData): Promise<Document> {
    const doc = await this.documentRepo.findOne({
      where: { id },
      relations: {
        sender: { department: true },
        receiver: { department: true },
        department: true,
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    this.scopeService.assertDocumentScope(actor, doc);
    return doc;
  }

  async update(
    id: number,
    dto: UpdateDocumentDto,
    actor: ActiveUserData,
  ): Promise<Document> {
    const doc = await this.documentRepo.findOne({
      where: { id },
      relations: {
        sender: { department: true },
        receiver: { department: true },
        department: true,
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    this.scopeService.assertDocumentScope(actor, doc);

    if (dto.receiverId) {
      const receiver = await this.userRepo.findOneBy({ id: dto.receiverId });
      if (!receiver) throw new NotFoundException('Receiver not found');
      doc.receiver = receiver;
    }

    if (dto.departmentId) {
      const dept = await this.departmentRepo.findOneBy({
        id: dto.departmentId,
      });
      if (!dept) throw new NotFoundException('Department not found');
      doc.department = dept;
    }

    if (dto.title) doc.title = dto.title;
    if (dto.description) doc.description = dto.description;
    if (dto.type) doc.type = dto.type as Document['type'];
    if (dto.status) doc.status = dto.status as Document['status'];
    if (dto.fileName) doc.fileName = dto.fileName;
    if (dto.filePath) doc.filePath = dto.filePath;

    return this.documentRepo.save(doc);
  }

  async remove(id: number, actor: ActiveUserData): Promise<void> {
    const doc = await this.documentRepo.findOne({
      where: { id },
      relations: {
        sender: true,
        receiver: true,
        department: true,
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    this.scopeService.assertDocumentScope(actor, doc);
    await this.documentRepo.remove(doc);
  }

  async findDocumentFiles(
    documentId: number,
    actor: ActiveUserData,
  ): Promise<FileEntity[]> {
    await this.findOne(documentId, actor);
    return this.fileAttachmentsService.listResourceFiles({
      resourceType: 'document',
      resourceId: documentId,
      actor,
    });
  }

  async linkFile(
    documentId: number,
    fileId: number,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ): Promise<FileLinkEntity> {
    const [document, file] = await Promise.all([
      this.findOne(documentId, actor),
      this.fileAttachmentsService.findAttachableFile(fileId),
    ]);
    this.scopeService.assertDocumentFileLinkScope(actor, document, file);
    return this.fileAttachmentsService.linkResourceFile({
      resourceType: 'document',
      resourceId: documentId,
      file,
      actor,
      requestMeta,
    });
  }

  async unlinkFile(
    documentId: number,
    fileId: number,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ): Promise<{ unlinked: true }> {
    const [document, file] = await Promise.all([
      this.findOne(documentId, actor),
      this.fileAttachmentsService.findAttachableFile(fileId),
    ]);
    this.scopeService.assertDocumentFileLinkScope(actor, document, file);
    return this.fileAttachmentsService.unlinkResourceFile({
      resourceType: 'document',
      resourceId: documentId,
      file,
      actor,
      requestMeta,
    });
  }
}
