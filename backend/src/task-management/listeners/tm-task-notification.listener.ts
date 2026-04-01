import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../notifications/entities/notification.entity';
import { User } from '../../users/entities/user.entity';
import { TaskGateway } from '../gateways/task.gateway';

export interface TaskAssignedEvent {
  taskId: string;
  taskNumber: string;
  taskTitle: string;
  assigneeUserId: number;
  actorId: number;
  boardId?: string;
}

export interface TaskEscalatedEvent {
  taskId: string;
  taskNumber: string;
  taskTitle: string;
  escalatedToUserId: number;
  reason?: string;
}

@Injectable()
export class TmTaskNotificationListener {
  private readonly logger = new Logger(TmTaskNotificationListener.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly taskGateway: TaskGateway,
  ) {}

  @OnEvent('task_management.task.assigned', { async: true })
  async handleTaskAssigned(event: TaskAssignedEvent): Promise<void> {
    try {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          user: { id: event.assigneeUserId } as User,
          kind: 'task_assigned' as any,
          message: `You have been assigned task: ${event.taskTitle}`,
          payload: { taskId: event.taskId, taskNumber: event.taskNumber },
        }),
      );
      this.taskGateway.emitTaskAssigned(
        event.taskId,
        event.assigneeUserId,
        event.actorId,
        event.boardId,
      );
    } catch (err) {
      this.logger.error(
        `Failed to send task-assigned notification (task=${event.taskId}): ${(err as Error).message}`,
      );
    }
  }

  @OnEvent('task_management.task.escalated', { async: true })
  async handleTaskEscalated(event: TaskEscalatedEvent): Promise<void> {
    try {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          user: { id: event.escalatedToUserId } as User,
          kind: 'task_escalated' as any,
          message: `Task ${event.taskNumber} has been escalated to you${event.reason ? `: ${event.reason}` : ''}`,
          payload: { taskId: event.taskId, taskNumber: event.taskNumber },
        }),
      );
      this.taskGateway.emitTaskEscalated(event.taskId, event.escalatedToUserId);
    } catch (err) {
      this.logger.error(
        `Failed to send task-escalated notification (task=${event.taskId}): ${(err as Error).message}`,
      );
    }
  }
}
