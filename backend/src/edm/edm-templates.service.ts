import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { EdmDocument } from './entities/edm-document.entity';
import { EdmRouteTemplate } from './entities/edm-route-template.entity';
import { EdmRouteTemplateStage } from './entities/edm-route-template-stage.entity';
import { EdmDocumentTemplate } from './entities/edm-document-template.entity';
import { EdmDocumentTemplateField } from './entities/edm-document-template-field.entity';
import { EdmDocumentKind } from './entities/edm-document-kind.entity';
import { EdmSavedFilter } from './entities/edm-saved-filter.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../department/entities/department.entity';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { ScopeResolverService } from '../iam/authorization/scope-resolver.service';
import { EdmCoreService } from './edm-core.service';
import {
  CreateRouteTemplateDto,
  GetRouteTemplatesQueryDto,
  RouteTemplateStageDto,
  UpdateRouteTemplateDto,
} from './dto/route-template.dto';
import {
  CreateDocumentTemplateDto,
  DocumentTemplateFieldDto,
  GetDocumentTemplatesQueryDto,
  UpdateDocumentTemplateDto,
} from './dto/document-template.dto';
import {
  CreateSavedFilterDto,
  GetSavedFiltersQueryDto,
  UpdateSavedFilterDto,
} from './dto/saved-filters.dto';
import {
  CreateDocumentKindDto,
  GetDocumentKindsQueryDto,
  UpdateDocumentKindDto,
} from './dto/document-kind.dto';
import {
  SubmitEdmRouteStageDto,
} from './dto/submit-edm-document.dto';

@Injectable()
export class EdmTemplatesService {
  constructor(
    @InjectRepository(EdmDocumentKind)
    private readonly documentKindRepo: Repository<EdmDocumentKind>,
    @InjectRepository(EdmDocumentTemplate)
    private readonly documentTemplateRepo: Repository<EdmDocumentTemplate>,
    @InjectRepository(EdmDocumentTemplateField)
    private readonly documentTemplateFieldRepo: Repository<EdmDocumentTemplateField>,
    @InjectRepository(EdmRouteTemplate)
    private readonly routeTemplateRepo: Repository<EdmRouteTemplate>,
    @InjectRepository(EdmRouteTemplateStage)
    private readonly routeTemplateStageRepo: Repository<EdmRouteTemplateStage>,
    @InjectRepository(EdmSavedFilter)
    private readonly savedFilterRepo: Repository<EdmSavedFilter>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    private readonly core: EdmCoreService,
    private readonly scopeResolver: ScopeResolverService,
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
    const criteria = this.core.normalizeDocumentsCriteria(dto.criteria) as Record<
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
      filter.criteria = this.core.normalizeDocumentsCriteria(dto.criteria) as Record<
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

  async createDocumentKind(
    dto: CreateDocumentKindDto,
    actor: ActiveUserData,
  ): Promise<EdmDocumentKind> {
    const actorUser = await this.userRepo.findOneBy({ id: actor.sub });
    if (!actorUser) {
      throw new NotFoundException('Actor not found');
    }

    const normalizedCode = dto.code.trim().toLowerCase();
    const existing = await this.documentKindRepo.findOne({
      where: { code: normalizedCode },
    });
    if (existing) {
      throw new ConflictException('Document kind code already exists');
    }

    const created = this.documentKindRepo.create({
      code: normalizedCode,
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
      isActive: dto.isActive ?? true,
      createdBy: actorUser,
      updatedBy: null,
    });
    return this.documentKindRepo.save(created);
  }

  async listDocumentKinds(query: GetDocumentKindsQueryDto): Promise<EdmDocumentKind[]> {
    const qb = this.documentKindRepo
      .createQueryBuilder('kind')
      .leftJoinAndSelect('kind.createdBy', 'createdBy')
      .leftJoinAndSelect('kind.updatedBy', 'updatedBy')
      .orderBy('kind.name', 'ASC');

    if (query.onlyActive ?? true) {
      qb.andWhere('kind.isActive = true');
    }

    if (query.q) {
      const search = `%${query.q.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((searchQb) => {
          searchQb
            .where('LOWER(kind.name) LIKE :search', { search })
            .orWhere('LOWER(kind.code) LIKE :search', { search });
        }),
      );
    }

    return qb.getMany();
  }

  async findDocumentKind(kindId: number): Promise<EdmDocumentKind> {
    const kind = await this.documentKindRepo.findOne({
      where: { id: kindId },
      relations: {
        createdBy: true,
        updatedBy: true,
      },
    });
    if (!kind) {
      throw new NotFoundException('Document kind not found');
    }
    return kind;
  }

  async updateDocumentKind(
    kindId: number,
    dto: UpdateDocumentKindDto,
    actor: ActiveUserData,
  ): Promise<EdmDocumentKind> {
    const kind = await this.findDocumentKind(kindId);

    if (dto.code !== undefined) {
      const normalizedCode = dto.code.trim().toLowerCase();
      const existing = await this.documentKindRepo.findOne({
        where: { code: normalizedCode },
      });
      if (existing && existing.id !== kind.id) {
        throw new ConflictException('Document kind code already exists');
      }
      kind.code = normalizedCode;
    }
    if (dto.name !== undefined) {
      kind.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      kind.description = dto.description?.trim() ?? null;
    }
    if (dto.isActive !== undefined) {
      kind.isActive = dto.isActive;
    }

    kind.updatedBy = (await this.userRepo.findOneBy({ id: actor.sub })) ?? null;
    return this.documentKindRepo.save(kind);
  }

  async deleteDocumentKind(kindId: number, actor: ActiveUserData): Promise<void> {
    const kind = await this.findDocumentKind(kindId);
    kind.isActive = false;
    kind.updatedBy = (await this.userRepo.findOneBy({ id: actor.sub })) ?? null;
    await this.documentKindRepo.save(kind);
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

    if (!this.core.isGlobalEdmRole(actor.role)) {
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

    if (!this.core.isGlobalEdmRole(actor.role)) {
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

  async resolveDocumentTemplateContext(
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

  async resolveDocumentKindOrNull(
    documentKindId: number | null | undefined,
  ): Promise<EdmDocumentKind | null> {
    if (documentKindId === undefined || documentKindId === null) {
      return null;
    }

    const kind = await this.documentKindRepo.findOne({
      where: { id: documentKindId },
    });
    if (!kind || !kind.isActive) {
      throw new NotFoundException('Document kind not found');
    }
    return kind;
  }

  async buildStagesFromTemplate(
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

  async findOwnedSavedFilter(
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

  assertAssigneeConsistency(
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

  private assertDocumentTemplateScope(
    actor: ActiveUserData,
    template: EdmDocumentTemplate,
  ): void {
    if (
      template.scopeType === 'department' &&
      this.scopeResolver.canAccess(actor, {
        resourceType: 'edm_document',
        departmentId: template.department?.id ?? null,
      })
    ) {
      return;
    }
    if (this.core.isGlobalEdmRole(actor.role)) {
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
    if (
      this.core.isDepartmentManagerRole(actor.role) &&
      template.scopeType === 'department' &&
      this.scopeResolver.canAccess(actor, {
        resourceType: 'edm_document',
        departmentId: template.department?.id ?? null,
      })
    ) {
      return;
    }
    if (this.core.isGlobalEdmRole(actor.role)) {
      return;
    }
    if (
      this.core.isDepartmentManagerRole(actor.role) &&
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
      !this.core.isGlobalEdmRole(actor.role) &&
      !this.scopeResolver.canAccess(actor, {
        resourceType: 'edm_document',
        departmentId: department.id,
      }) &&
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
    if (
      template.scopeType === 'department' &&
      this.scopeResolver.canAccess(actor, {
        resourceType: 'edm_document',
        departmentId: template.department?.id ?? null,
      })
    ) {
      return;
    }
    if (this.core.isGlobalEdmRole(actor.role)) {
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
    if (
      this.core.isDepartmentManagerRole(actor.role) &&
      template.scopeType === 'department' &&
      this.scopeResolver.canAccess(actor, {
        resourceType: 'edm_document',
        departmentId: template.department?.id ?? null,
      })
    ) {
      return;
    }
    if (this.core.isGlobalEdmRole(actor.role)) {
      return;
    }
    if (
      this.core.isDepartmentManagerRole(actor.role) &&
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
}
