import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { EdmV2Document, EdmV2DocumentStatus } from '../entities/edm-document.entity';
import { EdmVersionsService } from './edm-versions.service';
import { EdmAuditService } from './edm-audit.service';
import { EdmV2Attachment } from '../entities/edm-attachment.entity';

export interface CreateDocumentDto {
  title: string;
  docType: string;
  departmentId?: number | null;
  metadata?: Record<string, unknown>;
  tags?: string[];
  initialContent?: Record<string, unknown>;
}

export interface UpdateDocumentDto {
  title?: string;
  docType?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  externalRef?: string | null;
}

export interface SearchDocumentsDto {
  q?: string;
  status?: EdmV2DocumentStatus | EdmV2DocumentStatus[];
  ownerId?: number;
  departmentId?: number;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'updated_at' | 'title';
  sortDir?: 'ASC' | 'DESC';
}

@Injectable()
export class EdmDocumentsService {
  constructor(
    @InjectRepository(EdmV2Document)
    private readonly repo: Repository<EdmV2Document>,
    @InjectRepository(EdmV2Attachment)
    private readonly attachRepo: Repository<EdmV2Attachment>,
    private readonly versionsService: EdmVersionsService,
    private readonly auditService: EdmAuditService,
  ) {}

  /* ─────────────── CREATE ─────────────── */
  async create(actorId: number, dto: CreateDocumentDto): Promise<EdmV2Document> {
    const doc = this.repo.create({
      title: dto.title,
      docType: dto.docType,
      departmentId: dto.departmentId ?? null,
      ownerId: actorId,
      createdById: actorId,
      updatedById: actorId,
      tags: dto.tags ?? [],
      metadata: dto.metadata ?? {},
      status: 'draft',
      currentVersion: 1,
    });
    const saved = await this.repo.save(doc);

    // Create version 1
    await this.versionsService.save(
      saved.id,
      dto.initialContent ?? { type: 'doc', content: [] },
      actorId,
      'manual_save',
      'Initial version',
    );

    await this.auditService.log('document', saved.id, 'CREATED', actorId, {
      context: { title: dto.title, docType: dto.docType },
    });

    return this.findById(saved.id);
  }

  /* ─────────────── FIND ONE ─────────────── */
  async findById(id: string): Promise<EdmV2Document> {
    const doc = await this.repo.findOne({
      where: { id, isDeleted: false },
      relations: ['owner', 'createdBy', 'department', 'attachments', 'attachments.uploadedBy'],
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  /* ─────────────── SEARCH / LIST ─────────────── */
  async search(dto: SearchDocumentsDto): Promise<[EdmV2Document[], number]> {
    const page = dto.page ?? 1;
    const limit = Math.min(dto.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.owner', 'owner')
      .leftJoinAndSelect('doc.department', 'department')
      .where('doc.is_deleted = false');

    if (dto.q) {
      qb.andWhere('doc.title ILIKE :q', { q: `%${dto.q}%` });
    }
    if (dto.status) {
      const statuses = Array.isArray(dto.status) ? dto.status : [dto.status];
      qb.andWhere('doc.status IN (:...statuses)', { statuses });
    }
    if (dto.ownerId) {
      qb.andWhere('doc.owner_id = :ownerId', { ownerId: dto.ownerId });
    }
    if (dto.departmentId) {
      qb.andWhere('doc.department_id = :deptId', { deptId: dto.departmentId });
    }
    if (dto.tags?.length) {
      qb.andWhere('doc.tags @> ARRAY[:...tags]::text[]', { tags: dto.tags });
    }
    if (dto.dateFrom) {
      qb.andWhere('doc.created_at >= :from', { from: dto.dateFrom });
    }
    if (dto.dateTo) {
      qb.andWhere('doc.created_at <= :to', { to: dto.dateTo });
    }

    const sortCol = dto.sortBy === 'title' ? 'doc.title'
      : dto.sortBy === 'created_at' ? 'doc.created_at'
      : 'doc.updated_at';
    qb.orderBy(sortCol, dto.sortDir ?? 'DESC');
    qb.skip(offset).take(limit);

    return qb.getManyAndCount();
  }

  /* ─────────────── UPDATE METADATA ─────────────── */
  async updateMetadata(
    id: string,
    actorId: number,
    dto: UpdateDocumentDto,
  ): Promise<EdmV2Document> {
    const doc = await this.findById(id);
    const changes: Record<string, [unknown, unknown]> = {};

    if (dto.title !== undefined && dto.title !== doc.title) {
      changes['title'] = [doc.title, dto.title];
      doc.title = dto.title;
    }
    if (dto.tags !== undefined) {
      changes['tags'] = [doc.tags, dto.tags];
      doc.tags = dto.tags;
    }
    if (dto.metadata !== undefined) {
      doc.metadata = { ...doc.metadata, ...dto.metadata };
    }
    if (dto.externalRef !== undefined) {
      changes['externalRef'] = [doc.externalRef, dto.externalRef];
      doc.externalRef = dto.externalRef;
    }
    doc.updatedById = actorId;
    const saved = await this.repo.save(doc);

    if (Object.keys(changes).length > 0) {
      await this.auditService.log('document', id, 'METADATA_UPDATED', actorId, { changes });
    }
    return saved;
  }

  /* ─────────────── SAVE CONTENT ─────────────── */
  async saveContent(
    id: string,
    actorId: number,
    content: Record<string, unknown>,
    autoSave = true,
  ): Promise<void> {
    await this.versionsService.save(
      id,
      content,
      actorId,
      autoSave ? 'auto_save' : 'manual_save',
    );
    await this.repo.update(id, { updatedById: actorId });
  }

  /* ─────────────── SOFT DELETE ─────────────── */
  async delete(id: string, actorId: number): Promise<void> {
    await this.repo.update(id, { isDeleted: true, updatedById: actorId });
    await this.auditService.log('document', id, 'DELETED', actorId);
  }

  /* ─────────────── ARCHIVE ─────────────── */
  async archive(id: string, actorId: number): Promise<EdmV2Document> {
    await this.repo.update(id, {
      status: 'archived',
      archivedAt: new Date(),
      updatedById: actorId,
    });
    await this.auditService.log('document', id, 'ARCHIVED', actorId);
    return this.findById(id);
  }

  /* ─────────────── ATTACHMENTS ─────────────── */
  async addAttachment(
    documentId: string,
    actorId: number,
    data: {
      fileName: string;
      fileSize: number;
      mimeType: string;
      storageKey: string;
      checksum: string;
    },
  ): Promise<EdmV2Attachment> {
    const attachment = this.attachRepo.create({
      documentId,
      uploadedById: actorId,
      ...data,
    });
    return this.attachRepo.save(attachment);
  }

  async listAttachments(documentId: string): Promise<EdmV2Attachment[]> {
    return this.attachRepo.find({
      where: { documentId },
      relations: ['uploadedBy'],
      order: { uploadedAt: 'DESC' },
    });
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    await this.attachRepo.delete(attachmentId);
  }

  /* ─────────────── MY QUEUE (assigned to me) ─────────────── */
  async myQueue(userId: number): Promise<EdmV2Document[]> {
    const qb = this.repo
      .createQueryBuilder('doc')
      .innerJoin('edm_v2_workflow_instances', 'wi', 'wi.document_id = doc.id AND wi.status = :ws', { ws: 'active' })
      .innerJoin('edm_v2_workflow_assignments', 'wa', 'wa.instance_id = wi.id AND wa.assignee_id = :uid AND wa.acted_at IS NULL', { uid: userId })
      .leftJoinAndSelect('doc.owner', 'owner')
      .leftJoinAndSelect('doc.department', 'department')
      .where('doc.is_deleted = false')
      .orderBy('doc.updated_at', 'DESC');
    return qb.getMany();
  }
}
