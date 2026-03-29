import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EdmDocument } from './entities/edm-document.entity';
import { EdmDocumentRoute } from './entities/edm-document-route.entity';
import { EdmRouteStage } from './entities/edm-route-stage.entity';
import { EdmAlert } from './entities/edm-alert.entity';
import { User } from '../users/entities/user.entity';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Role } from '../users/enums/role.enum';
import { EdmCoreService } from './edm-core.service';
import { GetAlertsQueryDto } from './dto/alerts.dto';
import { EdmDashboardQueryDto, EdmReportsQueryDto } from './dto/reports.dto';
import { PaginatedResponse } from '../common/http/pagination-query.dto';

@Injectable()
export class EdmReportsService {
  constructor(
    @InjectRepository(EdmDocumentRoute)
    private readonly edmRouteRepo: Repository<EdmDocumentRoute>,
    @InjectRepository(EdmRouteStage)
    private readonly edmStageRepo: Repository<EdmRouteStage>,
    @InjectRepository(EdmAlert)
    private readonly alertRepo: Repository<EdmAlert>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(EdmDocument)
    private readonly edmDocumentRepo: Repository<EdmDocument>,
    @InjectRepository(EdmRouteStage)
    private readonly stageRepo: Repository<EdmRouteStage>,
    private readonly core: EdmCoreService,
  ) {}

  async processDeadlineAlerts(actor: ActiveUserData) {
    if (
      !this.core.isGlobalEdmRole(actor.role) &&
      !this.core.isDepartmentManagerRole(actor.role)
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
      this.core.isReportScopeAllowed(
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
      this.core.isReportScopeAllowed(
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
      this.core.isReportScopeAllowed(
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
        this.core.isGlobalEdmRole(actor.role)
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
    return `\uFEFF${this.core.buildCsv(rows)}`;
  }

  async exportSlaReportXlsx(
    actor: ActiveUserData,
    query: EdmReportsQueryDto,
  ): Promise<Buffer> {
    const report = await this.getSlaReport(actor, query);
    return this.core.buildXlsxBuffer([
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
    return `\uFEFF${this.core.buildCsv(rows)}`;
  }

  async exportOverdueReportXlsx(
    actor: ActiveUserData,
    query: EdmReportsQueryDto,
  ): Promise<Buffer> {
    const report = await this.getOverdueReport(actor, query);
    return this.core.buildXlsxBuffer([
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
    return `\uFEFF${this.core.buildCsv(rows)}`;
  }

  async exportWorkloadReportXlsx(
    actor: ActiveUserData,
    query: EdmReportsQueryDto,
  ): Promise<Buffer> {
    const report = await this.getWorkloadReport(actor, query);
    return this.core.buildXlsxBuffer([
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

  async createAlertIfMissing(params: {
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
      this.stageRepo.findOneBy({ id: params.stageId }),
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
}
