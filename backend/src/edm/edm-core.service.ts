import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { EntityManager } from 'typeorm';
import * as XLSX from 'xlsx';
import { EdmDocument } from './entities/edm-document.entity';
import { EdmRouteStage } from './entities/edm-route-stage.entity';
import { EdmDocumentTimelineEvent } from './entities/edm-document-timeline-event.entity';
import { User } from '../users/entities/user.entity';
import type { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Role } from '../users/enums/role.enum';
import { ScopeResolverService } from '../iam/authorization/scope-resolver.service';
import { SavedDocumentsCriteriaDto } from './dto/saved-filters.dto';
import { SubmitEdmRouteStageDto } from './dto/submit-edm-document.dto';
import { ExecuteEdmStageActionDto } from './dto/submit-edm-document.dto';
import { EdmStageAction } from './entities/edm-stage-action.entity';

@Injectable()
export class EdmCoreService {
  constructor(
    @InjectRepository(EdmDocument)
    private readonly edmDocumentRepo: Repository<EdmDocument>,
    @InjectRepository(EdmRouteStage)
    private readonly edmStageRepo: Repository<EdmRouteStage>,
    @InjectRepository(EdmDocumentTimelineEvent)
    private readonly timelineRepo: Repository<EdmDocumentTimelineEvent>,
    private readonly scopeResolver: ScopeResolverService,
  ) {}

  async getDocumentOrFail(documentId: number): Promise<EdmDocument> {
    const document = await this.edmDocumentRepo.findOne({
      where: { id: documentId },
      relations: {
        creator: { department: true },
        department: true,
        documentKind: true,
        currentRoute: true,
      },
    });

    if (!document || document.deletedAt) {
      throw new NotFoundException('EDM document not found');
    }

    return document;
  }

  isGlobalEdmRole(role: Role): boolean {
    return [
      Role.Admin,
      Role.Chairperson,
      Role.FirstDeputy,
      Role.Deputy,
      Role.Chancellery,
    ].includes(role);
  }

  isDepartmentManagerRole(role: Role): boolean {
    return [Role.Manager, Role.DepartmentHead].includes(role);
  }

  assertDocumentScope(
    actor: ActiveUserData,
    document: EdmDocument,
  ): void {
    if (this.scopeResolver.canAccess(actor, document)) {
      return;
    }
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

  async assertDocumentReadScope(
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

  applyDocumentListScope(
    qb: ReturnType<Repository<EdmDocument>['createQueryBuilder']>,
    actor: ActiveUserData,
  ): void {
    if (
      this.isGlobalEdmRole(actor.role) ||
      actor.delegationContext?.scopeType === 'global'
    ) {
      return;
    }
    const delegatedDepartmentId = actor.delegationContext?.scopeDepartmentId;
    const onBehalfOfUserId = actor.onBehalfOfUserId ?? null;

    qb.andWhere(
      new Brackets((scopeQb) => {
        scopeQb.where('creator.id = :actorId', { actorId: actor.sub });
        if (onBehalfOfUserId) {
          scopeQb.orWhere('creator.id = :onBehalfOfUserId', {
            onBehalfOfUserId,
          });
        }

        if (this.isDepartmentManagerRole(actor.role) && actor.departmentId) {
          scopeQb.orWhere('department.id = :departmentId', {
            departmentId: actor.departmentId,
          });
        }
        if (delegatedDepartmentId && delegatedDepartmentId !== actor.departmentId) {
          scopeQb.orWhere('department.id = :delegatedDepartmentId', {
            delegatedDepartmentId,
          });
        }
      }),
    );
  }

  async recordTimelineEvent(
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

  assertRoutingTargetAllowed(
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

  buildCsv(
    rows: Array<Array<string | number | boolean | null | undefined>>,
  ): string {
    return rows
      .map((row) => row.map((cell) => this.escapeCsvCell(cell)).join(','))
      .join('\n');
  }

  escapeCsvCell(
    value: string | number | boolean | null | undefined,
  ): string {
    if (value === null || value === undefined) {
      return '';
    }
    const normalized = String(value);
    const escaped = normalized.replace(/"/g, '""');
    return /[",\n\r]/.test(normalized) ? `"${escaped}"` : escaped;
  }

  buildXlsxBuffer(
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

  isReportScopeAllowed(
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
    if (creatorId && actor.onBehalfOfUserId && creatorId === actor.onBehalfOfUserId) {
      return true;
    }
    if (
      departmentId &&
      this.scopeResolver.canAccess(actor, {
        resourceType: 'edm_document',
        departmentId,
      })
    ) {
      return true;
    }
    return (
      this.isDepartmentManagerRole(actor.role) &&
      departmentId === actor.departmentId
    );
  }

  normalizeDocumentsCriteria(
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
      documentKindId: pick('documentKindId'),
      externalNumber: pick('externalNumber'),
      q: pick('q'),
      fromDate: pick('fromDate'),
      toDate: pick('toDate'),
    };
  }

  assertAssigneeConsistency(
    stageDto: SubmitEdmRouteStageDto,
    options?: { allowDepartmentHeadWithoutDepartment?: boolean },
  ) {
    if (stageDto.assigneeType === 'user' && !stageDto.assigneeUserId) {
      throw new Error(
        'assigneeUserId is required for user assignee',
      );
    }
    if (stageDto.assigneeType === 'role' && !stageDto.assigneeRole) {
      throw new Error(
        'assigneeRole is required for role assignee',
      );
    }
    if (
      stageDto.assigneeType === 'department_head' &&
      !stageDto.assigneeDepartmentId &&
      !options?.allowDepartmentHeadWithoutDepartment
    ) {
      throw new Error(
        'assigneeDepartmentId is required for department_head assignee',
      );
    }
  }

  resolveActionResultState(
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

  resolveStageState(
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

  async assertOverrideAllowed(
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
}
