import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { EntityManager } from 'typeorm';
import { EdmDocument } from './entities/edm-document.entity';
import {
  EdmDocumentRoute,
  EdmRouteCompletionPolicy,
} from './entities/edm-document-route.entity';
import { EdmRouteStage } from './entities/edm-route-stage.entity';
import { EdmStageAction } from './entities/edm-stage-action.entity';
import { EdmDocumentTimelineEvent } from './entities/edm-document-timeline-event.entity';
import { IamDelegation } from './entities/iam-delegation.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../department/entities/department.entity';
import type { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Permission } from '../iam/authorization/permission.type';
import { EdmCoreService } from './edm-core.service';
import { EdmTemplatesService } from './edm-templates.service';
import { EdmReportsService } from './edm-reports.service';
import {
  EdmOverrideDto,
  ExecuteEdmStageActionDto,
  SubmitEdmDocumentDto,
} from './dto/submit-edm-document.dto';
import {
  GetDocumentAuditQueryDto,
  GetDocumentHistoryQueryDto,
} from './dto/document-audit-query.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EdmDocumentOverriddenEvent,
  EdmDocumentSubmittedEvent,
  EdmEvents,
  EdmStageActionExecutedEvent,
} from './events/edm-events';

@Injectable()
export class EdmRouteService {
  constructor(
    @InjectRepository(EdmDocument)
    private readonly edmDocumentRepo: Repository<EdmDocument>,
    @InjectRepository(EdmDocumentRoute)
    private readonly edmRouteRepo: Repository<EdmDocumentRoute>,
    @InjectRepository(EdmRouteStage)
    private readonly edmStageRepo: Repository<EdmRouteStage>,
    @InjectRepository(EdmStageAction)
    private readonly edmActionRepo: Repository<EdmStageAction>,
    @InjectRepository(EdmDocumentTimelineEvent)
    private readonly timelineRepo: Repository<EdmDocumentTimelineEvent>,
    @InjectRepository(IamDelegation)
    private readonly delegationRepo: Repository<IamDelegation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    private readonly dataSource: DataSource,
    private readonly core: EdmCoreService,
    private readonly templates: EdmTemplatesService,
    private readonly reports: EdmReportsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
    const document = await this.core.getDocumentOrFail(id);
    this.core.assertDocumentScope(actor, document);

    if (!['draft', 'returned_for_revision'].includes(document.status)) {
      throw new ConflictException(
        'Document cannot be submitted in current state',
      );
    }

    const stagesInput = dto.routeTemplateId
      ? await this.templates.buildStagesFromTemplate(dto.routeTemplateId, actor, document)
      : (dto.stages ?? []);
    if (!stagesInput.length) {
      throw new ConflictException('At least one route stage is required');
    }

    const result = await this.dataSource.transaction(async (manager) => {
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
        this.templates.assertAssigneeConsistency(stageDto);

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
        await this.core.recordTimelineEvent(
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
          await this.core.recordTimelineEvent(
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

    this.eventEmitter.emit(
      EdmEvents.DOCUMENT_SUBMITTED,
      new EdmDocumentSubmittedEvent(
        result.documentId,
        actor.sub,
        result.routeId,
        result.versionNo,
        result.externalNumber,
      ),
    );

    return result;
  }

  async executeStageAction(
    documentId: number,
    stageId: number,
    dto: ExecuteEdmStageActionDto,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    const document = await this.core.getDocumentOrFail(documentId);

    if (!document.currentRoute) {
      throw new ConflictException('Document has no active route');
    }

    const result = await this.dataSource.transaction(async (manager) => {
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

      const actionResultState = this.core.resolveActionResultState(dto.action);
      const stageState = this.core.resolveStageState(dto.action);

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

      await this.core.recordTimelineEvent(
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

    this.eventEmitter.emit(
      EdmEvents.STAGE_ACTION_EXECUTED,
      new EdmStageActionExecutedEvent(
        result.documentId,
        result.routeId,
        result.stageId,
        result.action,
        actor.sub,
        result.documentStatus,
        result.routeState,
      ),
    );

    return result;
  }

  async override(
    documentId: number,
    dto: EdmOverrideDto,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    const document = await this.core.getDocumentOrFail(documentId);
    await this.core.assertOverrideAllowed(actor, document);
    if (!document.currentRoute) {
      throw new ConflictException('Document has no active route');
    }

    const result = await this.dataSource.transaction(async (manager) => {
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

        await this.core.recordTimelineEvent(
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
        overrideAction: dto.overrideAction,
      };
    });

    this.eventEmitter.emit(
      EdmEvents.DOCUMENT_OVERRIDDEN,
      new EdmDocumentOverriddenEvent(
        result.id,
        actor.sub,
        result.overrideAction,
        result.status,
      ),
    );

    return result;
  }

  async findAudit(
    documentId: number,
    actor: ActiveUserData,
    query: GetDocumentAuditQueryDto,
  ) {
    const document = await this.core.getDocumentOrFail(documentId);
    await this.core.assertDocumentReadScope(actor, document);

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
    const document = await this.core.getDocumentOrFail(documentId);
    await this.core.assertDocumentReadScope(actor, document);

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
    return `\uFEFF${this.core.buildCsv(rows)}`;
  }

  async exportDocumentAuditXlsx(
    documentId: number,
    actor: ActiveUserData,
    query: GetDocumentAuditQueryDto,
  ): Promise<Buffer> {
    const audit = await this.findAudit(documentId, actor, query);
    return this.core.buildXlsxBuffer([
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
    return `\uFEFF${this.core.buildCsv(rows)}`;
  }

  async exportDocumentHistoryXlsx(
    documentId: number,
    actor: ActiveUserData,
    query: GetDocumentHistoryQueryDto,
  ): Promise<Buffer> {
    const history = await this.findHistory(documentId, actor, query);
    return this.core.buildXlsxBuffer([
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

  private resolveActionResultState(
    action: ExecuteEdmStageActionDto['action'],
  ): EdmStageAction['actionResultState'] {
    return this.core.resolveActionResultState(action);
  }

  private resolveStageState(
    action: ExecuteEdmStageActionDto['action'],
  ): EdmRouteStage['state'] {
    return this.core.resolveStageState(action);
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

        await this.reports.createAlertIfMissing({
          documentId: document.id,
          stageId: item.id,
          recipientUserId: item.assigneeUser?.id ?? 0,
          kind: 'due_soon',
          message: `Stage #${item.id} is now active for document #${document.id}`,
          metadata: { routeId: route.id },
        });
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
    if (this.core.isGlobalEdmRole(actor.role)) {
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
      this.core.isDepartmentManagerRole(actor.role) &&
      stage.assigneeDepartment?.id === actor.departmentId;

    if (matchesUser || matchesRole || matchesDepartmentHead) {
      return;
    }

    throw new ForbiddenException('Stage is not assigned to current user');
  }

  private async assignExternalNumber(
    manager: EntityManager,
    document: EdmDocument,
  ): Promise<string> {
    const { EdmDocumentRegistrySequence } = await import('./entities/edm-document-registry-sequence.entity');
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
}
