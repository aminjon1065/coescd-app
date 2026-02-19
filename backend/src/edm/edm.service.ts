import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import { EntityManager } from 'typeorm';
import * as XLSX from 'xlsx';
import { EdmDocument } from './entities/edm-document.entity';
import {
  EdmDocumentRoute,
  EdmRouteCompletionPolicy,
} from './entities/edm-document-route.entity';
import { EdmRouteStage } from './entities/edm-route-stage.entity';
import { EdmStageAction } from './entities/edm-stage-action.entity';
import { EdmDocumentRegistrySequence } from './entities/edm-document-registry-sequence.entity';
import { IamDelegation } from './entities/iam-delegation.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../department/entities/department.entity';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Role } from '../users/enums/role.enum';
import { Permission } from '../iam/authorization/permission.type';
import { CreateEdmDocumentDto } from './dto/create-edm-document.dto';
import { UpdateEdmDocumentDto } from './dto/update-edm-document.dto';
import { GetEdmDocumentsQueryDto } from './dto/get-edm-documents-query.dto';
import {
  EdmOverrideDto,
  ExecuteEdmStageActionDto,
  SubmitEdmRouteStageDto,
  SubmitEdmDocumentDto,
} from './dto/submit-edm-document.dto';
import {
  CreateRouteTemplateDto,
  GetRouteTemplatesQueryDto,
  RouteTemplateStageDto,
  UpdateRouteTemplateDto,
} from './dto/route-template.dto';
import { PaginatedResponse } from '../common/http/pagination-query.dto';
import { FileAttachmentsService } from '../files/file-attachments.service';
import { FileEntity } from '../files/entities/file.entity';
import { FileLinkEntity } from '../files/entities/file-link.entity';
import { ScopeService } from '../iam/authorization/scope.service';
import { EdmRouteTemplate } from './entities/edm-route-template.entity';
import { EdmRouteTemplateStage } from './entities/edm-route-template-stage.entity';
import { EdmRegistrationJournal } from './entities/edm-registration-journal.entity';
import { EdmDocumentTaskLink } from './entities/edm-document-task-link.entity';
import {
  GetRegistrationJournalQueryDto,
  UpdateRegistrationStatusDto,
} from './dto/registration-journal.dto';
import { CreateResolutionTasksDto } from './dto/document-resolution-tasks.dto';
import { Task } from '../task/entities/task.entity';
import { EdmAlert } from './entities/edm-alert.entity';
import { GetAlertsQueryDto } from './dto/alerts.dto';
import { EdmSavedFilter } from './entities/edm-saved-filter.entity';
import {
  CreateSavedFilterDto,
  GetSavedFiltersQueryDto,
  SavedDocumentsCriteriaDto,
  UpdateSavedFilterDto,
} from './dto/saved-filters.dto';
import { EdmDocumentTemplate } from './entities/edm-document-template.entity';
import { EdmDocumentTemplateField } from './entities/edm-document-template-field.entity';
import {
  CreateDocumentTemplateDto,
  DocumentTemplateFieldDto,
  GetDocumentTemplatesQueryDto,
  UpdateDocumentTemplateDto,
} from './dto/document-template.dto';
import { EdmDashboardQueryDto, EdmReportsQueryDto } from './dto/reports.dto';
import { EdmDocumentTimelineEvent } from './entities/edm-document-timeline-event.entity';
import { EdmDocumentReply } from './entities/edm-document-reply.entity';
import {
  AssignDocumentResponsibleDto,
  CreateDocumentReplyDto,
  ForwardEdmDocumentDto,
} from './dto/document-history.dto';
import {
  GetDocumentAuditQueryDto,
  GetDocumentHistoryQueryDto,
} from './dto/document-audit-query.dto';

@Injectable()
export class EdmService {
  constructor(
    @InjectRepository(EdmDocument)
    private readonly edmDocumentRepo: Repository<EdmDocument>,
    @InjectRepository(EdmDocumentRoute)
    private readonly edmRouteRepo: Repository<EdmDocumentRoute>,
    @InjectRepository(EdmRouteStage)
    private readonly edmStageRepo: Repository<EdmRouteStage>,
    @InjectRepository(EdmStageAction)
    private readonly edmActionRepo: Repository<EdmStageAction>,
    @InjectRepository(EdmDocumentRegistrySequence)
    private readonly edmSequenceRepo: Repository<EdmDocumentRegistrySequence>,
    @InjectRepository(IamDelegation)
    private readonly delegationRepo: Repository<IamDelegation>,
    @InjectRepository(EdmRouteTemplate)
    private readonly routeTemplateRepo: Repository<EdmRouteTemplate>,
    @InjectRepository(EdmRouteTemplateStage)
    private readonly routeTemplateStageRepo: Repository<EdmRouteTemplateStage>,
    @InjectRepository(EdmRegistrationJournal)
    private readonly registrationJournalRepo: Repository<EdmRegistrationJournal>,
    @InjectRepository(EdmDocumentTaskLink)
    private readonly documentTaskLinkRepo: Repository<EdmDocumentTaskLink>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(EdmAlert)
    private readonly alertRepo: Repository<EdmAlert>,
    @InjectRepository(EdmSavedFilter)
    private readonly savedFilterRepo: Repository<EdmSavedFilter>,
    @InjectRepository(EdmDocumentTemplate)
    private readonly documentTemplateRepo: Repository<EdmDocumentTemplate>,
    @InjectRepository(EdmDocumentTemplateField)
    private readonly documentTemplateFieldRepo: Repository<EdmDocumentTemplateField>,
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
  ) {}

  async createSavedFilter(
    dto: CreateSavedFilterDto,
    actor: ActiveUserData,
  ): Promise<EdmSavedFilter> {
    const user = await this.userRepo.findOneBy({ id: actor.sub });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const scope = dto.scope ?? 'documents';
    const criteria = this.normalizeDocumentsCriteria(dto.criteria) as Record<
      string,
      unknown
    >;
    if (dto.isDefault) {
      await this.savedFilterRepo.update(
        { user: { id: actor.sub }, scope },
        { isDefault: false },
      );
    }

    const created = this.savedFilterRepo.create({
      user,
      scope,
      name: dto.name,
      criteria,
      isDefault: dto.isDefault ?? false,
    });
    return this.savedFilterRepo.save(created);
  }

  async listSavedFilters(
    actor: ActiveUserData,
    query: GetSavedFiltersQueryDto,
  ): Promise<EdmSavedFilter[]> {
    return this.savedFilterRepo.find({
      where: {
        user: { id: actor.sub },
        scope: query.scope ?? 'documents',
      },
      order: {
        isDefault: 'DESC',
        updatedAt: 'DESC',
      },
    });
  }

  async updateSavedFilter(
    filterId: number,
    dto: UpdateSavedFilterDto,
    actor: ActiveUserData,
  ): Promise<EdmSavedFilter> {
    const filter = await this.findOwnedSavedFilter(filterId, actor.sub);

    if (dto.name !== undefined) {
      filter.name = dto.name;
    }
    if (dto.criteria !== undefined) {
      filter.criteria = this.normalizeDocumentsCriteria(dto.criteria) as Record<
        string,
        unknown
      >;
    }
    if (dto.isDefault !== undefined) {
      if (dto.isDefault) {
        await this.savedFilterRepo.update(
          { user: { id: actor.sub }, scope: filter.scope },
          { isDefault: false },
        );
      }
      filter.isDefault = dto.isDefault;
    }

    return this.savedFilterRepo.save(filter);
  }

  async deleteSavedFilter(
    filterId: number,
    actor: ActiveUserData,
  ): Promise<void> {
    const filter = await this.findOwnedSavedFilter(filterId, actor.sub);
    await this.savedFilterRepo.remove(filter);
  }

  async createDocumentTemplate(
    dto: CreateDocumentTemplateDto,
    actor: ActiveUserData,
  ): Promise<EdmDocumentTemplate> {
    if (!dto.fields.length) {
      throw new BadRequestException('Document template requires fields');
    }

    const creator = await this.userRepo.findOneBy({ id: actor.sub });
    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const department =
      dto.scopeType === 'department'
        ? await this.resolveTemplateDepartment(dto.departmentId, actor)
        : null;

    const template = await this.documentTemplateRepo.save(
      this.documentTemplateRepo.create({
        name: dto.name,
        description: dto.description ?? null,
        documentType: dto.documentType,
        scopeType: dto.scopeType,
        department,
        isActive: dto.isActive ?? true,
        createdBy: creator,
        updatedBy: null,
        deletedAt: null,
      }),
    );

    await this.replaceDocumentTemplateFields(template, dto.fields);
    return this.findDocumentTemplate(template.id, actor);
  }

  async listDocumentTemplates(
    actor: ActiveUserData,
    query: GetDocumentTemplatesQueryDto,
  ): Promise<EdmDocumentTemplate[]> {
    const qb = this.documentTemplateRepo
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.department', 'department')
      .leftJoinAndSelect('template.createdBy', 'createdBy')
      .leftJoinAndSelect('template.updatedBy', 'updatedBy')
      .leftJoinAndSelect('template.fields', 'fields')
      .where('template.deletedAt IS NULL')
      .orderBy('template.updatedAt', 'DESC')
      .addOrderBy('fields.sortOrder', 'ASC');

    if (query.documentType) {
      qb.andWhere('template.documentType = :documentType', {
        documentType: query.documentType,
      });
    }
    if (query.onlyActive ?? true) {
      qb.andWhere('template.isActive = true');
    }

    if (!this.isGlobalEdmRole(actor.role)) {
      qb.andWhere(
        new Brackets((scopeQb) => {
          scopeQb
            .where('template.scopeType = :globalScope', {
              globalScope: 'global',
            })
            .orWhere('department.id = :departmentId', {
              departmentId: actor.departmentId ?? -1,
            });
        }),
      );
    }

    return qb.getMany();
  }

  async findDocumentTemplate(
    templateId: number,
    actor: ActiveUserData,
  ): Promise<EdmDocumentTemplate> {
    const template = await this.documentTemplateRepo.findOne({
      where: { id: templateId },
      relations: {
        department: true,
        createdBy: true,
        updatedBy: true,
        fields: true,
      },
    });
    if (!template || template.deletedAt) {
      throw new NotFoundException('Document template not found');
    }
    this.assertDocumentTemplateScope(actor, template);
    template.fields = [...template.fields].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    return template;
  }

  async updateDocumentTemplate(
    templateId: number,
    dto: UpdateDocumentTemplateDto,
    actor: ActiveUserData,
  ): Promise<EdmDocumentTemplate> {
    const template = await this.findDocumentTemplate(templateId, actor);
    this.assertDocumentTemplateWriteScope(actor, template);

    if (dto.name !== undefined) {
      template.name = dto.name;
    }
    if (dto.description !== undefined) {
      template.description = dto.description ?? null;
    }
    if (dto.isActive !== undefined) {
      template.isActive = dto.isActive;
    }
    template.updatedBy =
      (await this.userRepo.findOneBy({ id: actor.sub })) ?? null;
    await this.documentTemplateRepo.save(template);

    if (dto.fields) {
      if (!dto.fields.length) {
        throw new BadRequestException('Document template requires fields');
      }
      await this.replaceDocumentTemplateFields(template, dto.fields);
    }

    return this.findDocumentTemplate(template.id, actor);
  }

  async deleteDocumentTemplate(
    templateId: number,
    actor: ActiveUserData,
  ): Promise<void> {
    const template = await this.findDocumentTemplate(templateId, actor);
    this.assertDocumentTemplateWriteScope(actor, template);
    template.deletedAt = new Date();
    template.isActive = false;
    template.updatedBy =
      (await this.userRepo.findOneBy({ id: actor.sub })) ?? null;
    await this.documentTemplateRepo.save(template);
  }

  async createDraft(
    dto: CreateEdmDocumentDto,
    actor: ActiveUserData,
  ): Promise<EdmDocument> {
    const templateContext = dto.documentTemplateId
      ? await this.resolveDocumentTemplateContext(
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

    const [creator, department] = await Promise.all([
      this.userRepo.findOneBy({ id: actor.sub }),
      this.departmentRepo.findOneBy({ id: dto.departmentId }),
    ]);

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    if (
      !this.isGlobalEdmRole(actor.role) &&
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
      dueAt: resolvedDueAt ? new Date(resolvedDueAt) : null,
      externalNumber: null,
      currentRoute: null,
      approvedAt: null,
      rejectedAt: null,
      archivedAt: null,
      deletedAt: null,
    });

    const saved = await this.edmDocumentRepo.save(document);
    await this.recordTimelineEvent({
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

    return saved;
  }

  async updateDraft(
    id: number,
    dto: UpdateEdmDocumentDto,
    actor: ActiveUserData,
  ): Promise<EdmDocument> {
    const document = await this.getDocumentOrFail(id);
    this.assertDocumentScope(actor, document);

    if (document.status !== 'draft') {
      throw new ConflictException('Only draft documents are editable');
    }

    if (dto.type) {
      document.type = dto.type;
    }
    if (dto.title) {
      document.title = dto.title;
    }
    if (dto.subject !== undefined) {
      document.subject = dto.subject ?? null;
    }
    if (dto.summary !== undefined) {
      document.summary = dto.summary ?? null;
    }
    if (dto.resolutionText !== undefined) {
      document.resolutionText = dto.resolutionText ?? null;
    }
    if (dto.confidentiality) {
      document.confidentiality = dto.confidentiality;
    }
    if (dto.dueAt !== undefined) {
      document.dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    }

    return this.edmDocumentRepo.save(document);
  }

  async createRouteTemplate(
    dto: CreateRouteTemplateDto,
    actor: ActiveUserData,
  ): Promise<EdmRouteTemplate> {
    if (!dto.stages?.length) {
      throw new BadRequestException(
        'Route template requires at least one stage',
      );
    }

    const creator = await this.userRepo.findOneBy({ id: actor.sub });
    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const department =
      dto.scopeType === 'department'
        ? await this.resolveTemplateDepartment(dto.departmentId, actor)
        : null;

    const template = await this.routeTemplateRepo.save(
      this.routeTemplateRepo.create({
        name: dto.name,
        description: dto.description ?? null,
        scopeType: dto.scopeType,
        department,
        isActive: dto.isActive ?? true,
        createdBy: creator,
        updatedBy: null,
        deletedAt: null,
      }),
    );

    await this.replaceTemplateStages(template, dto.stages);
    return this.findRouteTemplate(template.id, actor);
  }

  async listRouteTemplates(
    actor: ActiveUserData,
    query: GetRouteTemplatesQueryDto,
  ): Promise<EdmRouteTemplate[]> {
    const qb = this.routeTemplateRepo
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.department', 'department')
      .leftJoinAndSelect('template.createdBy', 'createdBy')
      .leftJoinAndSelect('template.updatedBy', 'updatedBy')
      .leftJoinAndSelect('template.stages', 'stages')
      .leftJoinAndSelect('stages.assigneeUser', 'assigneeUser')
      .leftJoinAndSelect('stages.assigneeDepartment', 'assigneeDepartment')
      .where('template.deletedAt IS NULL')
      .orderBy('template.updatedAt', 'DESC')
      .addOrderBy('stages.orderNo', 'ASC');

    if (query.onlyActive ?? true) {
      qb.andWhere('template.isActive = true');
    }

    if (query.q) {
      qb.andWhere('LOWER(template.name) LIKE :search', {
        search: `%${query.q.toLowerCase()}%`,
      });
    }

    if (!this.isGlobalEdmRole(actor.role)) {
      qb.andWhere(
        new Brackets((scopeQb) => {
          scopeQb
            .where('template.scopeType = :globalScope', {
              globalScope: 'global',
            })
            .orWhere('department.id = :departmentId', {
              departmentId: actor.departmentId ?? -1,
            });
        }),
      );
    }

    return qb.getMany();
  }

  async findRouteTemplate(
    templateId: number,
    actor: ActiveUserData,
  ): Promise<EdmRouteTemplate> {
    const template = await this.routeTemplateRepo.findOne({
      where: { id: templateId },
      relations: {
        department: true,
        createdBy: true,
        updatedBy: true,
        stages: {
          assigneeUser: true,
          assigneeDepartment: true,
        },
      },
    });

    if (!template || template.deletedAt) {
      throw new NotFoundException('Route template not found');
    }

    this.assertTemplateScope(actor, template);
    template.stages = [...template.stages].sort(
      (a, b) => a.orderNo - b.orderNo,
    );
    return template;
  }

  async updateRouteTemplate(
    templateId: number,
    dto: UpdateRouteTemplateDto,
    actor: ActiveUserData,
  ): Promise<EdmRouteTemplate> {
    const template = await this.findRouteTemplate(templateId, actor);
    this.assertTemplateWriteScope(actor, template);

    if (dto.name !== undefined) {
      template.name = dto.name;
    }
    if (dto.description !== undefined) {
      template.description = dto.description ?? null;
    }
    if (dto.isActive !== undefined) {
      template.isActive = dto.isActive;
    }

    const updater = await this.userRepo.findOneBy({ id: actor.sub });
    template.updatedBy = updater ?? null;
    await this.routeTemplateRepo.save(template);

    if (dto.stages) {
      if (!dto.stages.length) {
        throw new BadRequestException(
          'Route template requires at least one stage',
        );
      }
      await this.replaceTemplateStages(template, dto.stages);
    }

    return this.findRouteTemplate(template.id, actor);
  }

  async deleteRouteTemplate(
    templateId: number,
    actor: ActiveUserData,
  ): Promise<void> {
    const template = await this.findRouteTemplate(templateId, actor);
    this.assertTemplateWriteScope(actor, template);
    template.deletedAt = new Date();
    template.isActive = false;
    template.updatedBy =
      (await this.userRepo.findOneBy({ id: actor.sub })) ?? null;
    await this.routeTemplateRepo.save(template);
  }

  async registerDocument(documentId: number, actor: ActiveUserData) {
    const document = await this.getDocumentOrFail(documentId);
    this.assertDocumentScope(actor, document);

    if (document.type !== 'incoming' && document.type !== 'outgoing') {
      throw new BadRequestException(
        'Only incoming/outgoing documents can be registered in journal',
      );
    }
    const journalType = document.type === 'incoming' ? 'incoming' : 'outgoing';

    return this.dataSource.transaction(async (manager) => {
      const existingJournal = await manager
        .getRepository(EdmRegistrationJournal)
        .findOne({
          where: { document: { id: document.id } },
          relations: { createdBy: true, updatedBy: true, document: true },
        });

      if (existingJournal?.status === 'registered') {
        throw new ConflictException('Document is already registered');
      }

      if (!document.externalNumber) {
        document.externalNumber = await this.assignExternalNumber(
          manager,
          document,
        );
        await manager.getRepository(EdmDocument).save(document);
      }

      const actorUser = await manager
        .getRepository(User)
        .findOneBy({ id: actor.sub });
      if (!actorUser) {
        throw new NotFoundException('Actor not found');
      }

      const registrationNumber = document.externalNumber;
      const registeredAt = new Date();

      const journalRecord =
        existingJournal ??
        manager.getRepository(EdmRegistrationJournal).create({
          document,
          createdBy: actorUser,
          journalType,
          registrationNumber,
          status: 'registered',
          registeredAt,
          cancelledAt: null,
          updatedBy: actorUser,
        });

      journalRecord.journalType = journalType;
      journalRecord.registrationNumber = registrationNumber;
      journalRecord.status = 'registered';
      journalRecord.registeredAt = registeredAt;
      journalRecord.cancelledAt = null;
      journalRecord.updatedBy = actorUser;

      return manager.getRepository(EdmRegistrationJournal).save(journalRecord);
    });
  }

  async updateRegistrationStatus(
    documentId: number,
    dto: UpdateRegistrationStatusDto,
    actor: ActiveUserData,
  ) {
    const document = await this.getDocumentOrFail(documentId);
    this.assertDocumentScope(actor, document);

    const journalRecord = await this.registrationJournalRepo.findOne({
      where: { document: { id: document.id } },
      relations: { document: true, createdBy: true, updatedBy: true },
    });
    if (!journalRecord) {
      throw new NotFoundException('Registration journal record not found');
    }

    journalRecord.status = dto.status;
    journalRecord.cancelledAt = dto.status === 'cancelled' ? new Date() : null;
    journalRecord.updatedBy = await this.userRepo.findOneBy({ id: actor.sub });

    return this.registrationJournalRepo.save(journalRecord);
  }

  async listRegistrationJournal(
    actor: ActiveUserData,
    query: GetRegistrationJournalQueryDto,
  ): Promise<PaginatedResponse<EdmRegistrationJournal>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));
    const offset = (page - 1) * limit;

    const qb = this.registrationJournalRepo
      .createQueryBuilder('journal')
      .leftJoinAndSelect('journal.document', 'document')
      .leftJoinAndSelect('document.department', 'department')
      .leftJoinAndSelect('document.creator', 'creator')
      .leftJoinAndSelect('journal.createdBy', 'createdBy')
      .leftJoinAndSelect('journal.updatedBy', 'updatedBy')
      .orderBy('journal.registeredAt', 'DESC');

    if (query.journalType) {
      qb.andWhere('journal.journalType = :journalType', {
        journalType: query.journalType,
      });
    }
    if (query.status) {
      qb.andWhere('journal.status = :status', { status: query.status });
    }
    if (query.departmentId) {
      qb.andWhere('department.id = :departmentId', {
        departmentId: query.departmentId,
      });
    }
    if (query.registrationNumber) {
      qb.andWhere('journal.registrationNumber = :registrationNumber', {
        registrationNumber: query.registrationNumber,
      });
    }
    if (query.fromDate) {
      qb.andWhere('journal.registeredAt >= :fromDate', {
        fromDate: new Date(query.fromDate),
      });
    }
    if (query.toDate) {
      qb.andWhere('journal.registeredAt <= :toDate', {
        toDate: new Date(query.toDate),
      });
    }

    if (!this.isGlobalEdmRole(actor.role)) {
      qb.andWhere(
        new Brackets((scopeQb) => {
          scopeQb
            .where('creator.id = :actorId', { actorId: actor.sub })
            .orWhere('department.id = :departmentId', {
              departmentId: actor.departmentId ?? -1,
            });
        }),
      );
    }

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();
    return { items, total, page, limit };
  }

  async createResolutionTasks(
    documentId: number,
    dto: CreateResolutionTasksDto,
    actor: ActiveUserData,
  ) {
    if (!dto.tasks.length) {
      throw new BadRequestException('At least one task is required');
    }

    const document = await this.getDocumentOrFail(documentId);
    this.assertDocumentScope(actor, document);

    const creator = await this.userRepo.findOne({
      where: { id: actor.sub },
      relations: { department: true },
    });
    if (!creator) {
      throw new NotFoundException('Actor not found');
    }

    if (dto.resolutionText !== undefined) {
      document.resolutionText = dto.resolutionText;
      await this.edmDocumentRepo.save(document);
    }

    return this.dataSource.transaction(async (manager) => {
      const createdTasks: Task[] = [];

      for (const taskDto of dto.tasks) {
        const receiver = await manager.getRepository(User).findOne({
          where: { id: taskDto.receiverId },
          relations: { department: true },
        });
        if (!receiver) {
          throw new NotFoundException(
            `Receiver ${taskDto.receiverId} not found`,
          );
        }

        if (
          !this.isGlobalEdmRole(actor.role) &&
          receiver.department?.id !== creator.department?.id
        ) {
          throw new ForbiddenException(
            `Receiver ${taskDto.receiverId} is outside your department scope`,
          );
        }

        const descriptionParts = [
          taskDto.description?.trim() || null,
          document.resolutionText
            ? `Resolution: ${document.resolutionText}`
            : null,
          `DocumentId: ${document.id}`,
        ].filter(Boolean);

        const task = await manager.getRepository(Task).save(
          manager.getRepository(Task).create({
            title: taskDto.title,
            description: descriptionParts.join('\n\n'),
            creator,
            receiver,
            status: 'new',
          }),
        );

        await manager.getRepository(EdmDocumentTaskLink).save(
          manager.getRepository(EdmDocumentTaskLink).create({
            document,
            task,
            createdBy: creator,
          }),
        );

        createdTasks.push(task);
      }

      return createdTasks;
    });
  }

  async listDocumentTasks(
    documentId: number,
    actor: ActiveUserData,
  ): Promise<Task[]> {
    const document = await this.getDocumentOrFail(documentId);
    await this.assertDocumentReadScope(actor, document);

    const links = await this.documentTaskLinkRepo.find({
      where: { document: { id: documentId } },
      relations: {
        task: {
          creator: { department: true },
          receiver: { department: true },
        },
      },
      order: { createdAt: 'DESC' },
    });

    return links
      .map((link) => link.task)
      .filter((task) => {
        try {
          this.scopeService.assertTaskScope(actor, task);
          return true;
        } catch {
          return false;
        }
      });
  }

  async getDocumentTaskProgress(documentId: number, actor: ActiveUserData) {
    const tasks = await this.listDocumentTasks(documentId, actor);
    const total = tasks.length;
    const completed = tasks.filter(
      (task) => task.status === 'completed',
    ).length;
    const inProgress = tasks.filter(
      (task) => task.status === 'in_progress',
    ).length;
    const newCount = tasks.filter((task) => task.status === 'new').length;
    return {
      documentId,
      total,
      completed,
      inProgress,
      new: newCount,
      completionRate:
        total > 0 ? Number(((completed / total) * 100).toFixed(2)) : 0,
    };
  }

  async processDeadlineAlerts(actor: ActiveUserData) {
    if (
      !this.isGlobalEdmRole(actor.role) &&
      !this.isDepartmentManagerRole(actor.role)
    ) {
      throw new ForbiddenException(
        'Only global roles or department heads can process deadline alerts',
      );
    }
    return this.processDeadlineAlertsInternal(actor.sub);
  }

  async processDeadlineAlertsBySystem() {
    return this.processDeadlineAlertsInternal(null);
  }

  private async processDeadlineAlertsInternal(actorId: number | null) {
    const now = new Date();
    const reminderWindowHours = Number(
      process.env.EDM_REMINDER_WINDOW_HOURS ?? '24',
    );
    const escalationThresholdHours = Number(
      process.env.EDM_ESCALATION_THRESHOLD_HOURS ?? '24',
    );
    const reminderUntil = new Date(
      now.getTime() + reminderWindowHours * 60 * 60 * 1000,
    );
    const escalationBefore = new Date(
      now.getTime() - escalationThresholdHours * 60 * 60 * 1000,
    );

    const stages = await this.edmStageRepo
      .createQueryBuilder('stage')
      .leftJoinAndSelect('stage.route', 'route')
      .leftJoinAndSelect('route.document', 'document')
      .leftJoinAndSelect('document.department', 'documentDepartment')
      .leftJoinAndSelect('document.creator', 'documentCreator')
      .leftJoinAndSelect('stage.assigneeUser', 'assigneeUser')
      .leftJoinAndSelect('stage.assigneeDepartment', 'assigneeDepartment')
      .where('stage.state IN (:...states)', {
        states: ['pending', 'in_progress'],
      })
      .andWhere('stage.dueAt IS NOT NULL')
      .getMany();

    let created = 0;
    for (const stage of stages) {
      const dueAt = stage.dueAt;
      if (!dueAt) {
        continue;
      }
      const assigneeRecipients = await this.resolveAssigneeRecipients(stage);
      const document = stage.route.document;

      if (dueAt > now && dueAt <= reminderUntil) {
        for (const recipientId of assigneeRecipients) {
          const wasCreated = await this.createAlertIfMissing({
            documentId: document.id,
            stageId: stage.id,
            recipientUserId: recipientId,
            kind: 'due_soon',
            message: `Stage #${stage.id} is due soon for document #${document.id}`,
            metadata: {
              dueAt: dueAt.toISOString(),
              actorId: actorId ?? 'system',
            },
          });
          if (wasCreated) {
            created += 1;
          }
        }
      }

      if (dueAt <= now) {
        for (const recipientId of assigneeRecipients) {
          const wasCreated = await this.createAlertIfMissing({
            documentId: document.id,
            stageId: stage.id,
            recipientUserId: recipientId,
            kind: 'overdue',
            message: `Stage #${stage.id} is overdue for document #${document.id}`,
            metadata: {
              dueAt: dueAt.toISOString(),
              actorId: actorId ?? 'system',
            },
          });
          if (wasCreated) {
            created += 1;
          }
        }
      }

      if (dueAt <= escalationBefore) {
        const escalationRecipients =
          await this.resolveEscalationRecipients(stage);
        for (const recipientId of escalationRecipients) {
          const wasCreated = await this.createAlertIfMissing({
            documentId: document.id,
            stageId: stage.id,
            recipientUserId: recipientId,
            kind: 'escalation',
            message: `Escalation: stage #${stage.id} is overdue for document #${document.id}`,
            metadata: {
              dueAt: dueAt.toISOString(),
              escalationThresholdHours,
              actorId: actorId ?? 'system',
            },
          });
          if (wasCreated) {
            created += 1;
          }
        }
      }
    }

    return { processedStages: stages.length, createdAlerts: created };
  }

  async listMyAlerts(
    actor: ActiveUserData,
    query: GetAlertsQueryDto,
  ): Promise<PaginatedResponse<EdmAlert>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));
    const offset = (page - 1) * limit;

    const qb = this.alertRepo
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.document', 'document')
      .leftJoinAndSelect('alert.stage', 'stage')
      .where('alert.recipientUser = :recipientUserId', {
        recipientUserId: actor.sub,
      })
      .orderBy('alert.createdAt', 'DESC');

    if (query.kind) {
      qb.andWhere('alert.kind = :kind', { kind: query.kind });
    }
    if (query.status) {
      qb.andWhere('alert.status = :status', { status: query.status });
    }

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();
    return { items, total, page, limit };
  }

  async acknowledgeAlert(
    alertId: number,
    actor: ActiveUserData,
  ): Promise<EdmAlert> {
    const alert = await this.alertRepo.findOne({
      where: { id: alertId },
      relations: {
        recipientUser: true,
        document: true,
        stage: true,
      },
    });
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }
    if (alert.recipientUser.id !== actor.sub) {
      throw new ForbiddenException('Cannot acknowledge foreign alert');
    }

    alert.status = 'read';
    alert.readAt = new Date();
    return this.alertRepo.save(alert);
  }

  async getSlaReport(actor: ActiveUserData, query: EdmReportsQueryDto) {
    const fromDate = query.fromDate
      ? new Date(query.fromDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = query.toDate ? new Date(query.toDate) : new Date();

    const routes = await this.edmRouteRepo
      .createQueryBuilder('route')
      .leftJoinAndSelect('route.document', 'document')
      .leftJoinAndSelect('document.department', 'department')
      .leftJoinAndSelect('document.creator', 'creator')
      .where('route.createdAt >= :fromDate', { fromDate })
      .andWhere('route.createdAt <= :toDate', { toDate })
      .andWhere('document.deletedAt IS NULL')
      .getMany();

    const scopedRoutes = routes.filter((route) =>
      this.isReportScopeAllowed(
        actor,
        route.document.department?.id ?? null,
        route.document.creator?.id,
      ),
    );

    const byDepartment = new Map<
      number,
      {
        departmentId: number;
        total: number;
        finished: number;
        onTime: number;
        late: number;
        avgHours: number;
        _sum: number;
        _count: number;
      }
    >();

    let total = 0;
    let finished = 0;
    let onTime = 0;
    let late = 0;
    let sumHours = 0;
    let countHours = 0;

    for (const route of scopedRoutes) {
      if (
        query.departmentId &&
        route.document.department?.id !== query.departmentId
      ) {
        continue;
      }
      total += 1;
      const departmentId = route.document.department?.id ?? -1;
      const depAgg = byDepartment.get(departmentId) ?? {
        departmentId,
        total: 0,
        finished: 0,
        onTime: 0,
        late: 0,
        avgHours: 0,
        _sum: 0,
        _count: 0,
      };
      depAgg.total += 1;

      if (route.finishedAt) {
        finished += 1;
        depAgg.finished += 1;

        const startedAt = route.startedAt ?? route.createdAt;
        const hours =
          (route.finishedAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60);
        sumHours += hours;
        countHours += 1;
        depAgg._sum += hours;
        depAgg._count += 1;

        if (route.document.dueAt) {
          if (route.finishedAt <= route.document.dueAt) {
            onTime += 1;
            depAgg.onTime += 1;
          } else {
            late += 1;
            depAgg.late += 1;
          }
        }
      }

      byDepartment.set(departmentId, depAgg);
    }

    const byDepartmentResult = [...byDepartment.values()].map((row) => ({
      departmentId: row.departmentId,
      total: row.total,
      finished: row.finished,
      onTime: row.onTime,
      late: row.late,
      avgHours: row._count > 0 ? Number((row._sum / row._count).toFixed(2)) : 0,
    }));

    return {
      period: {
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
      },
      total,
      finished,
      onTime,
      late,
      avgHours: countHours > 0 ? Number((sumHours / countHours).toFixed(2)) : 0,
      completionRate:
        total > 0 ? Number(((finished / total) * 100).toFixed(2)) : 0,
      byDepartment: byDepartmentResult,
    };
  }

  async getOverdueReport(actor: ActiveUserData, query: EdmReportsQueryDto) {
    const now = new Date();
    const stages = await this.edmStageRepo
      .createQueryBuilder('stage')
      .leftJoinAndSelect('stage.route', 'route')
      .leftJoinAndSelect('route.document', 'document')
      .leftJoinAndSelect('document.department', 'department')
      .leftJoinAndSelect('document.creator', 'creator')
      .leftJoinAndSelect('stage.assigneeUser', 'assigneeUser')
      .where('stage.state IN (:...states)', {
        states: ['pending', 'in_progress'],
      })
      .andWhere('stage.dueAt < :now', { now })
      .getMany();

    const scoped = stages.filter((stage) =>
      this.isReportScopeAllowed(
        actor,
        stage.route.document.department?.id ?? null,
        stage.route.document.creator?.id,
      ),
    );
    const filtered = query.departmentId
      ? scoped.filter(
          (stage) => stage.route.document.department?.id === query.departmentId,
        )
      : scoped;

    const byDepartment = new Map<number, number>();
    const byAssignee = new Map<
      number,
      { userId: number; name: string; total: number }
    >();
    let oldestDueAt: Date | null = null;

    for (const stage of filtered) {
      const depId = stage.route.document.department?.id ?? -1;
      byDepartment.set(depId, (byDepartment.get(depId) ?? 0) + 1);

      if (stage.assigneeUser?.id) {
        const current = byAssignee.get(stage.assigneeUser.id) ?? {
          userId: stage.assigneeUser.id,
          name: stage.assigneeUser.name,
          total: 0,
        };
        current.total += 1;
        byAssignee.set(stage.assigneeUser.id, current);
      }

      if (!oldestDueAt || (stage.dueAt && stage.dueAt < oldestDueAt)) {
        oldestDueAt = stage.dueAt;
      }
    }

    return {
      asOf: now.toISOString(),
      totalOverdue: filtered.length,
      oldestDueAt: oldestDueAt ? oldestDueAt.toISOString() : null,
      byDepartment: [...byDepartment.entries()].map(
        ([departmentId, total]) => ({
          departmentId,
          total,
        }),
      ),
      byAssignee: [...byAssignee.values()].sort((a, b) => b.total - a.total),
    };
  }

  async getWorkloadReport(actor: ActiveUserData, query: EdmReportsQueryDto) {
    const now = new Date();
    const activeStages = await this.edmStageRepo
      .createQueryBuilder('stage')
      .leftJoinAndSelect('stage.route', 'route')
      .leftJoinAndSelect('route.document', 'document')
      .leftJoinAndSelect('document.department', 'department')
      .leftJoinAndSelect('document.creator', 'creator')
      .leftJoinAndSelect('stage.assigneeUser', 'assigneeUser')
      .where('stage.state IN (:...states)', {
        states: ['pending', 'in_progress'],
      })
      .getMany();

    const scopedStages = activeStages.filter((stage) =>
      this.isReportScopeAllowed(
        actor,
        stage.route.document.department?.id ?? null,
        stage.route.document.creator?.id,
      ),
    );
    const filteredStages = query.departmentId
      ? scopedStages.filter(
          (stage) => stage.route.document.department?.id === query.departmentId,
        )
      : scopedStages;

    const byDepartment = new Map<
      number,
      {
        departmentId: number;
        activeStages: number;
        overdueStages: number;
        documentsInRoute: Set<number>;
      }
    >();

    for (const stage of filteredStages) {
      const depId = stage.route.document.department?.id ?? -1;
      const row = byDepartment.get(depId) ?? {
        departmentId: depId,
        activeStages: 0,
        overdueStages: 0,
        documentsInRoute: new Set<number>(),
      };
      row.activeStages += 1;
      if (stage.dueAt && stage.dueAt < now) {
        row.overdueStages += 1;
      }
      row.documentsInRoute.add(stage.route.document.id);
      byDepartment.set(depId, row);
    }

    const managerUsers = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.department', 'department')
      .where('user.isActive = true')
      .andWhere('user.role IN (:...roles)', {
        roles: [Role.Manager, Role.DepartmentHead],
      })
      .getMany();

    const byManager = managerUsers
      .filter((manager) =>
        this.isGlobalEdmRole(actor.role)
          ? query.departmentId
            ? manager.department?.id === query.departmentId
            : true
          : manager.department?.id === actor.departmentId,
      )
      .map((manager) => {
        const managerStages = filteredStages.filter(
          (stage) => stage.assigneeUser?.id === manager.id,
        );
        const managerOverdue = managerStages.filter(
          (stage) => stage.dueAt && stage.dueAt < now,
        ).length;
        const managerDocumentsOwned = filteredStages.filter(
          (stage) => stage.route.document.creator?.id === manager.id,
        );
        return {
          userId: manager.id,
          name: manager.name,
          departmentId: manager.department?.id ?? null,
          assignedStages: managerStages.length,
          overdueAssignedStages: managerOverdue,
          ownedDocumentsInRoute: new Set(
            managerDocumentsOwned.map((s) => s.route.document.id),
          ).size,
        };
      });

    return {
      asOf: now.toISOString(),
      totalActiveStages: filteredStages.length,
      byDepartment: [...byDepartment.values()].map((row) => ({
        departmentId: row.departmentId,
        activeStages: row.activeStages,
        overdueStages: row.overdueStages,
        documentsInRoute: row.documentsInRoute.size,
      })),
      byManager,
    };
  }

  async exportSlaReportCsv(
    actor: ActiveUserData,
    query: EdmReportsQueryDto,
  ): Promise<string> {
    const report = await this.getSlaReport(actor, query);
    const rows: Array<Array<string | number | null>> = [
      ['metric', 'value'],
      ['fromDate', report.period.fromDate],
      ['toDate', report.period.toDate],
      ['total', report.total],
      ['finished', report.finished],
      ['onTime', report.onTime],
      ['late', report.late],
      ['avgHours', report.avgHours],
      ['completionRate', report.completionRate],
      [],
      ['departmentId', 'total', 'finished', 'onTime', 'late', 'avgHours'],
      ...report.byDepartment.map((row) => [
        row.departmentId,
        row.total,
        row.finished,
        row.onTime,
        row.late,
        row.avgHours,
      ]),
    ];
    return `\uFEFF${this.buildCsv(rows)}`;
  }

  async exportSlaReportXlsx(
    actor: ActiveUserData,
    query: EdmReportsQueryDto,
  ): Promise<Buffer> {
    const report = await this.getSlaReport(actor, query);
    return this.buildXlsxBuffer([
      {
        name: 'summary',
        rows: [
          ['metric', 'value'],
          ['fromDate', report.period.fromDate],
          ['toDate', report.period.toDate],
          ['total', report.total],
          ['finished', report.finished],
          ['onTime', report.onTime],
          ['late', report.late],
          ['avgHours', report.avgHours],
          ['completionRate', report.completionRate],
        ],
      },
      {
        name: 'departments',
        rows: [
          ['departmentId', 'total', 'finished', 'onTime', 'late', 'avgHours'],
          ...report.byDepartment.map((row) => [
            row.departmentId,
            row.total,
            row.finished,
            row.onTime,
            row.late,
            row.avgHours,
          ]),
        ],
      },
    ]);
  }

  async exportOverdueReportCsv(
    actor: ActiveUserData,
    query: EdmReportsQueryDto,
  ): Promise<string> {
    const report = await this.getOverdueReport(actor, query);
    const rows: Array<Array<string | number | null>> = [
      ['metric', 'value'],
      ['asOf', report.asOf],
      ['totalOverdue', report.totalOverdue],
      ['oldestDueAt', report.oldestDueAt],
      [],
      ['departmentId', 'totalOverdue'],
      ...report.byDepartment.map((row) => [row.departmentId, row.total]),
      [],
      ['assigneeUserId', 'assigneeName', 'totalOverdue'],
      ...report.byAssignee.map((row) => [row.userId, row.name, row.total]),
    ];
    return `\uFEFF${this.buildCsv(rows)}`;
  }

  async exportOverdueReportXlsx(
    actor: ActiveUserData,
    query: EdmReportsQueryDto,
  ): Promise<Buffer> {
    const report = await this.getOverdueReport(actor, query);
    return this.buildXlsxBuffer([
      {
        name: 'summary',
        rows: [
          ['metric', 'value'],
          ['asOf', report.asOf],
          ['totalOverdue', report.totalOverdue],
          ['oldestDueAt', report.oldestDueAt],
        ],
      },
      {
        name: 'departments',
        rows: [
          ['departmentId', 'totalOverdue'],
          ...report.byDepartment.map((row) => [row.departmentId, row.total]),
        ],
      },
      {
        name: 'assignees',
        rows: [
          ['assigneeUserId', 'assigneeName', 'totalOverdue'],
          ...report.byAssignee.map((row) => [row.userId, row.name, row.total]),
        ],
      },
    ]);
  }

  async exportWorkloadReportCsv(
    actor: ActiveUserData,
    query: EdmReportsQueryDto,
  ): Promise<string> {
    const report = await this.getWorkloadReport(actor, query);
    const rows: Array<Array<string | number | null>> = [
      ['metric', 'value'],
      ['asOf', report.asOf],
      ['totalActiveStages', report.totalActiveStages],
      [],
      ['departmentId', 'activeStages', 'overdueStages', 'documentsInRoute'],
      ...report.byDepartment.map((row) => [
        row.departmentId,
        row.activeStages,
        row.overdueStages,
        row.documentsInRoute,
      ]),
      [],
      [
        'managerUserId',
        'managerName',
        'departmentId',
        'assignedStages',
        'overdueAssignedStages',
        'ownedDocumentsInRoute',
      ],
      ...report.byManager.map((row) => [
        row.userId,
        row.name,
        row.departmentId,
        row.assignedStages,
        row.overdueAssignedStages,
        row.ownedDocumentsInRoute,
      ]),
    ];
    return `\uFEFF${this.buildCsv(rows)}`;
  }

  async exportWorkloadReportXlsx(
    actor: ActiveUserData,
    query: EdmReportsQueryDto,
  ): Promise<Buffer> {
    const report = await this.getWorkloadReport(actor, query);
    return this.buildXlsxBuffer([
      {
        name: 'summary',
        rows: [
          ['metric', 'value'],
          ['asOf', report.asOf],
          ['totalActiveStages', report.totalActiveStages],
        ],
      },
      {
        name: 'departments',
        rows: [
          ['departmentId', 'activeStages', 'overdueStages', 'documentsInRoute'],
          ...report.byDepartment.map((row) => [
            row.departmentId,
            row.activeStages,
            row.overdueStages,
            row.documentsInRoute,
          ]),
        ],
      },
      {
        name: 'managers',
        rows: [
          [
            'managerUserId',
            'managerName',
            'departmentId',
            'assignedStages',
            'overdueAssignedStages',
            'ownedDocumentsInRoute',
          ],
          ...report.byManager.map((row) => [
            row.userId,
            row.name,
            row.departmentId,
            row.assignedStages,
            row.overdueAssignedStages,
            row.ownedDocumentsInRoute,
          ]),
        ],
      },
    ]);
  }

  async getDashboardSummary(
    actor: ActiveUserData,
    query: EdmDashboardQueryDto,
  ) {
    const [sla, overdue, workload] = await Promise.all([
      this.getSlaReport(actor, query),
      this.getOverdueReport(actor, query),
      this.getWorkloadReport(actor, query),
    ]);

    const topManagers = Math.min(
      25,
      Math.max(1, Number(query.topManagers ?? 10)),
    );
    const onTimeRate =
      sla.finished > 0
        ? Number(((sla.onTime / sla.finished) * 100).toFixed(2))
        : 0;
    const overdueLoadRate =
      workload.totalActiveStages > 0
        ? Number(
            ((overdue.totalOverdue / workload.totalActiveStages) * 100).toFixed(
              2,
            ),
          )
        : 0;

    return {
      asOf: new Date().toISOString(),
      period: sla.period,
      kpis: {
        totalRoutes: sla.total,
        finishedRoutes: sla.finished,
        completionRate: sla.completionRate,
        onTimeRate,
        avgRouteHours: sla.avgHours,
        totalOverdue: overdue.totalOverdue,
        totalActiveStages: workload.totalActiveStages,
        overdueLoadRate,
      },
      charts: {
        slaByDepartment: sla.byDepartment,
        overdueByDepartment: overdue.byDepartment,
        workloadByDepartment: workload.byDepartment,
        managerLoad: [...workload.byManager]
          .sort((a, b) => b.assignedStages - a.assignedStages)
          .slice(0, topManagers),
      },
    };
  }

  async submitToRoute(
    id: number,
    dto: SubmitEdmDocumentDto,
    actor: ActiveUserData,
  ): Promise<{
    documentId: number;
    status: string;
    routeId: number;
    versionNo: number;
    externalNumber: string;
  }> {
    const document = await this.getDocumentOrFail(id);
    this.assertDocumentScope(actor, document);

    if (!['draft', 'returned_for_revision'].includes(document.status)) {
      throw new ConflictException(
        'Document cannot be submitted in current state',
      );
    }

    const stagesInput = dto.routeTemplateId
      ? await this.buildStagesFromTemplate(dto.routeTemplateId, actor, document)
      : (dto.stages ?? []);
    if (!stagesInput.length) {
      throw new BadRequestException('At least one route stage is required');
    }

    return this.dataSource.transaction(async (manager) => {
      const latestRoute = await manager
        .getRepository(EdmDocumentRoute)
        .createQueryBuilder('route')
        .leftJoin('route.document', 'document')
        .where('document.id = :documentId', { documentId: document.id })
        .orderBy('route.versionNo', 'DESC')
        .getOne();

      const creator = await manager
        .getRepository(User)
        .findOneBy({ id: actor.sub });
      if (!creator) {
        throw new NotFoundException('Creator not found');
      }

      const route = await manager.getRepository(EdmDocumentRoute).save(
        manager.getRepository(EdmDocumentRoute).create({
          document,
          versionNo: (latestRoute?.versionNo ?? 0) + 1,
          state: 'active',
          completionPolicy:
            (dto.completionPolicy as EdmRouteCompletionPolicy | undefined) ??
            'sequential',
          startedAt: new Date(),
          finishedAt: null,
          createdBy: creator,
          overrideReason: null,
        }),
      );

      const sortedStages = [...stagesInput].sort(
        (a, b) => a.orderNo - b.orderNo,
      );
      const firstOrder = sortedStages[0].orderNo;
      const firstGroupNo = sortedStages[0].stageGroupNo ?? null;

      const createdStages: EdmRouteStage[] = [];
      for (const stageDto of sortedStages) {
        this.assertAssigneeConsistency(stageDto);

        const assigneeUser = stageDto.assigneeUserId
          ? await manager
              .getRepository(User)
              .findOneBy({ id: stageDto.assigneeUserId })
          : null;
        const assigneeDepartment = stageDto.assigneeDepartmentId
          ? await manager
              .getRepository(Department)
              .findOneBy({ id: stageDto.assigneeDepartmentId })
          : null;

        const isFirstSequentialStage =
          stageDto.orderNo === firstOrder &&
          route.completionPolicy === 'sequential';
        const isFirstParallelGroupStage =
          route.completionPolicy !== 'sequential' &&
          stageDto.orderNo === firstOrder &&
          (stageDto.stageGroupNo ?? null) === firstGroupNo;

        const savedStage = await manager.getRepository(EdmRouteStage).save(
          manager.getRepository(EdmRouteStage).create({
            route,
            orderNo: stageDto.orderNo,
            stageGroupNo: stageDto.stageGroupNo ?? null,
            stageType: stageDto.stageType,
            assigneeType: stageDto.assigneeType,
            assigneeUser,
            assigneeRole: stageDto.assigneeRole ?? null,
            assigneeDepartment,
            state:
              isFirstSequentialStage || isFirstParallelGroupStage
                ? 'in_progress'
                : 'pending',
            dueAt: stageDto.dueAt ? new Date(stageDto.dueAt) : null,
            startedAt:
              isFirstSequentialStage || isFirstParallelGroupStage
                ? new Date()
                : null,
            completedAt: null,
            escalationPolicy: stageDto.escalationPolicy ?? null,
          }),
        );
        createdStages.push(savedStage);
      }

      document.currentRoute = route;
      document.status = 'in_route';
      if (!document.externalNumber) {
        document.externalNumber = await this.assignExternalNumber(
          manager,
          document,
        );
      }
      document.approvedAt = null;
      document.rejectedAt = null;
      await manager.getRepository(EdmDocument).save(document);

      const firstHopStages = createdStages.filter(
        (stage) =>
          stage.orderNo === firstOrder &&
          (route.completionPolicy === 'sequential'
            ? true
            : (stage.stageGroupNo ?? null) === firstGroupNo),
      );

      for (const firstHop of firstHopStages) {
        await this.recordTimelineEvent(
          {
            document,
            eventType: 'forwarded',
            actorUser: creator,
            fromUser: creator,
            toUser: firstHop.assigneeUser ?? null,
            fromRole: actor.role,
            toRole:
              firstHop.assigneeRole ??
              firstHop.assigneeUser?.role ??
              firstHop.assigneeType,
            responsibleUser: firstHop.assigneeUser ?? null,
            parentEvent: null,
            threadId: `doc-${document.id}-main`,
            commentText: 'submitted_to_route',
            meta: {
              routeId: route.id,
              stageId: firstHop.id,
              assigneeType: firstHop.assigneeType,
              assigneeDepartmentId: firstHop.assigneeDepartment?.id ?? null,
            },
          },
          manager,
        );

        if (firstHop.assigneeUser) {
          await this.recordTimelineEvent(
            {
              document,
              eventType: 'responsible_assigned',
              actorUser: creator,
              fromUser: creator,
              toUser: firstHop.assigneeUser,
              fromRole: actor.role,
              toRole: firstHop.assigneeUser.role,
              responsibleUser: firstHop.assigneeUser,
              parentEvent: null,
              threadId: `doc-${document.id}-main`,
              commentText: 'initial_route_assignment',
              meta: { routeId: route.id, stageId: firstHop.id },
            },
            manager,
          );
        }
      }

      return {
        documentId: document.id,
        status: document.status,
        routeId: route.id,
        versionNo: route.versionNo,
        externalNumber: document.externalNumber,
      };
    });
  }

  async executeStageAction(
    documentId: number,
    stageId: number,
    dto: ExecuteEdmStageActionDto,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    const document = await this.getDocumentOrFail(documentId);

    if (!document.currentRoute) {
      throw new ConflictException('Document has no active route');
    }

    return this.dataSource.transaction(async (manager) => {
      const stage = await manager.getRepository(EdmRouteStage).findOne({
        where: {
          id: stageId,
          route: { id: document.currentRoute!.id },
        },
        relations: {
          route: true,
          assigneeUser: true,
          assigneeDepartment: true,
        },
      });
      if (!stage) {
        throw new NotFoundException('Stage not found');
      }
      if (!['pending', 'in_progress'].includes(stage.state)) {
        throw new ConflictException('Stage is already closed');
      }

      const delegation = await this.findDelegationForStage(
        actor,
        stage,
        Permission.DOCUMENTS_ROUTE_EXECUTE,
      );
      this.assertStageAssignee(
        actor,
        stage,
        delegation?.delegatorUser?.id ?? null,
      );

      const actionResultState = this.resolveActionResultState(dto.action);
      const stageState = this.resolveStageState(dto.action);

      if (stage.state === 'pending') {
        stage.startedAt = new Date();
      }
      stage.state = stageState;
      stage.completedAt = ['approved', 'rejected', 'returned'].includes(
        stageState,
      )
        ? new Date()
        : null;

      await manager.getRepository(EdmRouteStage).save(stage);

      const actorUser = await manager
        .getRepository(User)
        .findOneBy({ id: actor.sub });
      if (!actorUser) {
        throw new NotFoundException('Actor not found');
      }

      await manager.getRepository(EdmStageAction).save(
        manager.getRepository(EdmStageAction).create({
          stage,
          document,
          action: dto.action,
          actionResultState,
          actorUser,
          onBehalfOfUser: delegation?.delegatorUser ?? null,
          commentText: dto.commentText ?? null,
          reasonCode: dto.reasonCode ?? null,
          ip: requestMeta.ip,
          userAgent: requestMeta.userAgent,
        }),
      );

      await this.recordTimelineEvent(
        {
          document,
          eventType: 'route_action',
          actorUser,
          fromUser: actorUser,
          toUser: stage.assigneeUser ?? null,
          fromRole: actor.role,
          toRole: stage.assigneeUser?.role ?? stage.assigneeRole ?? null,
          responsibleUser: stage.assigneeUser ?? null,
          parentEvent: null,
          threadId: `doc-${document.id}-main`,
          commentText: dto.commentText ?? null,
          meta: {
            action: dto.action,
            stageId: stage.id,
            routeId: stage.route.id,
            reasonCode: dto.reasonCode ?? null,
            ip: requestMeta.ip,
            userAgent: requestMeta.userAgent,
            onBehalfOfUserId: delegation?.delegatorUser?.id ?? null,
          },
        },
        manager,
      );

      await this.applyRouteProgress(manager, document, stage, dto.action);

      const updatedDocument = await manager.getRepository(EdmDocument).findOne({
        where: { id: document.id },
        relations: { currentRoute: true },
      });
      if (!updatedDocument?.currentRoute) {
        throw new NotFoundException('Document route not found after action');
      }

      return {
        documentId: updatedDocument.id,
        routeId: updatedDocument.currentRoute.id,
        stageId: stage.id,
        action: dto.action,
        stageState: stage.state,
        routeState: updatedDocument.currentRoute.state,
        documentStatus: updatedDocument.status,
        actedAt: new Date().toISOString(),
      };
    });
  }

  async override(
    documentId: number,
    dto: EdmOverrideDto,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    const document = await this.getDocumentOrFail(documentId);
    await this.assertOverrideAllowed(actor, document);
    if (!document.currentRoute) {
      throw new ConflictException('Document has no active route');
    }

    return this.dataSource.transaction(async (manager) => {
      const route = await manager.getRepository(EdmDocumentRoute).findOneBy({
        id: document.currentRoute!.id,
      });
      if (!route) {
        throw new NotFoundException('Route not found');
      }

      route.overrideReason = dto.reason;
      route.finishedAt = new Date();

      if (dto.overrideAction === 'force_approve') {
        route.state = 'completed';
        document.status = 'approved';
        document.approvedAt = new Date();
      } else {
        route.state = 'rejected';
        document.status = 'rejected';
        document.rejectedAt = new Date();
      }

      await manager.getRepository(EdmDocumentRoute).save(route);
      await manager.getRepository(EdmDocument).save(document);

      const actorUser = await manager
        .getRepository(User)
        .findOneBy({ id: actor.sub });
      if (actorUser) {
        const openStages = await manager.getRepository(EdmRouteStage).find({
          where: { route: { id: route.id } },
        });

        for (const stage of openStages.filter((item) =>
          ['pending', 'in_progress'].includes(item.state),
        )) {
          stage.state = 'skipped';
          stage.completedAt = new Date();
          await manager.getRepository(EdmRouteStage).save(stage);
          await manager.getRepository(EdmStageAction).save(
            manager.getRepository(EdmStageAction).create({
              stage,
              document,
              action:
                dto.overrideAction === 'force_approve'
                  ? 'override_approved'
                  : 'override_rejected',
              actionResultState:
                dto.overrideAction === 'force_approve'
                  ? 'approved'
                  : 'rejected',
              actorUser,
              onBehalfOfUser: null,
              commentText: dto.reason,
              reasonCode: 'override',
              ip: requestMeta.ip,
              userAgent: requestMeta.userAgent,
            }),
          );
        }

        await this.recordTimelineEvent(
          {
            document,
            eventType: 'override',
            actorUser,
            fromUser: actorUser,
            toUser: null,
            fromRole: actor.role,
            toRole: null,
            responsibleUser: null,
            parentEvent: null,
            threadId: `doc-${document.id}-main`,
            commentText: dto.reason,
            meta: {
              overrideAction: dto.overrideAction,
              routeId: route.id,
              ip: requestMeta.ip,
              userAgent: requestMeta.userAgent,
            },
          },
          manager,
        );
      }

      return {
        id: document.id,
        status: document.status,
      };
    });
  }

  async archive(documentId: number, actor: ActiveUserData) {
    const document = await this.getDocumentOrFail(documentId);
    this.assertDocumentScope(actor, document);

    if (document.status !== 'approved') {
      throw new ConflictException('Only approved documents can be archived');
    }

    document.status = 'archived';
    document.archivedAt = new Date();
    const saved = await this.edmDocumentRepo.save(document);
    const actorUser = await this.userRepo.findOneBy({ id: actor.sub });
    if (actorUser) {
      await this.recordTimelineEvent({
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

    this.applyDocumentListScope(qb, actor);

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
    };
  }

  private async resolveDocumentsCriteriaFromQuery(
    actor: ActiveUserData,
    query: GetEdmDocumentsQueryDto,
  ): Promise<SavedDocumentsCriteriaDto> {
    const directCriteria = this.normalizeDocumentsCriteria(query);
    if (!query.savedFilterId) {
      return directCriteria;
    }

    const savedFilter = await this.findOwnedSavedFilter(
      query.savedFilterId,
      actor.sub,
    );
    const savedCriteria = this.normalizeDocumentsCriteria(savedFilter.criteria);
    return {
      ...savedCriteria,
      ...Object.fromEntries(
        Object.entries(directCriteria).filter(
          ([, value]) => value !== undefined,
        ),
      ),
    } as SavedDocumentsCriteriaDto;
  }

  async findOne(documentId: number, actor: ActiveUserData) {
    const document = await this.getDocumentOrFail(documentId);
    await this.assertDocumentReadScope(actor, document);

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
      if (this.isDepartmentManagerRole(actor.role) && actor.departmentId) {
        qb.orWhere('department.id = :departmentId', {
          departmentId: actor.departmentId,
        });
      }
    } else {
      this.applyDocumentListScope(qb, actor);
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

  async findRoute(documentId: number, actor: ActiveUserData) {
    const document = await this.getDocumentOrFail(documentId);
    await this.assertDocumentReadScope(actor, document);

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

  async findAudit(
    documentId: number,
    actor: ActiveUserData,
    query: GetDocumentAuditQueryDto,
  ) {
    const document = await this.getDocumentOrFail(documentId);
    await this.assertDocumentReadScope(actor, document);

    const qb = this.edmActionRepo
      .createQueryBuilder('action')
      .leftJoinAndSelect('action.stage', 'stage')
      .leftJoinAndSelect('action.actorUser', 'actorUser')
      .leftJoinAndSelect('action.onBehalfOfUser', 'onBehalfOfUser')
      .leftJoin('action.document', 'document')
      .where('document.id = :documentId', { documentId });

    const rawActions = query.actions as unknown;
    const auditActions = Array.isArray(rawActions)
      ? rawActions.map((item) => String(item))
      : rawActions
        ? [String(rawActions)]
        : [];
    if (auditActions.length) {
      qb.andWhere('action.action IN (:...actions)', { actions: auditActions });
    }
    if (query.actorUserId) {
      qb.andWhere('actorUser.id = :actorUserId', {
        actorUserId: query.actorUserId,
      });
    }
    if (query.onBehalfOfUserId) {
      qb.andWhere('onBehalfOfUser.id = :onBehalfOfUserId', {
        onBehalfOfUserId: query.onBehalfOfUserId,
      });
    }
    if (query.stageId) {
      qb.andWhere('stage.id = :stageId', { stageId: query.stageId });
    }
    if (query.reasonCode) {
      qb.andWhere('action.reasonCode = :reasonCode', {
        reasonCode: query.reasonCode,
      });
    }
    if (query.fromDate) {
      qb.andWhere('action.createdAt >= :fromDate', {
        fromDate: new Date(query.fromDate),
      });
    }
    if (query.toDate) {
      qb.andWhere('action.createdAt <= :toDate', {
        toDate: new Date(query.toDate),
      });
    }

    return qb
      .orderBy('action.createdAt', 'ASC')
      .addOrderBy('action.id', 'ASC')
      .getMany();
  }

  async findHistory(
    documentId: number,
    actor: ActiveUserData,
    query: GetDocumentHistoryQueryDto,
  ) {
    const document = await this.getDocumentOrFail(documentId);
    await this.assertDocumentReadScope(actor, document);

    const qb = this.timelineRepo
      .createQueryBuilder('timeline')
      .leftJoinAndSelect('timeline.actorUser', 'actorUser')
      .leftJoinAndSelect('timeline.fromUser', 'fromUser')
      .leftJoinAndSelect('timeline.toUser', 'toUser')
      .leftJoinAndSelect('timeline.responsibleUser', 'responsibleUser')
      .leftJoinAndSelect('timeline.parentEvent', 'parentEvent')
      .leftJoin('timeline.document', 'document')
      .where('document.id = :documentId', { documentId });

    const rawEventTypes = query.eventTypes as unknown;
    const historyEventTypes = Array.isArray(rawEventTypes)
      ? rawEventTypes.map((item) => String(item))
      : rawEventTypes
        ? [String(rawEventTypes)]
        : [];
    if (historyEventTypes.length) {
      qb.andWhere('timeline.eventType IN (:...eventTypes)', {
        eventTypes: historyEventTypes,
      });
    }
    if (query.actorUserId) {
      qb.andWhere('actorUser.id = :actorUserId', {
        actorUserId: query.actorUserId,
      });
    }
    if (query.fromUserId) {
      qb.andWhere('fromUser.id = :fromUserId', {
        fromUserId: query.fromUserId,
      });
    }
    if (query.toUserId) {
      qb.andWhere('toUser.id = :toUserId', { toUserId: query.toUserId });
    }
    if (query.responsibleUserId) {
      qb.andWhere('responsibleUser.id = :responsibleUserId', {
        responsibleUserId: query.responsibleUserId,
      });
    }
    if (query.threadId) {
      qb.andWhere('timeline.threadId = :threadId', {
        threadId: query.threadId,
      });
    }
    if (query.fromDate) {
      qb.andWhere('timeline.createdAt >= :fromDate', {
        fromDate: new Date(query.fromDate),
      });
    }
    if (query.toDate) {
      qb.andWhere('timeline.createdAt <= :toDate', {
        toDate: new Date(query.toDate),
      });
    }
    if (query.q) {
      qb.andWhere("LOWER(COALESCE(timeline.commentText, '')) LIKE :search", {
        search: `%${query.q.toLowerCase()}%`,
      });
    }

    return qb
      .orderBy('timeline.createdAt', 'ASC')
      .addOrderBy('timeline.id', 'ASC')
      .getMany();
  }

  async exportDocumentAuditCsv(
    documentId: number,
    actor: ActiveUserData,
    query: GetDocumentAuditQueryDto,
  ): Promise<string> {
    const audit = await this.findAudit(documentId, actor, query);
    const rows: Array<Array<string | number | null>> = [
      [
        'documentId',
        'actionId',
        'createdAt',
        'action',
        'stageId',
        'actorUserId',
        'onBehalfOfUserId',
        'reasonCode',
        'commentText',
      ],
      ...audit.map((item) => [
        documentId,
        item.id,
        item.createdAt.toISOString(),
        item.action,
        item.stage?.id ?? null,
        item.actorUser?.id ?? null,
        item.onBehalfOfUser?.id ?? null,
        item.reasonCode,
        item.commentText,
      ]),
    ];
    return `\uFEFF${this.buildCsv(rows)}`;
  }

  async exportDocumentAuditXlsx(
    documentId: number,
    actor: ActiveUserData,
    query: GetDocumentAuditQueryDto,
  ): Promise<Buffer> {
    const audit = await this.findAudit(documentId, actor, query);
    return this.buildXlsxBuffer([
      {
        name: 'audit',
        rows: [
          [
            'documentId',
            'actionId',
            'createdAt',
            'action',
            'stageId',
            'actorUserId',
            'onBehalfOfUserId',
            'reasonCode',
            'commentText',
          ],
          ...audit.map((item) => [
            documentId,
            item.id,
            item.createdAt.toISOString(),
            item.action,
            item.stage?.id ?? null,
            item.actorUser?.id ?? null,
            item.onBehalfOfUser?.id ?? null,
            item.reasonCode,
            item.commentText,
          ]),
        ],
      },
    ]);
  }

  async exportDocumentHistoryCsv(
    documentId: number,
    actor: ActiveUserData,
    query: GetDocumentHistoryQueryDto,
  ): Promise<string> {
    const history = await this.findHistory(documentId, actor, query);
    const rows: Array<Array<string | number | null>> = [
      [
        'documentId',
        'eventId',
        'createdAt',
        'eventType',
        'actorUserId',
        'fromUserId',
        'toUserId',
        'responsibleUserId',
        'threadId',
        'commentText',
      ],
      ...history.map((item) => [
        documentId,
        item.id,
        item.createdAt.toISOString(),
        item.eventType,
        item.actorUser?.id ?? null,
        item.fromUser?.id ?? null,
        item.toUser?.id ?? null,
        item.responsibleUser?.id ?? null,
        item.threadId,
        item.commentText,
      ]),
    ];
    return `\uFEFF${this.buildCsv(rows)}`;
  }

  async exportDocumentHistoryXlsx(
    documentId: number,
    actor: ActiveUserData,
    query: GetDocumentHistoryQueryDto,
  ): Promise<Buffer> {
    const history = await this.findHistory(documentId, actor, query);
    return this.buildXlsxBuffer([
      {
        name: 'history',
        rows: [
          [
            'documentId',
            'eventId',
            'createdAt',
            'eventType',
            'actorUserId',
            'fromUserId',
            'toUserId',
            'responsibleUserId',
            'threadId',
            'commentText',
          ],
          ...history.map((item) => [
            documentId,
            item.id,
            item.createdAt.toISOString(),
            item.eventType,
            item.actorUser?.id ?? null,
            item.fromUser?.id ?? null,
            item.toUser?.id ?? null,
            item.responsibleUser?.id ?? null,
            item.threadId,
            item.commentText,
          ]),
        ],
      },
    ]);
  }

  async forwardDocument(
    documentId: number,
    dto: ForwardEdmDocumentDto,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    const document = await this.getDocumentOrFail(documentId);

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
    this.assertRoutingTargetAllowed(actor, toUser);

    const event = await this.recordTimelineEvent({
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
    const document = await this.getDocumentOrFail(documentId);
    await this.assertDocumentReadScope(actor, document);

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
    this.assertRoutingTargetAllowed(actor, responsibleUser);

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

    const event = await this.recordTimelineEvent({
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
    const document = await this.getDocumentOrFail(documentId);
    await this.assertDocumentReadScope(actor, document);

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
        this.assertRoutingTargetAllowed(actor, toUser);
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
      const timelineEvent = await this.recordTimelineEvent(
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
    const document = await this.getDocumentOrFail(documentId);
    await this.assertDocumentReadScope(actor, document);

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
    const document = await this.getDocumentOrFail(documentId);
    await this.assertDocumentReadScope(actor, document);

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
      this.getDocumentOrFail(documentId),
      this.fileAttachmentsService.findAttachableFile(fileId),
    ]);
    this.assertDocumentScope(actor, document);
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
      this.getDocumentOrFail(documentId),
      this.fileAttachmentsService.findAttachableFile(fileId),
    ]);
    this.assertDocumentScope(actor, document);
    this.scopeService.assertFileScope(actor, file);

    return this.fileAttachmentsService.unlinkResourceFile({
      resourceType: 'edm_document',
      resourceId: documentId,
      file,
      actor,
      requestMeta,
    });
  }

  private async createAlertIfMissing(params: {
    documentId: number;
    stageId: number;
    recipientUserId: number;
    kind: EdmAlert['kind'];
    message: string;
    metadata: Record<string, unknown>;
  }): Promise<boolean> {
    const existing = await this.alertRepo.findOne({
      where: {
        stage: { id: params.stageId },
        recipientUser: { id: params.recipientUserId },
        kind: params.kind,
        status: 'unread',
      },
    });
    if (existing) {
      return false;
    }

    const [document, stage, recipientUser] = await Promise.all([
      this.edmDocumentRepo.findOneBy({ id: params.documentId }),
      this.edmStageRepo.findOneBy({ id: params.stageId }),
      this.userRepo.findOneBy({ id: params.recipientUserId }),
    ]);
    if (!document || !stage || !recipientUser) {
      return false;
    }

    await this.alertRepo.save(
      this.alertRepo.create({
        document,
        stage,
        recipientUser,
        kind: params.kind,
        status: 'unread',
        message: params.message,
        metadata: params.metadata,
        readAt: null,
      }),
    );
    return true;
  }

  private async resolveAssigneeRecipients(
    stage: EdmRouteStage,
  ): Promise<number[]> {
    if (stage.assigneeType === 'user' && stage.assigneeUser?.id) {
      return [stage.assigneeUser.id];
    }

    if (stage.assigneeType === 'role' && stage.assigneeRole) {
      const users = await this.userRepo.find({
        where: {
          role: stage.assigneeRole as Role,
          isActive: true,
        },
        relations: { department: true },
      });
      return users
        .filter((user) =>
          stage.assigneeDepartment?.id
            ? user.department?.id === stage.assigneeDepartment.id
            : true,
        )
        .map((user) => user.id);
    }

    if (stage.assigneeType === 'department_head') {
      const targetDepartmentId =
        stage.assigneeDepartment?.id ?? stage.route.document.department.id;
      const managers = await this.userRepo.find({
        where: {
          role: In([Role.Manager, Role.DepartmentHead]),
          isActive: true,
          department: { id: targetDepartmentId },
        },
        relations: { department: true },
      });
      return [...new Set(managers.map((item) => item.id))];
    }

    return [];
  }

  private async resolveEscalationRecipients(
    stage: EdmRouteStage,
  ): Promise<number[]> {
    const document = stage.route.document;
    const departmentId = stage.assigneeDepartment?.id ?? document.department.id;

    const [globalUsers, managers] = await Promise.all([
      this.userRepo.find({
        where: {
          role: In([
            Role.Admin,
            Role.Chairperson,
            Role.FirstDeputy,
            Role.Deputy,
            Role.Chancellery,
          ]),
          isActive: true,
        },
      }),
      this.userRepo.find({
        where: {
          role: In([Role.Manager, Role.DepartmentHead]),
          isActive: true,
          department: { id: departmentId },
        },
        relations: { department: true },
      }),
    ]);

    const recipientIds = new Set<number>();
    for (const globalUser of globalUsers) {
      recipientIds.add(globalUser.id);
    }
    for (const manager of managers) {
      recipientIds.add(manager.id);
    }
    recipientIds.add(document.creator.id);
    return [...recipientIds];
  }

  private assertDocumentTemplateScope(
    actor: ActiveUserData,
    template: EdmDocumentTemplate,
  ): void {
    if (this.isGlobalEdmRole(actor.role)) {
      return;
    }
    if (template.scopeType === 'global') {
      return;
    }
    if (template.department?.id === actor.departmentId) {
      return;
    }
    throw new ForbiddenException('Document template is outside your scope');
  }

  private assertDocumentTemplateWriteScope(
    actor: ActiveUserData,
    template: EdmDocumentTemplate,
  ): void {
    if (this.isGlobalEdmRole(actor.role)) {
      return;
    }
    if (
      this.isDepartmentManagerRole(actor.role) &&
      template.scopeType === 'department' &&
      template.department?.id === actor.departmentId
    ) {
      return;
    }
    throw new ForbiddenException(
      'Only global roles or owning department head can modify document template',
    );
  }

  private async replaceDocumentTemplateFields(
    template: EdmDocumentTemplate,
    fields: DocumentTemplateFieldDto[],
  ): Promise<void> {
    await this.documentTemplateFieldRepo.delete({
      template: { id: template.id },
    });
    const sorted = [...fields].sort(
      (a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100),
    );
    const created = sorted.map((field) =>
      this.documentTemplateFieldRepo.create({
        template,
        fieldKey: field.fieldKey,
        label: field.label,
        fieldType: field.fieldType ?? 'text',
        isRequired: field.isRequired ?? false,
        isReadonly: field.isReadonly ?? false,
        defaultValue: field.defaultValue ?? null,
        sortOrder: field.sortOrder ?? 100,
        validationRules: field.validationRules ?? null,
      }),
    );
    if (created.length) {
      await this.documentTemplateFieldRepo.save(created);
    }
  }

  private async resolveDocumentTemplateContext(
    templateId: number,
    actor: ActiveUserData,
    templateValues: Record<string, string>,
  ): Promise<{
    template: EdmDocumentTemplate;
    resolved: {
      type?: string;
      title?: string;
      subject?: string;
      summary?: string;
      resolutionText?: string;
      dueAt?: string;
      confidentiality?: string;
    };
  }> {
    const template = await this.findDocumentTemplate(templateId, actor);
    if (!template.isActive) {
      throw new ConflictException('Document template is inactive');
    }

    const resolved: {
      type?: string;
      title?: string;
      subject?: string;
      summary?: string;
      resolutionText?: string;
      dueAt?: string;
      confidentiality?: string;
    } = {};

    for (const field of template.fields) {
      const incomingValue = templateValues[field.fieldKey];
      const defaultValue = field.defaultValue ?? undefined;
      const effectiveValue = incomingValue ?? defaultValue;

      if (
        field.isReadonly &&
        incomingValue !== undefined &&
        incomingValue !== defaultValue
      ) {
        throw new BadRequestException(
          `Field "${field.fieldKey}" is readonly in selected template`,
        );
      }
      if (
        field.isRequired &&
        (effectiveValue === undefined ||
          effectiveValue === null ||
          effectiveValue === '')
      ) {
        throw new BadRequestException(
          `Field "${field.fieldKey}" is required in selected template`,
        );
      }
      if (effectiveValue === undefined) {
        continue;
      }

      if (field.fieldKey === 'title') {
        resolved.title = effectiveValue;
      } else if (field.fieldKey === 'subject') {
        resolved.subject = effectiveValue;
      } else if (field.fieldKey === 'summary') {
        resolved.summary = effectiveValue;
      } else if (field.fieldKey === 'resolutionText') {
        resolved.resolutionText = effectiveValue;
      } else if (field.fieldKey === 'dueAt') {
        const parsed = new Date(effectiveValue);
        if (Number.isNaN(parsed.getTime())) {
          throw new BadRequestException(
            'Template dueAt value must be valid date',
          );
        }
        resolved.dueAt = parsed.toISOString();
      } else if (field.fieldKey === 'confidentiality') {
        if (
          ![
            'public_internal',
            'department_confidential',
            'restricted',
          ].includes(effectiveValue)
        ) {
          throw new BadRequestException(
            'Template confidentiality must be one of allowed values',
          );
        }
        resolved.confidentiality = effectiveValue;
      } else if (field.fieldKey === 'type') {
        if (
          !['incoming', 'outgoing', 'internal', 'order', 'resolution'].includes(
            effectiveValue,
          )
        ) {
          throw new BadRequestException(
            'Template type must be one of allowed document types',
          );
        }
        resolved.type = effectiveValue;
      }
    }

    resolved.type = resolved.type ?? template.documentType;
    return { template, resolved };
  }

  private async getDocumentOrFail(documentId: number): Promise<EdmDocument> {
    const document = await this.edmDocumentRepo.findOne({
      where: { id: documentId },
      relations: {
        creator: { department: true },
        department: true,
        currentRoute: true,
      },
    });

    if (!document || document.deletedAt) {
      throw new NotFoundException('EDM document not found');
    }

    return document;
  }

  private assertDocumentScope(
    actor: ActiveUserData,
    document: EdmDocument,
  ): void {
    if (this.isGlobalEdmRole(actor.role)) {
      return;
    }

    if (document.creator.id === actor.sub) {
      return;
    }

    if (
      this.isDepartmentManagerRole(actor.role) &&
      actor.departmentId === document.department.id
    ) {
      return;
    }

    throw new ForbiddenException('EDM document is outside your scope');
  }

  private applyDocumentListScope(
    qb: ReturnType<Repository<EdmDocument>['createQueryBuilder']>,
    actor: ActiveUserData,
  ): void {
    if (this.isGlobalEdmRole(actor.role)) {
      return;
    }

    qb.andWhere(
      new Brackets((scopeQb) => {
        scopeQb.where('creator.id = :actorId', { actorId: actor.sub });

        if (this.isDepartmentManagerRole(actor.role) && actor.departmentId) {
          scopeQb.orWhere('department.id = :departmentId', {
            departmentId: actor.departmentId,
          });
        }
      }),
    );
  }

  private assertAssigneeConsistency(
    stageDto: SubmitEdmRouteStageDto,
    options?: { allowDepartmentHeadWithoutDepartment?: boolean },
  ) {
    if (stageDto.assigneeType === 'user' && !stageDto.assigneeUserId) {
      throw new BadRequestException(
        'assigneeUserId is required for user assignee',
      );
    }
    if (stageDto.assigneeType === 'role' && !stageDto.assigneeRole) {
      throw new BadRequestException(
        'assigneeRole is required for role assignee',
      );
    }
    if (
      stageDto.assigneeType === 'department_head' &&
      !stageDto.assigneeDepartmentId &&
      !options?.allowDepartmentHeadWithoutDepartment
    ) {
      throw new BadRequestException(
        'assigneeDepartmentId is required for department_head assignee',
      );
    }
  }

  private async resolveTemplateDepartment(
    departmentId: number | undefined,
    actor: ActiveUserData,
  ): Promise<Department> {
    if (!departmentId) {
      throw new BadRequestException(
        'departmentId is required for department scope',
      );
    }
    const department = await this.departmentRepo.findOneBy({
      id: departmentId,
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    if (
      !this.isGlobalEdmRole(actor.role) &&
      actor.departmentId !== department.id
    ) {
      throw new ForbiddenException('Template department is outside your scope');
    }
    return department;
  }

  private assertTemplateScope(
    actor: ActiveUserData,
    template: EdmRouteTemplate,
  ): void {
    if (this.isGlobalEdmRole(actor.role)) {
      return;
    }
    if (template.scopeType === 'global') {
      return;
    }
    if (
      template.department?.id &&
      template.department.id === actor.departmentId
    ) {
      return;
    }
    throw new ForbiddenException('Route template is outside your scope');
  }

  private assertTemplateWriteScope(
    actor: ActiveUserData,
    template: EdmRouteTemplate,
  ): void {
    if (this.isGlobalEdmRole(actor.role)) {
      return;
    }
    if (
      this.isDepartmentManagerRole(actor.role) &&
      template.scopeType === 'department' &&
      template.department?.id === actor.departmentId
    ) {
      return;
    }
    throw new ForbiddenException(
      'Only global roles or owning department head can modify template',
    );
  }

  private async replaceTemplateStages(
    template: EdmRouteTemplate,
    stages: RouteTemplateStageDto[],
  ): Promise<void> {
    await this.routeTemplateStageRepo.delete({ template: { id: template.id } });

    const sortedStages = [...stages].sort((a, b) => a.orderNo - b.orderNo);
    const entities: EdmRouteTemplateStage[] = [];
    for (const stageDto of sortedStages) {
      this.assertAssigneeConsistency(stageDto, {
        allowDepartmentHeadWithoutDepartment: true,
      });

      const assigneeUser = stageDto.assigneeUserId
        ? await this.userRepo.findOneBy({ id: stageDto.assigneeUserId })
        : null;
      const assigneeDepartment = stageDto.assigneeDepartmentId
        ? await this.departmentRepo.findOneBy({
            id: stageDto.assigneeDepartmentId,
          })
        : null;

      entities.push(
        this.routeTemplateStageRepo.create({
          template,
          orderNo: stageDto.orderNo,
          stageGroupNo: stageDto.stageGroupNo ?? null,
          stageType: stageDto.stageType,
          assigneeType: stageDto.assigneeType,
          assigneeUser,
          assigneeRole: stageDto.assigneeRole ?? null,
          assigneeDepartment,
          dueInHours: stageDto.dueInHours ?? null,
          escalationPolicy: stageDto.escalationPolicy ?? null,
        }),
      );
    }

    if (entities.length) {
      await this.routeTemplateStageRepo.save(entities);
    }
  }

  private async buildStagesFromTemplate(
    routeTemplateId: number,
    actor: ActiveUserData,
    document: EdmDocument,
  ): Promise<SubmitEdmRouteStageDto[]> {
    const template = await this.findRouteTemplate(routeTemplateId, actor);
    if (!template.isActive) {
      throw new ConflictException('Route template is inactive');
    }
    if (template.stages.length === 0) {
      throw new BadRequestException('Route template has no stages');
    }

    return [...template.stages]
      .sort((a, b) => a.orderNo - b.orderNo)
      .map((stage) => ({
        orderNo: stage.orderNo,
        stageGroupNo: stage.stageGroupNo ?? undefined,
        stageType: stage.stageType,
        assigneeType: stage.assigneeType,
        assigneeUserId: stage.assigneeUser?.id,
        assigneeRole: stage.assigneeRole ?? undefined,
        assigneeDepartmentId:
          stage.assigneeDepartment?.id ??
          (stage.assigneeType === 'department_head'
            ? document.department.id
            : undefined),
        dueAt: stage.dueInHours
          ? new Date(
              Date.now() + stage.dueInHours * 60 * 60 * 1000,
            ).toISOString()
          : undefined,
        escalationPolicy: stage.escalationPolicy ?? undefined,
      }));
  }

  private async assignExternalNumber(
    manager: EntityManager,
    document: EdmDocument,
  ): Promise<string> {
    const now = new Date();
    const year = now.getUTCFullYear();

    const sequenceRepo = manager.getRepository(EdmDocumentRegistrySequence);
    let sequence = await sequenceRepo.findOne({
      where: {
        department: { id: document.department.id },
        docType: document.type,
        year,
      },
      relations: {
        department: true,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (!sequence) {
      sequence = await sequenceRepo.save(
        sequenceRepo.create({
          department: document.department,
          docType: document.type,
          year,
          lastValue: 0,
        }),
      );
    }

    sequence.lastValue += 1;
    await sequenceRepo.save(sequence);

    const seq = String(sequence.lastValue).padStart(6, '0');
    const deptCode = `DEPT${document.department.id}`;
    return `${deptCode}-${document.type.toUpperCase()}-${year}-${seq}`;
  }

  private resolveActionResultState(
    action: ExecuteEdmStageActionDto['action'],
  ): EdmStageAction['actionResultState'] {
    if (action === 'approved') {
      return 'approved';
    }
    if (action === 'rejected') {
      return 'rejected';
    }
    if (action === 'returned_for_revision') {
      return 'returned';
    }
    return 'commented';
  }

  private resolveStageState(
    action: ExecuteEdmStageActionDto['action'],
  ): EdmRouteStage['state'] {
    if (action === 'approved') {
      return 'approved';
    }
    if (action === 'rejected') {
      return 'rejected';
    }
    if (action === 'returned_for_revision') {
      return 'returned';
    }
    return 'in_progress';
  }

  private async applyRouteProgress(
    manager: EntityManager,
    document: EdmDocument,
    stage: EdmRouteStage,
    action: ExecuteEdmStageActionDto['action'],
  ): Promise<void> {
    const route = await manager.getRepository(EdmDocumentRoute).findOneBy({
      id: stage.route.id,
    });
    if (!route) {
      throw new NotFoundException('Route not found');
    }

    if (action === 'rejected') {
      route.state = 'rejected';
      route.finishedAt = new Date();
      document.status = 'rejected';
      document.rejectedAt = new Date();
      await manager.getRepository(EdmDocumentRoute).save(route);
      await manager.getRepository(EdmDocument).save(document);
      return;
    }

    if (action === 'returned_for_revision') {
      route.state = 'returned';
      route.finishedAt = new Date();
      document.status = 'returned_for_revision';
      await manager.getRepository(EdmDocumentRoute).save(route);
      await manager.getRepository(EdmDocument).save(document);
      return;
    }

    if (action === 'commented') {
      return;
    }

    const stages = await manager.getRepository(EdmRouteStage).find({
      where: { route: { id: route.id } },
      order: { orderNo: 'ASC', id: 'ASC' },
    });

    const minActiveOrder = stages
      .filter((item) =>
        ['pending', 'in_progress', 'approved'].includes(item.state),
      )
      .reduce(
        (acc, item) => Math.min(acc, item.orderNo),
        Number.MAX_SAFE_INTEGER,
      );

    const currentOrderStages = stages.filter(
      (item) => item.orderNo === minActiveOrder,
    );

    const inProgressOrPendingCount = currentOrderStages.filter((item) =>
      ['pending', 'in_progress'].includes(item.state),
    ).length;

    if (route.completionPolicy === 'parallel_any_of' && action === 'approved') {
      for (const item of currentOrderStages) {
        if (
          item.id !== stage.id &&
          ['pending', 'in_progress'].includes(item.state)
        ) {
          item.state = 'skipped';
          item.completedAt = new Date();
          await manager.getRepository(EdmRouteStage).save(item);
        }
      }
    }

    if (
      route.completionPolicy !== 'parallel_any_of' &&
      inProgressOrPendingCount > 0
    ) {
      return;
    }

    const remainingPending = stages
      .filter((item) => ['pending', 'in_progress'].includes(item.state))
      .sort((a, b) => a.orderNo - b.orderNo);

    if (!remainingPending.length) {
      route.state = 'completed';
      route.finishedAt = new Date();
      document.status = 'approved';
      document.approvedAt = new Date();
      await manager.getRepository(EdmDocumentRoute).save(route);
      await manager.getRepository(EdmDocument).save(document);
      return;
    }

    const nextOrder = remainingPending[0].orderNo;
    for (const item of remainingPending.filter(
      (pending) => pending.orderNo === nextOrder,
    )) {
      if (item.state === 'pending') {
        item.state = 'in_progress';
        item.startedAt = item.startedAt ?? new Date();
        await manager.getRepository(EdmRouteStage).save(item);
      }
    }
  }

  private async findDelegationForStage(
    actor: ActiveUserData,
    stage: EdmRouteStage,
    requiredPermission: Permission,
  ): Promise<IamDelegation | null> {
    const now = new Date();
    const delegations = await this.delegationRepo
      .createQueryBuilder('delegation')
      .leftJoinAndSelect('delegation.delegatorUser', 'delegatorUser')
      .leftJoinAndSelect('delegation.scopeDepartment', 'scopeDepartment')
      .where('delegation.delegate_user_id = :actorId', { actorId: actor.sub })
      .andWhere('delegation.status = :status', { status: 'active' })
      .andWhere(
        'delegation.valid_from <= :now AND delegation.valid_to >= :now',
        { now },
      )
      .andWhere(
        new Brackets((delegationQb) => {
          delegationQb
            .where('delegation.scope_type = :global', { global: 'global' })
            .orWhere('scopeDepartment.id = :stageDepartmentId', {
              stageDepartmentId: stage.assigneeDepartment?.id ?? -1,
            });
        }),
      )
      .getMany();

    return (
      delegations.find((delegation) =>
        Array.isArray(delegation.permissionSubset)
          ? delegation.permissionSubset.includes(requiredPermission)
          : false,
      ) ?? null
    );
  }

  private assertStageAssignee(
    actor: ActiveUserData,
    stage: EdmRouteStage,
    onBehalfOfUserId: number | null,
  ): void {
    if (this.isGlobalEdmRole(actor.role)) {
      return;
    }

    const matchesUser =
      stage.assigneeType === 'user' &&
      (stage.assigneeUser?.id === actor.sub ||
        (onBehalfOfUserId !== null &&
          stage.assigneeUser?.id === onBehalfOfUserId));

    const matchesRole =
      stage.assigneeType === 'role' &&
      String(actor.role) === String(stage.assigneeRole);

    const matchesDepartmentHead =
      stage.assigneeType === 'department_head' &&
      this.isDepartmentManagerRole(actor.role) &&
      stage.assigneeDepartment?.id === actor.departmentId;

    if (matchesUser || matchesRole || matchesDepartmentHead) {
      return;
    }

    throw new ForbiddenException('Stage is not assigned to current user');
  }

  private async assertDocumentReadScope(
    actor: ActiveUserData,
    document: EdmDocument,
  ): Promise<void> {
    if (this.isGlobalEdmRole(actor.role)) {
      return;
    }

    try {
      this.assertDocumentScope(actor, document);
      return;
    } catch {
      // Fallback to stage-assignment-based visibility for EDM.
    }

    if (!document.currentRoute) {
      throw new ForbiddenException('EDM document is outside your scope');
    }

    const hasAssignedStage = await this.edmStageRepo
      .createQueryBuilder('stage')
      .leftJoin('stage.route', 'route')
      .leftJoin('stage.assigneeUser', 'assigneeUser')
      .leftJoin('stage.assigneeDepartment', 'assigneeDepartment')
      .where('route.id = :routeId', { routeId: document.currentRoute.id })
      .andWhere('stage.state IN (:...states)', {
        states: ['pending', 'in_progress'],
      })
      .andWhere(
        new Brackets((scopeQb) => {
          scopeQb
            .where('assigneeUser.id = :actorId', { actorId: actor.sub })
            .orWhere(
              'stage.assigneeType = :roleType AND stage.assigneeRole = :actorRole',
              {
                roleType: 'role',
                actorRole: actor.role,
              },
            );

          if (this.isDepartmentManagerRole(actor.role) && actor.departmentId) {
            scopeQb.orWhere(
              'stage.assigneeType = :departmentHeadType AND assigneeDepartment.id = :departmentId',
              {
                departmentHeadType: 'department_head',
                departmentId: actor.departmentId,
              },
            );
          }
        }),
      )
      .getExists();

    if (!hasAssignedStage) {
      const hasTimelineRecipientAccess = await this.timelineRepo
        .createQueryBuilder('timeline')
        .leftJoin('timeline.document', 'document')
        .leftJoin('timeline.toUser', 'toUser')
        .where('document.id = :documentId', { documentId: document.id })
        .andWhere('toUser.id = :actorId', { actorId: actor.sub })
        .getExists();

      if (!hasTimelineRecipientAccess) {
        throw new ForbiddenException('EDM document is outside your scope');
      }
    }
  }

  private isGlobalEdmRole(role: Role): boolean {
    return [
      Role.Admin,
      Role.Chairperson,
      Role.FirstDeputy,
      Role.Deputy,
      Role.Chancellery,
    ].includes(role);
  }

  private isDepartmentManagerRole(role: Role): boolean {
    return [Role.Manager, Role.DepartmentHead].includes(role);
  }

  private async assertOverrideAllowed(
    actor: ActiveUserData,
    document: EdmDocument,
  ): Promise<void> {
    if (this.isGlobalEdmRole(actor.role)) {
      return;
    }

    if (!this.isDepartmentManagerRole(actor.role)) {
      throw new ForbiddenException(
        'You do not have permission to override this route',
      );
    }

    if (document.creator.id === actor.sub) {
      return;
    }

    const hasParticipation = await this.timelineRepo
      .createQueryBuilder('timeline')
      .leftJoin('timeline.document', 'document')
      .leftJoin('timeline.actorUser', 'actorUser')
      .where('document.id = :documentId', { documentId: document.id })
      .andWhere('actorUser.id = :actorId', { actorId: actor.sub })
      .andWhere('timeline.eventType IN (:...eventTypes)', {
        eventTypes: ['created', 'submitted', 'forwarded'],
      })
      .getExists();

    if (!hasParticipation) {
      throw new ForbiddenException(
        'Department head can override only own or previously routed documents',
      );
    }
  }

  private async recordTimelineEvent(
    payload: {
      document: EdmDocument;
      eventType: EdmDocumentTimelineEvent['eventType'];
      actorUser: User;
      fromUser: User | null;
      toUser: User | null;
      fromRole: string | null;
      toRole: string | null;
      responsibleUser: User | null;
      parentEvent: EdmDocumentTimelineEvent | null;
      threadId: string | null;
      commentText: string | null;
      meta: Record<string, unknown> | null;
    },
    manager?: EntityManager,
  ): Promise<EdmDocumentTimelineEvent> {
    const repo = manager
      ? manager.getRepository(EdmDocumentTimelineEvent)
      : this.timelineRepo;

    return repo.save(
      repo.create({
        document: payload.document,
        eventType: payload.eventType,
        actorUser: payload.actorUser,
        fromUser: payload.fromUser,
        toUser: payload.toUser,
        fromRole: payload.fromRole,
        toRole: payload.toRole,
        responsibleUser: payload.responsibleUser,
        parentEvent: payload.parentEvent,
        threadId: payload.threadId,
        commentText: payload.commentText,
        meta: payload.meta,
      }),
    );
  }

  private assertRoutingTargetAllowed(
    actor: ActiveUserData,
    targetUser: User,
  ): void {
    if (actor.role === Role.Admin || actor.role === Role.Chancellery) {
      return;
    }

    const targetRole = targetUser.role;
    const sameDepartment =
      actor.departmentId !== null &&
      actor.departmentId !== undefined &&
      targetUser.department?.id === actor.departmentId;

    if (actor.role === Role.Chairperson) {
      if (
        [
          Role.FirstDeputy,
          Role.Deputy,
          Role.DepartmentHead,
          Role.Manager,
          Role.DivisionHead,
          Role.Chancellery,
        ].includes(targetRole)
      ) {
        return;
      }
      throw new ForbiddenException(
        'Routing target is not allowed for chairperson',
      );
    }

    if (actor.role === Role.FirstDeputy || actor.role === Role.Deputy) {
      if (
        [
          Role.Chairperson,
          Role.FirstDeputy,
          Role.Deputy,
          Role.DepartmentHead,
          Role.Manager,
          Role.DivisionHead,
          Role.Chancellery,
        ].includes(targetRole)
      ) {
        return;
      }
      throw new ForbiddenException(
        'Routing target is not allowed for deputy role',
      );
    }

    if (actor.role === Role.DepartmentHead || actor.role === Role.Manager) {
      if (
        [Role.DepartmentHead, Role.Manager, Role.Chancellery].includes(
          targetRole,
        )
      ) {
        return;
      }
      if (
        sameDepartment &&
        [Role.DivisionHead, Role.Employee, Role.Regular].includes(targetRole)
      ) {
        return;
      }
      throw new ForbiddenException(
        'Routing target is outside department head matrix',
      );
    }

    if (actor.role === Role.DivisionHead) {
      if (targetRole === Role.Chancellery) {
        return;
      }
      if (
        sameDepartment &&
        [
          Role.DepartmentHead,
          Role.Manager,
          Role.DivisionHead,
          Role.Employee,
          Role.Regular,
        ].includes(targetRole)
      ) {
        return;
      }
      throw new ForbiddenException(
        'Routing target is outside division head matrix',
      );
    }

    if (actor.role === Role.Employee || actor.role === Role.Regular) {
      if (sameDepartment || targetRole === Role.Chancellery) {
        return;
      }
      throw new ForbiddenException('Routing target is outside employee matrix');
    }

    throw new ForbiddenException('Routing target is not allowed');
  }

  private normalizeDocumentsCriteria(
    source: Partial<SavedDocumentsCriteriaDto> | Record<string, unknown>,
  ): SavedDocumentsCriteriaDto {
    const pick = <T extends keyof SavedDocumentsCriteriaDto>(
      key: T,
    ): SavedDocumentsCriteriaDto[T] | undefined => {
      const value = (source as Record<string, unknown>)[key as string];
      return value === undefined || value === null
        ? undefined
        : (value as SavedDocumentsCriteriaDto[T]);
    };

    return {
      status: pick('status'),
      type: pick('type'),
      departmentId: pick('departmentId'),
      creatorId: pick('creatorId'),
      externalNumber: pick('externalNumber'),
      q: pick('q'),
      fromDate: pick('fromDate'),
      toDate: pick('toDate'),
    };
  }

  private async findOwnedSavedFilter(
    filterId: number,
    userId: number,
  ): Promise<EdmSavedFilter> {
    const filter = await this.savedFilterRepo.findOne({
      where: { id: filterId },
      relations: { user: true },
    });
    if (!filter) {
      throw new NotFoundException('Saved filter not found');
    }
    if (filter.user.id !== userId) {
      throw new ForbiddenException('Saved filter is outside your scope');
    }
    return filter;
  }

  private isReportScopeAllowed(
    actor: ActiveUserData,
    departmentId: number | null,
    creatorId?: number | null,
  ): boolean {
    if (this.isGlobalEdmRole(actor.role)) {
      return true;
    }
    if (creatorId && creatorId === actor.sub) {
      return true;
    }
    return (
      this.isDepartmentManagerRole(actor.role) &&
      departmentId === actor.departmentId
    );
  }

  private buildCsv(
    rows: Array<Array<string | number | boolean | null | undefined>>,
  ): string {
    return rows
      .map((row) => row.map((cell) => this.escapeCsvCell(cell)).join(','))
      .join('\n');
  }

  private escapeCsvCell(
    value: string | number | boolean | null | undefined,
  ): string {
    if (value === null || value === undefined) {
      return '';
    }
    const normalized = String(value);
    const escaped = normalized.replace(/"/g, '""');
    return /[",\n\r]/.test(normalized) ? `"${escaped}"` : escaped;
  }

  private buildXlsxBuffer(
    sheets: Array<{
      name: string;
      rows: Array<Array<string | number | boolean | null | undefined>>;
    }>,
  ): Buffer {
    const workbook = XLSX.utils.book_new();
    for (const sheet of sheets) {
      const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
      XLSX.utils.book_append_sheet(workbook, ws, sheet.name.slice(0, 31));
    }
    const fileBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;
    return fileBuffer;
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

        if (this.isDepartmentManagerRole(actor.role)) {
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
