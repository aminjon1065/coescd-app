import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { EdmV2Document, EdmV2DocumentStatus } from '../entities/edm-document.entity';
import { EdmVersionsService } from './edm-versions.service';
import { EdmAuditService } from './edm-audit.service';
import { EdmV2Attachment } from '../entities/edm-attachment.entity';
import type { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';
import { OrgUnit } from '../../iam/entities/org-unit.entity';
import { EdmPermissionsService } from './edm-permissions.service';
import { Role } from '../../users/enums/role.enum';

export interface CreateDocumentDto {
  title: string;
  docType: string;
  departmentId?: number | null;
  orgUnitId?: number | null;
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
  orgUnitId?: number;
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
    @InjectRepository(OrgUnit)
    private readonly orgUnitRepo: Repository<OrgUnit>,
    private readonly versionsService: EdmVersionsService,
    private readonly auditService: EdmAuditService,
    private readonly permissionsService: EdmPermissionsService,
  ) {}

  /* ─────────────── CREATE ─────────────── */
  async create(actor: ActiveUserData, dto: CreateDocumentDto): Promise<EdmV2Document> {
    const actorId = actor.sub;
    const orgUnitId = dto.orgUnitId ?? actor.orgUnitId ?? null;

    if (orgUnitId) {
      const orgUnit = await this.orgUnitRepo.findOneBy({ id: orgUnitId });
      if (!orgUnit) {
        throw new NotFoundException('Org unit not found');
      }
    }

    const doc = this.repo.create({
      title: dto.title,
      docType: dto.docType,
      departmentId: dto.departmentId ?? null,
      orgUnitId,
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

    return this.findById(saved.id, actor);
  }

  /* ─────────────── FIND ONE ─────────────── */
  async findById(id: string, actor?: ActiveUserData): Promise<EdmV2Document> {
    const doc = await this.repo.findOne({
      where: { id, isDeleted: false },
      relations: ['owner', 'createdBy', 'department', 'orgUnit', 'attachments', 'attachments.uploadedBy'],
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (actor) {
      await this.permissionsService.canOrThrow(this.toUserContext(actor), doc, 'view');
    }
    return doc;
  }

  /* ─────────────── SEARCH / LIST ─────────────── */
  async search(actor: ActiveUserData, dto: SearchDocumentsDto): Promise<[EdmV2Document[], number]> {
    const page = dto.page ?? 1;
    const limit = Math.min(dto.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.owner', 'owner')
      .leftJoinAndSelect('doc.department', 'department')
      .leftJoinAndSelect('doc.orgUnit', 'orgUnit')
      .where('doc.is_deleted = false');

    if (!this.isGlobalDocReader(actor)) {
      qb.andWhere(
        new Brackets((scopeQb) => {
          scopeQb.where('doc.owner_id = :actorId', { actorId: actor.sub });

          if (actor.departmentId) {
            scopeQb.orWhere('doc.department_id = :actorDepartmentId', {
              actorDepartmentId: actor.departmentId,
            });
          }

          if (actor.orgUnitPath) {
            scopeQb
              .orWhere('orgUnit.path = :actorOrgUnitPath', {
                actorOrgUnitPath: actor.orgUnitPath,
              })
              .orWhere('orgUnit.path LIKE :actorOrgUnitPathPrefix', {
                actorOrgUnitPathPrefix: `${actor.orgUnitPath}.%`,
              });
          }

          scopeQb.orWhere(
            `EXISTS (
              SELECT 1
              FROM edm_v2_workflow_instances wi
              INNER JOIN edm_v2_workflow_assignments wa
                ON wa.instance_id = wi.id
             WHERE wi.document_id = doc.id
               AND wi.status = 'active'
               AND wa.assignee_id = :actorId
               AND wa.acted_at IS NULL
            )`,
            { actorId: actor.sub },
          );
        }),
      );
    }

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
    if (dto.orgUnitId) {
      qb.andWhere('doc.org_unit_id = :orgUnitId', { orgUnitId: dto.orgUnitId });
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
    actor: ActiveUserData,
    dto: UpdateDocumentDto,
  ): Promise<EdmV2Document> {
    const actorId = actor.sub;
    const doc = await this.findById(id, actor);
    await this.permissionsService.canOrThrow(this.toUserContext(actor), doc, 'edit');
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
    actor: ActiveUserData,
    content: Record<string, unknown>,
    autoSave = true,
  ): Promise<void> {
    const actorId = actor.sub;
    const doc = await this.findById(id, actor);
    await this.permissionsService.canOrThrow(this.toUserContext(actor), doc, 'edit');
    await this.versionsService.save(
      id,
      content,
      actorId,
      autoSave ? 'auto_save' : 'manual_save',
    );
    await this.repo.update(id, { updatedById: actorId });
  }

  /* ─────────────── SOFT DELETE ─────────────── */
  async delete(id: string, actor: ActiveUserData): Promise<void> {
    const actorId = actor.sub;
    const doc = await this.findById(id, actor);
    await this.permissionsService.canOrThrow(this.toUserContext(actor), doc, 'delete');
    await this.repo.update(id, { isDeleted: true, updatedById: actorId });
    await this.auditService.log('document', id, 'DELETED', actorId);
  }

  /* ─────────────── ARCHIVE ─────────────── */
  async archive(id: string, actor: ActiveUserData): Promise<EdmV2Document> {
    const actorId = actor.sub;
    const doc = await this.findById(id, actor);
    await this.permissionsService.canOrThrow(this.toUserContext(actor), doc, 'approve');
    await this.repo.update(id, {
      status: 'archived',
      archivedAt: new Date(),
      updatedById: actorId,
    });
    await this.auditService.log('document', id, 'ARCHIVED', actorId);
    return this.findById(id, actor);
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

  async listAttachments(documentId: string, actor: ActiveUserData): Promise<EdmV2Attachment[]> {
    await this.findById(documentId, actor);
    return this.attachRepo.find({
      where: { documentId },
      relations: ['uploadedBy'],
      order: { uploadedAt: 'DESC' },
    });
  }

  async deleteAttachment(attachmentId: string, actor: ActiveUserData): Promise<void> {
    const attachment = await this.attachRepo.findOne({ where: { id: attachmentId } });
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }
    const doc = await this.findById(attachment.documentId, actor);
    await this.permissionsService.canOrThrow(this.toUserContext(actor), doc, 'edit');
    await this.attachRepo.delete(attachmentId);
  }

  /* ─────────────── MY QUEUE (assigned to me) ─────────────── */
  async myQueue(actor: ActiveUserData): Promise<EdmV2Document[]> {
    const userId = actor.sub;
    const qb = this.repo
      .createQueryBuilder('doc')
      .innerJoin('edm_v2_workflow_instances', 'wi', 'wi.document_id = doc.id AND wi.status = :ws', { ws: 'active' })
      .innerJoin('edm_v2_workflow_assignments', 'wa', 'wa.instance_id = wi.id AND wa.assignee_id = :uid AND wa.acted_at IS NULL', { uid: userId })
      .leftJoinAndSelect('doc.owner', 'owner')
      .leftJoinAndSelect('doc.department', 'department')
      .leftJoinAndSelect('doc.orgUnit', 'orgUnit')
      .where('doc.is_deleted = false')
      .orderBy('doc.updated_at', 'DESC');
    return qb.getMany();
  }

  async requirePermission(
    documentId: string,
    actor: ActiveUserData,
    permission: 'view' | 'comment' | 'edit' | 'approve' | 'share' | 'delete',
  ): Promise<EdmV2Document> {
    const doc = await this.findById(documentId, actor);
    await this.permissionsService.canOrThrow(this.toUserContext(actor), doc, permission);
    return doc;
  }

  private isGlobalDocReader(actor: ActiveUserData): boolean {
    return (
      actor.role === Role.Admin ||
      actor.role === Role.Chairperson ||
      actor.role === Role.FirstDeputy ||
      actor.role === Role.Deputy
    );
  }

  private toUserContext(actor: ActiveUserData) {
    return {
      id: actor.sub,
      role: actor.role,
      departmentId: actor.departmentId ?? null,
      orgUnitId: actor.orgUnitId ?? null,
      orgUnitPath: actor.orgUnitPath ?? null,
    };
  }
}
