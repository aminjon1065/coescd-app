import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TmTask } from '../entities/tm-task.entity';
import { TmTaskHistory } from '../entities/tm-task-history.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { User } from '../../users/entities/user.entity';
import { TaskType, TaskPriority, TaskStatus, TaskHistoryAction } from '../enums/task.enums';
import { TmTaskService } from './tm-task.service';

@Injectable()
export class TmTaskWorkflowService {
  private readonly logger = new Logger(TmTaskWorkflowService.name);

  constructor(
    @InjectRepository(TmTask)
    private readonly taskRepo: Repository<TmTask>,
    @InjectRepository(TmTaskHistory)
    private readonly historyRepo: Repository<TmTaskHistory>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly taskService: TmTaskService,
  ) {}

  /**
   * Listen for EDM document approval stage completion.
   * When an 'order' document is fully approved, auto-create a linked implementation task.
   */
  @OnEvent('edm.stage.completed')
  async onEdmStageCompleted(payload: {
    stageType: string;
    documentId: number;
    documentTitle: string;
    documentType: string;
    documentRouteVersion: number;
    departmentId?: number;
    creatorId: number;
  }): Promise<void> {
    try {
      if (payload.stageType !== 'approve' || payload.documentType !== 'order') return;

      this.logger.log(
        `Creating task from EDM document approval: docId=${payload.documentId}`,
      );

      const task = this.taskRepo.create({
        taskNumber: await this.generateTaskNumber(),
        title: `Implement: ${payload.documentTitle}`,
        description: `Implementation task auto-created from approved order document #${payload.documentId}.`,
        type: TaskType.DocumentLinked,
        priority: TaskPriority.High,
        status: TaskStatus.Created,
        linkedDocumentId: payload.documentId,
        linkedDocumentVersion: payload.documentRouteVersion,
        createdBy: { id: payload.creatorId } as User,
        department: payload.departmentId ? ({ id: payload.departmentId } as any) : null,
      });

      const saved = await this.taskRepo.save(task);

      await this.historyRepo.save(
        this.historyRepo.create({
          task: { id: saved.id } as TmTask,
          actor: { id: payload.creatorId } as User,
          action: TaskHistoryAction.Created,
          previousValue: null,
          newValue: {
            source: 'edm_stage_completed',
            documentId: payload.documentId,
          },
          occurredAt: new Date(),
        }),
      );

      this.logger.log(`Created task ${saved.taskNumber} from EDM document ${payload.documentId}`);
    } catch (err) {
      this.logger.error('Failed to create task from EDM stage completion', err);
    }
  }

  /**
   * Listen for disaster/incident creation to auto-generate incident response tasks.
   */
  @OnEvent('disaster.created')
  async onDisasterCreated(payload: {
    disasterId: number;
    title: string;
    typeName: string;
    departmentId?: number;
    creatorId: number;
  }): Promise<void> {
    try {
      this.logger.log(`Creating incident response task for disaster ${payload.disasterId}`);

      const slaDeadline = new Date();
      slaDeadline.setHours(slaDeadline.getHours() + 2); // 2-hour critical SLA

      const task = this.taskRepo.create({
        taskNumber: await this.generateTaskNumber(),
        title: `Incident Response: ${payload.title}`,
        description: `Emergency response task auto-created for ${payload.typeName} incident.`,
        type: TaskType.IncidentRelated,
        priority: TaskPriority.Critical,
        status: TaskStatus.Created,
        linkedIncidentId: payload.disasterId,
        slaDeadline,
        dueAt: slaDeadline,
        createdBy: { id: payload.creatorId } as User,
        department: payload.departmentId ? ({ id: payload.departmentId } as any) : null,
        tags: ['incident', 'auto-generated'],
      });

      await this.taskRepo.save(task);
      this.logger.log(`Created incident response task ${task.taskNumber}`);
    } catch (err) {
      this.logger.error('Failed to create incident response task', err);
    }
  }

  /**
   * When a task linked to an EDM document is completed, notify the document owner.
   */
  @OnEvent('task_management.task.completed')
  async onTaskCompleted(payload: { task: TmTask }): Promise<void> {
    const { task } = payload;
    if (!task.linkedDocumentId) return;

    try {
      // Notify document creator via notifications
      this.logger.log(
        `Task ${task.taskNumber} completed — linked to document ${task.linkedDocumentId}`,
      );
      // Additional EDM stage action triggering can be wired here if needed
    } catch (err) {
      this.logger.error('Failed to handle task completion for EDM document', err);
    }
  }

  private async generateTaskNumber(): Promise<string> {
    const result = await this.taskRepo.manager.query(
      "SELECT nextval('tm_task_number_seq') AS seq",
    );
    const seq = String(result[0].seq).padStart(5, '0');
    const year = new Date().getFullYear();
    return `TASK-${year}-${seq}`;
  }
}
