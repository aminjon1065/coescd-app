import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { CronJob } from 'cron';
import { TmTask } from '../entities/tm-task.entity';
import { TmTaskEscalationRule } from '../entities/tm-task-escalation-rule.entity';
import { TmTaskHistory } from '../entities/tm-task-history.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { User } from '../../users/entities/user.entity';
import { TaskGateway } from '../gateways/task.gateway';
import { TaskStatus, TaskHistoryAction } from '../enums/task.enums';

const TM_ESCALATION_CRON_JOB = 'tm-task-escalation';

// Process this many tasks per scheduler tick to avoid unbounded memory usage
const BREACH_BATCH_SIZE = 200;
// Maximum tasks to load per escalation rule to keep memory bounded
const ESCALATION_BATCH_SIZE = 500;

const TERMINAL_STATUSES: TaskStatus[] = [TaskStatus.Completed, TaskStatus.Closed];

@Injectable()
export class TaskEscalationScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TaskEscalationScheduler.name);
  private isRunning = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    @InjectRepository(TmTask)
    private readonly taskRepo: Repository<TmTask>,
    @InjectRepository(TmTaskEscalationRule)
    private readonly ruleRepo: Repository<TmTaskEscalationRule>,
    @InjectRepository(TmTaskHistory)
    private readonly historyRepo: Repository<TmTaskHistory>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly taskGateway: TaskGateway,
  ) {}

  onModuleInit() {
    const enabled =
      this.configService.get<string>('TM_ESCALATION_SCHEDULER_ENABLED', 'true') !== 'false';
    if (!enabled) {
      this.logger.log('Task escalation scheduler is disabled by config');
      return;
    }

    const cronExpression = this.configService.get<string>('TM_ESCALATION_CRON', '*/15 * * * *');

    const job = new CronJob(cronExpression, () => {
      void this.runTick();
    });
    this.schedulerRegistry.addCronJob(TM_ESCALATION_CRON_JOB, job);
    job.start();

    this.logger.log(`Task escalation scheduler started (cron="${cronExpression}")`);
  }

  onModuleDestroy() {
    if (!this.schedulerRegistry.doesExist('cron', TM_ESCALATION_CRON_JOB)) return;
    this.schedulerRegistry.deleteCronJob(TM_ESCALATION_CRON_JOB);
  }

  private async runTick(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      await this.checkSlaBreaches();
      await this.checkEscalationRules();
    } catch (err) {
      this.logger.error('Task escalation tick failed', err);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Finds tasks that are overdue and not yet SLA-breached, processes them in
   * batches of BREACH_BATCH_SIZE to avoid loading the entire table into memory.
   */
  async checkSlaBreaches(): Promise<void> {
    const now = new Date();
    let offset = 0;
    let processedTotal = 0;

    while (true) {
      // Use the partial index idx_tm_tasks_sla_check — only scans unbreached, non-deleted rows
      const batch = await this.taskRepo
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.createdBy', 'createdBy')
        .where('task.sla_breached = false')
        .andWhere('task.deleted_at IS NULL')
        .andWhere('task.due_at < :now', { now })
        .andWhere(`task.status NOT IN (:...terminals)`, { terminals: TERMINAL_STATUSES })
        .orderBy('task.due_at', 'ASC')
        .skip(offset)
        .take(BREACH_BATCH_SIZE)
        .getMany();

      if (batch.length === 0) break;

      // Bulk-update slaBreached in one query
      const ids = batch.map((t) => t.id);
      await this.taskRepo
        .createQueryBuilder()
        .update(TmTask)
        .set({ slaBreached: true })
        .whereInIds(ids)
        .execute();

      // Bulk-insert history rows
      const historyRows = batch.map((task) =>
        this.historyRepo.create({
          task: { id: task.id } as TmTask,
          actor: { id: task.createdBy.id } as User,
          action: TaskHistoryAction.Escalated,
          previousValue: null,
          newValue: { slaBreached: true, dueAt: task.dueAt },
          occurredAt: now,
        }),
      );
      await this.historyRepo.save(historyRows);

      // Emit WebSocket events per task (lightweight — just IDs)
      for (const task of batch) {
        this.taskGateway.emitTaskEscalated(task.id, task.createdBy.id);
        this.logger.warn(`SLA breached for task ${task.taskNumber}`);
      }

      processedTotal += batch.length;

      // If we got a full batch there may be more; otherwise we're done
      if (batch.length < BREACH_BATCH_SIZE) break;
      offset += BREACH_BATCH_SIZE;
    }

    if (processedTotal > 0) {
      this.logger.log(`SLA breach check: marked ${processedTotal} task(s) as breached`);
    }
  }

  /**
   * Evaluates active escalation rules. Each rule query is bounded to
   * ESCALATION_BATCH_SIZE rows so a single misconfigured rule cannot
   * stall the scheduler.
   */
  async checkEscalationRules(): Promise<void> {
    const now = new Date();
    const rules = await this.ruleRepo.find({
      where: { isActive: true },
      relations: { department: true, escalateToUser: true },
    });

    for (const rule of rules) {
      const thresholdMs = rule.triggerHours * 60 * 60 * 1000;
      const thresholdDate = new Date(now.getTime() - thresholdMs);

      try {
        const qb = this.taskRepo
          .createQueryBuilder('task')
          .leftJoinAndSelect('task.assigneeUser', 'assigneeUser')
          .leftJoinAndSelect('task.department', 'department')
          .where('task.deleted_at IS NULL')
          .andWhere(`task.status NOT IN (:...terminals)`, { terminals: TERMINAL_STATUSES })
          .andWhere('task.due_at < :threshold', { threshold: thresholdDate })
          .orderBy('task.due_at', 'ASC')
          .take(ESCALATION_BATCH_SIZE);

        if (rule.priorityFilter) {
          qb.andWhere('task.priority = :priority', { priority: rule.priorityFilter });
        }
        if (rule.department) {
          qb.andWhere('task.department_id = :deptId', { deptId: rule.department.id });
        }

        const tasks = await qb.getMany();

        const notifications: Notification[] = [];

        for (const task of tasks) {
          let escalateToUserId: number | null = null;

          if (rule.escalateTo === 'specific_user' && rule.escalateToUser) {
            escalateToUserId = rule.escalateToUser.id;
          } else if (rule.escalateTo === 'department_head' && task.department) {
            escalateToUserId = (task.department as any).chiefId ?? null;
          }

          if (!escalateToUserId) continue;

          notifications.push(
            this.notificationRepo.create({
              user: { id: escalateToUserId } as User,
              kind: 'task_updated',
              message: `Escalation: Task "${task.title}" (${task.taskNumber}) is overdue`,
              payload: { taskId: task.id, taskNumber: task.taskNumber, ruleId: rule.id },
            }),
          );

          this.taskGateway.emitTaskEscalated(task.id, escalateToUserId);
        }

        // Bulk-insert all notifications for this rule in one query
        if (notifications.length > 0) {
          await this.notificationRepo.save(notifications);
          this.logger.log(
            `Rule "${rule.name}": escalated ${notifications.length} task(s)`,
          );
        }
      } catch (err) {
        // One failing rule must not abort others
        this.logger.error(`Escalation rule "${rule.name}" failed`, err);
      }
    }
  }
}
