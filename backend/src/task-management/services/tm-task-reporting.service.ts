import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TmTask } from '../entities/tm-task.entity';
import { TmTaskCacheService } from './tm-task-cache.service';

export interface DepartmentOverview {
  departmentId: number;
  departmentName: string;
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  slaBreached: number;
  completionRate: number;
}

export interface SlaComplianceReport {
  total: number;
  compliant: number;
  breached: number;
  complianceRate: number;
  byPriority: { priority: string; total: number; breached: number }[];
}

export interface CompletionMetrics {
  period: string;
  created: number;
  completed: number;
  closed: number;
  avgCompletionHours: number;
}

@Injectable()
export class TmTaskReportingService {
  constructor(
    @InjectRepository(TmTask)
    private readonly taskRepo: Repository<TmTask>,
    private readonly cache: TmTaskCacheService,
  ) {}

  async getWorkload(
    departmentId?: number,
  ): Promise<{ userId: number; name: string; taskCount: number; criticalCount: number }[]> {
    const cacheKey = this.cache.reportKey(`workload:${departmentId ?? 'all'}`);
    const cached = await this.cache.get<ReturnType<typeof this.getWorkload>>(cacheKey);
    if (cached) return cached as any;

    const qb = this.taskRepo
      .createQueryBuilder('task')
      .select('u.id', 'userId')
      .addSelect('u.name', 'name')
      .addSelect('COUNT(task.id)', 'taskCount')
      .addSelect(
        "COUNT(task.id) FILTER (WHERE task.priority = 'critical')",
        'criticalCount',
      )
      .leftJoin('task.assigneeUser', 'u')
      .where('task.deleted_at IS NULL')
      .andWhere("task.status NOT IN ('completed','closed')")
      .andWhere('task.assignee_user_id IS NOT NULL')
      .groupBy('u.id, u.name')
      .orderBy('"taskCount"', 'DESC');

    if (departmentId) {
      qb.andWhere('task.department_id = :deptId', { deptId: departmentId });
    }

    const result = await qb.getRawMany();
    await this.cache.set(cacheKey, result, this.cache.REPORT_TTL);
    return result;
  }

  async getDepartmentOverview(departmentId?: number): Promise<DepartmentOverview[]> {
    const cacheKey = this.cache.reportKey(`dept:${departmentId ?? 'all'}`);
    const cached = await this.cache.get<DepartmentOverview[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .select('dept.id', 'departmentId')
      .addSelect('dept.name', 'departmentName')
      .addSelect('COUNT(task.id)', 'total')
      .addSelect("COUNT(task.id) FILTER (WHERE task.status = 'completed')", 'completed')
      .addSelect("COUNT(task.id) FILTER (WHERE task.status = 'in_progress')", 'inProgress')
      .addSelect(
        `COUNT(task.id) FILTER (WHERE task.due_at < :now AND task.status NOT IN ('completed','closed'))`,
        'overdue',
      )
      .addSelect('COUNT(task.id) FILTER (WHERE task.sla_breached = true)', 'slaBreached')
      .setParameter('now', now.toISOString())
      .leftJoin('task.department', 'dept')
      .where('task.deleted_at IS NULL')
      .groupBy('dept.id, dept.name')
      .orderBy('"total"', 'DESC');

    if (departmentId) {
      qb.andWhere('task.department_id = :deptId', { deptId: departmentId });
    }

    const raw = await qb.getRawMany();
    const result: DepartmentOverview[] = raw.map((r) => ({
      ...r,
      total:          Number(r.total),
      completed:      Number(r.completed),
      inProgress:     Number(r.inProgress),
      overdue:        Number(r.overdue),
      slaBreached:    Number(r.slaBreached),
      completionRate: r.total > 0 ? Math.round((Number(r.completed) / Number(r.total)) * 100) : 0,
    }));

    await this.cache.set(cacheKey, result, this.cache.REPORT_TTL);
    return result;
  }

  async getSlaCompliance(from?: string, to?: string): Promise<SlaComplianceReport> {
    const cacheKey = this.cache.reportKey(`sla:${from ?? ''}:${to ?? ''}`);
    const cached = await this.cache.get<SlaComplianceReport>(cacheKey);
    if (cached) return cached;

    const qb = this.taskRepo
      .createQueryBuilder('task')
      .where('task.deleted_at IS NULL');

    if (from) qb.andWhere('task.created_at >= :from', { from });
    if (to)   qb.andWhere('task.created_at <= :to', { to });

    const total   = await qb.getCount();
    const breached = await qb.clone().andWhere('task.sla_breached = true').getCount();

    const byPriorityRaw = await this.taskRepo
      .createQueryBuilder('task')
      .select('task.priority', 'priority')
      .addSelect('COUNT(task.id)', 'total')
      .addSelect('COUNT(task.id) FILTER (WHERE task.sla_breached = true)', 'breached')
      .where('task.deleted_at IS NULL')
      .groupBy('task.priority')
      .getRawMany();

    const result: SlaComplianceReport = {
      total,
      compliant:      total - breached,
      breached,
      complianceRate: total > 0 ? Math.round(((total - breached) / total) * 100) : 100,
      byPriority:     byPriorityRaw.map((r) => ({
        priority: r.priority,
        total:    Number(r.total),
        breached: Number(r.breached),
      })),
    };

    await this.cache.set(cacheKey, result, this.cache.REPORT_TTL);
    return result;
  }

  async getCompletionMetrics(
    groupBy: 'day' | 'week' | 'month' = 'day',
    limit = 30,
  ): Promise<CompletionMetrics[]> {
    const cacheKey = this.cache.reportKey(`metrics:${groupBy}:${limit}`);
    const cached = await this.cache.get<CompletionMetrics[]>(cacheKey);
    if (cached) return cached;

    const truncFn = groupBy === 'day' ? 'day' : groupBy === 'week' ? 'week' : 'month';

    const raw = await this.taskRepo.manager.query(
      `
      SELECT
        date_trunc('${truncFn}', task.created_at) AS period,
        COUNT(*) AS created,
        COUNT(*) FILTER (WHERE task.status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE task.status = 'closed') AS closed,
        COALESCE(
          AVG(
            EXTRACT(EPOCH FROM (task.completed_at - task.created_at)) / 3600.0
          ) FILTER (WHERE task.completed_at IS NOT NULL),
          0
        ) AS avg_completion_hours
      FROM tm_tasks task
      WHERE task.deleted_at IS NULL
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT $1
      `,
      [limit],
    );

    const result: CompletionMetrics[] = raw.map((r: any) => ({
      period:              r.period,
      created:             Number(r.created),
      completed:           Number(r.completed),
      closed:              Number(r.closed),
      avgCompletionHours:  Math.round(Number(r.avg_completion_hours) * 10) / 10,
    }));

    await this.cache.set(cacheKey, result, this.cache.METRICS_TTL);
    return result;
  }

  /** Call when any task write occurs that could affect report numbers. */
  async invalidate(): Promise<void> {
    await this.cache.invalidateReports();
  }
}
