import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { EdmDocument } from './entities/edm-document.entity';
import { EdmDocumentRoute } from './entities/edm-document-route.entity';
import { EdmRouteStage } from './entities/edm-route-stage.entity';
import { EdmDocumentTimelineEvent } from './entities/edm-document-timeline-event.entity';
import { EdmDocumentReply } from './entities/edm-document-reply.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../department/entities/department.entity';
import type { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Role } from '../users/enums/role.enum';
import { FileAttachmentsService } from '../files/file-attachments.service';
import { FileEntity } from '../files/entities/file.entity';
import { FileLinkEntity } from '../files/entities/file-link.entity';
import { ScopeService } from '../iam/authorization/scope.service';
import { EdmCoreService } from './edm-core.service';
import { EdmTemplatesService } from './edm-templates.service';
import { EdmRouteService } from './edm-route.service';
import { CreateEdmDocumentDto } from './dto/create-edm-document.dto';
import { UpdateEdmDocumentDto } from './dto/update-edm-document.dto';
import { GetEdmDocumentsQueryDto } from './dto/get-edm-documents-query.dto';
import { PaginatedResponse } from '../common/http/pagination-query.dto';
import {
  AssignDocumentResponsibleDto,
  CreateDocumentReplyDto,
  ForwardEdmDocumentDto,
} from './dto/document-history.dto';
import { SavedDocumentsCriteriaDto } from './dto/saved-filters.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EdmDocumentArchivedEvent,
  EdmDocumentCreatedEvent,
  EdmEvents,
} from './events/edm-events';

@Injectable()
export class EdmDocumentService {
  constructor(
    @InjectRepository(EdmDocument)
    private readonly edmDocumentRepo: Repository<EdmDocument>,
    @InjectRepository(EdmDocumentRoute)
    private readonly edmRouteRepo: Repository<EdmDocumentRoute>,
    @InjectRepository(EdmRouteStage)
    private readonly edmStageRepo: Repository<EdmRouteStage>,
    @InjectRepository(EdmDocumentTimelineEvent)
    private readonly timelineRepo: Repository<EdmDocumentTimelineEvent>,
    @InjectRepository(EdmDocumentReply)
    private readonly replyRepo: Repository<EdmDocumentReply>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    private readonly dataSource: DataSource,
    private readonly fileAttachmentsService: FileAttachmentsService,
    private readonly scopeService: ScopeService,
    private readonly core: EdmCoreService,
    private readonly templates: EdmTemplatesService,
    private readonly routeService: EdmRouteService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createDraft(
    dto: CreateEdmDocumentDto,
    actor: ActiveUserData,
  ): Promise<EdmDocument> {
    const templateContext = dto.documentTemplateId
      ? await this.templates.resolveDocumentTemplateContext(
          dto.documentTemplateId,
          actor,
          dto.templateValues ?? {},
        )
      : null;

    const resolvedType = dto.type ?? templateContext?.resolved.type;
    const resolvedTitle = dto.title ?? templateContext?.resolved.title;
    const resolvedConfidentiality =
      dto.confidentiality ??
      templateContext?.resolved.confidentiality ??
      'public_internal';
    const resolvedSubject =
      dto.subject ?? templateContext?.resolved.subject ?? null;
    const resolvedSummary =
      dto.summary ?? templateContext?.resolved.summary ?? null;
    const resolvedResolutionText =
      dto.resolutionText ?? templateContext?.resolved.resolutionText ?? null;
    const resolvedDueAt = dto.dueAt ?? templateContext?.resolved.dueAt;

    if (!resolvedType) {
      throw new BadRequestException('Document type is required');
    }
    if (!resolvedTitle) {
      throw new BadRequestException('Document title is required');
    }

    const [creator, department, documentKind] = await Promise.all([
      this.userRepo.findOneBy({ id: actor.sub }),
      this.departmentRepo.findOneBy({ id: dto.departmentId }),
      this.templates.resolveDocumentKindOrNull(dto.documentKindId),
    ]);

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    if (
      !this.core.isGlobalEdmRole(actor.role) &&
      actor.departmentId !== department.id
    ) {
      throw new ForbiddenException('Document department is outside your scope');
    }

    const document = this.edmDocumentRepo.create({
      type: resolvedType as EdmDocument['type'],
      status: 'draft',
      title: resolvedTitle,
      subject: resolvedSubject,
      summary: resolvedSummary,
      resolutionText: resolvedResolutionText,
      confidentiality:
        resolvedConfidentiality as EdmDocument['confidentiality'],
      department,
      creator,
      documentKind,
      dueAt: resolvedDueAt ? new Date(resolvedDueAt) : null,
      externalNumber: null,
      currentRoute: null,
      approvedAt: null,
      rejectedAt: null,
      archivedAt: null,
      deletedAt: null,
    });

    const saved = await this.edmDocumentRepo.save(document);
    await this.core.recordTimelineEvent({
      document: saved,
      eventType: 'created',
      actorUser: creator,
      fromUser: creator,
      toUser: null,
      fromRole: actor.role,
      toRole: null,
      responsibleUser: null,
      parentEvent: null,
      threadId: `doc-${saved.id}-main`,
      commentText: null,
      meta: null,
    });

    this.eventEmitter.emit(
      EdmEvents.DOCUMENT_CREATED,
      new EdmDocumentCreatedEvent(
        saved.id,
        actor.sub,
        saved.type,
        saved.title,
        department.id,
      ),
    );

    return saved;
  }

  async updateDraft(
    id: number,
    dto: UpdateEdmDocumentDto,
    actor: ActiveUserData,
  ): Promise<EdmDocument> {
    const document = await this.core.getDocumentOrFail(id);
    this.core.assertDocumentScope(actor, document);

    const canChancelleryEditRegistered =
      actor.role === Role.Chancellery &&
      ['incoming', 'outgoing'].includes(document.type) &&
      document.status !== 'archived';

    if (document.status !== 'draft' && !canChancelleryEditRegistered) {
      throw new ConflictException(
        'Only draft documents are editable (except chancellery for incoming/outgoing)',
      );
    }

    const updatedFields: string[] = [];
    const statusBeforeUpdate = document.status;

    if (dto.type) {
      document.type = dto.type;
      updatedFields.push('type');
    }
    if (dto.title) {
      document.title = dto.title;
      updatedFields.push('title');
    }
    if (dto.subject !== undefined) {
      document.subject = dto.subject ?? null;
      updatedFields.push('subject');
    }
    if (dto.summary !== undefined) {
      document.summary = dto.summary ?? null;
      updatedFields.push('summary');
    }
    if (dto.resolutionText !== undefined) {
      document.resolutionText = dto.resolutionText ?? null;
      updatedFields.push('resolutionText');
    }
    if (dto.confidentiality) {
      document.confidentiality = dto.confidentiality;
      updatedFields.push('confidentiality');
    }
    if (dto.dueAt !== undefined) {
      document.dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
      updatedFields.push('dueAt');
    }
    if (dto.documentKindId !== undefined) {
      document.documentKind = await this.templates.resolveDocumentKindOrNull(dto.documentKindId);
      updatedFields.push('documentKindId');
    }

    const saved = await this.edmDocumentRepo.save(document);

    if (updatedFields.length) {
      const actorUser = await this.userRepo.findOneBy({ id: actor.sub });
      if (actorUser) {
        await this.core.recordTimelineEvent({
          document: saved,
          eventType: 'edited',
          actorUser,
          fromUser: actorUser,
          toUser: null,
          fromRole: actor.role,
          toRole: null,
          responsibleUser: null,
          parentEvent: null,
          threadId: `doc-${saved.id}-main`,
          commentText: null,
          meta: {
            updatedFields,
            statusBeforeUpdate,
            statusAfterUpdate: saved.status,
          },
        });
      }
    }

    return saved;
  }

  async archive(documentId: number, actor: ActiveUserData) {
    const document = await this.core.getDocumentOrFail(documentId);
    this.core.assertDocumentScope(actor, document);

    if (document.status !== 'approved') {
      throw new ConflictException('Only approved documents can be archived');
    }

    document.status = 'archived';
    document.archivedAt = new Date();
    const saved = await this.edmDocumentRepo.save(document);
    const actorUser = await this.userRepo.findOneBy({ id: actor.sub });
    if (actorUser) {
      await this.core.recordTimelineEvent({
        document: saved,
        eventType: 'archived',
        actorUser,
        fromUser: actorUser,
        toUser: null,
        fromRole: actor.role,
        toRole: null,
        responsibleUser: null,
        parentEvent: null,
        threadId: `doc-${saved.id}-main`,
        commentText: null,
        meta: null,
      });
    }

    this.eventEmitter.emit(
      EdmEvents.DOCUMENT_ARCHIVED,
      new EdmDocumentArchivedEvent(saved.id, actor.sub),
    );

    return {
      id: saved.id,
      status: saved.status,
      archivedAt: saved.archivedAt,
    };
  }

  async findAll(
    actor: ActiveUserData,
    query: GetEdmDocumentsQueryDto,
  ): Promise<PaginatedResponse<EdmDocument>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));
    const offset = (page - 1) * limit;
    const criteria = await this.resolveDocumentsCriteriaFromQuery(actor, query);

    const qb = this.edmDocumentRepo
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.creator', 'creator')
      .leftJoinAndSelect('document.department', 'department')
      .leftJoinAndSelect('document.documentKind', 'documentKind')
      .leftJoinAndSelect('document.currentRoute', 'currentRoute')
      .orderBy('document.createdAt', 'DESC');

    if (criteria.status) {
      qb.andWhere('document.status = :status', { status: criteria.status });
    }
    if (criteria.type) {
      qb.andWhere('document.type = :type', { type: criteria.type });
    }
    if (criteria.departmentId) {
      qb.andWhere('department.id = :departmentId', {
        departmentId: criteria.departmentId,
      });
    }
    if (criteria.creatorId) {
      qb.andWhere('creator.id = :creatorId', { creatorId: criteria.creatorId });
    }
    if (criteria.documentKindId) {
      qb.andWhere('documentKind.id = :documentKindId', {
        documentKindId: criteria.documentKindId,
      });
    }
    if (criteria.externalNumber) {
      qb.andWhere('document.externalNumber = :externalNumber', {
        externalNumber: criteria.externalNumber,
      });
    }
    if (criteria.fromDate) {
      qb.andWhere('document.createdAt >= :fromDate', {
        fromDate: new Date(criteria.fromDate),
      });
    }
    if (criteria.toDate) {
      qb.andWhere('document.createdAt <= :toDate', {
        toDate: new Date(criteria.toDate),
      });
    }
    if (criteria.q) {
      const search = `%${criteria.q.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((searchQb) => {
          searchQb
            .where('LOWER(document.title) LIKE :search', { search })
            .orWhere(`LOWER(COALESCE(document.subject, '')) LIKE :search`, {
              search,
            })
            .orWhere(`LOWER(COALESCE(document.summary, '')) LIKE :search`, {
              search,
            });
        }),
      );
    }

    this.core.applyDocumentListScope(qb, actor);

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(documentId: number, actor: ActiveUserData) {
    const document = await this.core.getDocumentOrFail(documentId);
    await this.core.assertDocumentReadScope(actor, document);

    const files = await this.fileAttachmentsService.listResourceFiles({
      resourceType: 'edm_document',
      resourceId: documentId,
      actor,
    });

    const route = document.currentRoute
      ? await this.findRoute(documentId, actor)
      : null;

    return {
      ...document,
      files,
      route,
    };
  }

  async listQueue(
    queue: 'inbox' | 'outbox' | 'my-approvals',
    actor: ActiveUserData,
    query: { page?: number; limit?: number; q?: string },
  ) {
    if (queue === 'my-approvals') {
      return this.findMyApprovals(actor, query);
    }

    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));
    const offset = (page - 1) * limit;

    const qb = this.edmDocumentRepo
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.creator', 'creator')
      .leftJoinAndSelect('document.department', 'department')
      .leftJoinAndSelect('document.documentKind', 'documentKind')
      .leftJoinAndSelect('document.currentRoute', 'currentRoute')
      .where('document.deletedAt IS NULL')
      .orderBy('document.updatedAt', 'DESC');

    if (query.q) {
      qb.andWhere('LOWER(document.title) LIKE :search', {
        search: `%${query.q.toLowerCase()}%`,
      });
    }

    if (queue === 'outbox') {
      qb.andWhere('creator.id = :actorId', { actorId: actor.sub });
      if (this.core.isDepartmentManagerRole(actor.role) && actor.departmentId) {
        qb.orWhere('department.id = :departmentId', {
          departmentId: actor.departmentId,
        });
      }
    } else {
      this.core.applyDocumentListScope(qb, actor);
      qb.andWhere('document.status = :inRouteStatus', {
        inRouteStatus: 'in_route',
      });
    }

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
    };
  }

  async listMailbox(
    mailbox: 'incoming' | 'outgoing',
    actor: ActiveUserData,
    query: { page?: number; limit?: number; q?: string },
  ) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));
    const offset = (page - 1) * limit;

    const qb = this.edmDocumentRepo
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.creator', 'creator')
      .leftJoinAndSelect('document.department', 'department')
      .leftJoinAndSelect('document.documentKind', 'documentKind')
      .leftJoinAndSelect('document.currentRoute', 'currentRoute')
      .where('document.deletedAt IS NULL')
      .orderBy('document.updatedAt', 'DESC');

    if (query.q) {
      qb.andWhere('LOWER(document.title) LIKE :search', {
        search: `%${query.q.toLowerCase()}%`,
      });
    }

    qb.andWhere('document.type = :mailboxType', {
      mailboxType: mailbox,
    });

    if (mailbox === 'incoming') {
      this.core.applyDocumentListScope(qb, actor);
    } else if (!this.core.isGlobalEdmRole(actor.role)) {
      qb.andWhere(
        new Brackets((scopeQb) => {
          scopeQb.where('creator.id = :actorId', { actorId: actor.sub });
          if (this.core.isDepartmentManagerRole(actor.role) && actor.departmentId) {
            scopeQb.orWhere('department.id = :departmentId', {
              departmentId: actor.departmentId,
            });
          }
        }),
      );
    }

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findRoute(documentId: number, actor: ActiveUserData) {
    const document = await this.core.getDocumentOrFail(documentId);
    await this.core.assertDocumentReadScope(actor, document);

    if (!document.currentRoute) {
      return null;
    }

    const route = await this.edmRouteRepo.findOne({
      where: { id: document.currentRoute.id },
      relations: {
        stages: {
          assigneeUser: true,
          assigneeDepartment: true,
          actions: {
            actorUser: true,
            onBehalfOfUser: true,
          },
        },
      },
    });

    if (!route) {
      return null;
    }

    return {
      id: route.id,
      state: route.state,
      versionNo: route.versionNo,
      completionPolicy: route.completionPolicy,
      stages: route.stages
        .sort((a, b) => a.orderNo - b.orderNo)
        .map((stage) => ({
          ...stage,
          actions: [...stage.actions].sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          ),
        })),
    };
  }

  async forwardDocument(
    documentId: number,
    dto: ForwardEdmDocumentDto,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    const document = await this.core.getDocumentOrFail(documentId);

    const [actorUser, toUser] = await Promise.all([
      this.userRepo.findOneBy({ id: actor.sub }),
      this.userRepo.findOne({
        where: { id: dto.toUserId },
        relations: { department: true },
      }),
    ]);

    if (!actorUser) {
      throw new NotFoundException('Actor not found');
    }
    if (!toUser) {
      throw new NotFoundException('Target user not found');
    }
    this.core.assertRoutingTargetAllowed(actor, toUser);

    const event = await this.core.recordTimelineEvent({
      document,
      eventType: 'forwarded',
      actorUser,
      fromUser: actorUser,
      toUser,
      fromRole: actor.role,
      toRole: toUser.role,
      responsibleUser: toUser,
      parentEvent: null,
      threadId: `doc-${document.id}-main`,
      commentText: dto.commentText ?? null,
      meta: {
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent,
      },
    });

    return this.timelineRepo.findOne({
      where: { id: event.id },
      relations: {
        actorUser: true,
        fromUser: true,
        toUser: true,
        responsibleUser: true,
      },
    });
  }

  async assignResponsible(
    documentId: number,
    dto: AssignDocumentResponsibleDto,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    const document = await this.core.getDocumentOrFail(documentId);
    await this.core.assertDocumentReadScope(actor, document);

    const [actorUser, responsibleUser] = await Promise.all([
      this.userRepo.findOneBy({ id: actor.sub }),
      this.userRepo.findOne({
        where: { id: dto.responsibleUserId },
        relations: { department: true },
      }),
    ]);
    if (!actorUser) {
      throw new NotFoundException('Actor not found');
    }
    if (!responsibleUser) {
      throw new NotFoundException('Responsible user not found');
    }
    this.core.assertRoutingTargetAllowed(actor, responsibleUser);

    const previousAssignment = await this.timelineRepo.findOne({
      where: {
        document: { id: documentId },
        eventType: 'responsible_assigned',
      },
      relations: {
        responsibleUser: true,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
    });
    const previousReassignment = await this.timelineRepo.findOne({
      where: {
        document: { id: documentId },
        eventType: 'responsible_reassigned',
      },
      relations: {
        responsibleUser: true,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
    });

    const latestAssignment =
      !previousAssignment || !previousReassignment
        ? (previousAssignment ?? previousReassignment)
        : previousAssignment.createdAt >= previousReassignment.createdAt
          ? previousAssignment
          : previousReassignment;

    const eventType = latestAssignment
      ? 'responsible_reassigned'
      : 'responsible_assigned';

    const event = await this.core.recordTimelineEvent({
      document,
      eventType,
      actorUser,
      fromUser: actorUser,
      toUser: responsibleUser,
      fromRole: actor.role,
      toRole: responsibleUser.role,
      responsibleUser,
      parentEvent: latestAssignment ?? null,
      threadId: `doc-${document.id}-main`,
      commentText: dto.reason ?? null,
      meta: {
        previousResponsibleUserId:
          latestAssignment?.responsibleUser?.id ?? null,
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent,
      },
    });

    return this.timelineRepo.findOne({
      where: { id: event.id },
      relations: {
        actorUser: true,
        toUser: true,
        responsibleUser: true,
        parentEvent: true,
      },
    });
  }

  async createReply(
    documentId: number,
    dto: CreateDocumentReplyDto,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    const document = await this.core.getDocumentOrFail(documentId);
    await this.core.assertDocumentReadScope(actor, document);

    return this.dataSource.transaction(async (manager) => {
      const actorUser = await manager
        .getRepository(User)
        .findOneBy({ id: actor.sub });
      if (!actorUser) {
        throw new NotFoundException('Actor not found');
      }

      const toUser = dto.toUserId
        ? await manager.getRepository(User).findOne({
            where: { id: dto.toUserId },
            relations: { department: true },
          })
        : null;
      if (dto.toUserId && !toUser) {
        throw new NotFoundException('Reply target user not found');
      }
      if (toUser) {
        this.core.assertRoutingTargetAllowed(actor, toUser);
      }

      let parentReply: EdmDocumentReply | null = null;
      if (dto.parentReplyId) {
        parentReply = await manager.getRepository(EdmDocumentReply).findOne({
          where: { id: dto.parentReplyId },
          relations: {
            document: true,
          },
        });
        if (!parentReply || parentReply.document.id !== documentId) {
          throw new NotFoundException('Parent reply not found for document');
        }
      }

      const threadId =
        parentReply?.threadId ?? `doc-${document.id}-thread-${Date.now()}`;
      const timelineEvent = await this.core.recordTimelineEvent(
        {
          document,
          eventType: 'reply_sent',
          actorUser,
          fromUser: actorUser,
          toUser: toUser ?? null,
          fromRole: actor.role,
          toRole: toUser?.role ?? null,
          responsibleUser: null,
          parentEvent: null,
          threadId,
          commentText: dto.messageText,
          meta: {
            parentReplyId: parentReply?.id ?? null,
            ip: requestMeta.ip,
            userAgent: requestMeta.userAgent,
          },
        },
        manager,
      );

      const reply = await manager.getRepository(EdmDocumentReply).save(
        manager.getRepository(EdmDocumentReply).create({
          document,
          timelineEvent,
          senderUser: actorUser,
          parentReply,
          threadId,
          messageText: dto.messageText.trim(),
        }),
      );

      return manager.getRepository(EdmDocumentReply).findOne({
        where: { id: reply.id },
        relations: {
          senderUser: true,
          parentReply: true,
          timelineEvent: true,
        },
      });
    });
  }

  async listReplies(documentId: number, actor: ActiveUserData) {
    const document = await this.core.getDocumentOrFail(documentId);
    await this.core.assertDocumentReadScope(actor, document);

    return this.replyRepo.find({
      where: {
        document: { id: documentId },
      },
      relations: {
        senderUser: true,
        parentReply: true,
        timelineEvent: true,
      },
      order: {
        createdAt: 'ASC',
        id: 'ASC',
      },
    });
  }

  async findFiles(
    documentId: number,
    actor: ActiveUserData,
  ): Promise<FileEntity[]> {
    const document = await this.core.getDocumentOrFail(documentId);
    await this.core.assertDocumentReadScope(actor, document);

    return this.fileAttachmentsService.listResourceFiles({
      resourceType: 'edm_document',
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
      this.core.getDocumentOrFail(documentId),
      this.fileAttachmentsService.findAttachableFile(fileId),
    ]);
    this.core.assertDocumentScope(actor, document);
    this.scopeService.assertFileScope(actor, file);

    return this.fileAttachmentsService.linkResourceFile({
      resourceType: 'edm_document',
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
      this.core.getDocumentOrFail(documentId),
      this.fileAttachmentsService.findAttachableFile(fileId),
    ]);
    this.core.assertDocumentScope(actor, document);
    this.scopeService.assertFileScope(actor, file);

    return this.fileAttachmentsService.unlinkResourceFile({
      resourceType: 'edm_document',
      resourceId: documentId,
      file,
      actor,
      requestMeta,
    });
  }

  private async resolveDocumentsCriteriaFromQuery(
    actor: ActiveUserData,
    query: GetEdmDocumentsQueryDto,
  ): Promise<SavedDocumentsCriteriaDto> {
    const directCriteria = this.core.normalizeDocumentsCriteria(query);
    if (!query.savedFilterId) {
      return directCriteria;
    }

    const savedFilter = await this.templates.findOwnedSavedFilter(
      query.savedFilterId,
      actor.sub,
    );
    const savedCriteria = this.core.normalizeDocumentsCriteria(savedFilter.criteria);
    return {
      ...savedCriteria,
      ...Object.fromEntries(
        Object.entries(directCriteria).filter(
          ([, value]) => value !== undefined,
        ),
      ),
    } as SavedDocumentsCriteriaDto;
  }

  private async findMyApprovals(
    actor: ActiveUserData,
    query: { page?: number; limit?: number; q?: string },
  ) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));
    const offset = (page - 1) * limit;

    const qb = this.edmStageRepo
      .createQueryBuilder('stage')
      .leftJoinAndSelect('stage.route', 'route')
      .leftJoinAndSelect('route.document', 'document')
      .leftJoinAndSelect('document.department', 'department')
      .leftJoinAndSelect('document.creator', 'creator')
      .leftJoinAndSelect('stage.assigneeUser', 'assigneeUser')
      .leftJoinAndSelect('stage.assigneeDepartment', 'assigneeDepartment')
      .where('stage.state = :state', { state: 'in_progress' })
      .andWhere('route.state = :routeState', { routeState: 'active' })
      .orderBy('stage.dueAt', 'ASC', 'NULLS LAST')
      .addOrderBy('stage.createdAt', 'ASC');

    qb.andWhere(
      new Brackets((scopeQb) => {
        scopeQb.where('assigneeUser.id = :actorId', { actorId: actor.sub });

        if (this.core.isDepartmentManagerRole(actor.role)) {
          scopeQb.orWhere(
            'stage.assigneeType = :departmentHeadType AND assigneeDepartment.id = :departmentId',
            {
              departmentHeadType: 'department_head',
              departmentId: actor.departmentId ?? -1,
            },
          );
          scopeQb.orWhere(
            'stage.assigneeType = :roleType AND stage.assigneeRole = :actorRole',
            {
              roleType: 'role',
              actorRole: actor.role,
            },
          );
        }
      }),
    );

    if (query.q) {
      qb.andWhere('LOWER(document.title) LIKE :search', {
        search: `%${query.q.toLowerCase()}%`,
      });
    }

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
    };
  }
}
