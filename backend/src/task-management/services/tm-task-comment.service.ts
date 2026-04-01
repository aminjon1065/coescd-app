import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TmTaskComment } from '../entities/tm-task-comment.entity';
import { TmTask } from '../entities/tm-task.entity';
import { TmTaskHistory } from '../entities/tm-task-history.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { User } from '../../users/entities/user.entity';
import { CreateCommentDto, UpdateCommentDto } from '../dto/create-comment.dto';
import { TaskGateway } from '../gateways/task.gateway';
import { TaskHistoryAction } from '../enums/task.enums';
import type { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';

@Injectable()
export class TmTaskCommentService {
  constructor(
    @InjectRepository(TmTaskComment)
    private readonly commentRepo: Repository<TmTaskComment>,
    @InjectRepository(TmTask)
    private readonly taskRepo: Repository<TmTask>,
    @InjectRepository(TmTaskHistory)
    private readonly historyRepo: Repository<TmTaskHistory>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly taskGateway: TaskGateway,
  ) {}

  async create(
    taskId: string,
    dto: CreateCommentDto,
    actor: ActiveUserData,
  ): Promise<TmTaskComment> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: { assigneeUser: true },
    });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);

    const comment = this.commentRepo.create({
      task: { id: taskId } as TmTask,
      author: { id: actor.sub } as User,
      content: dto.content,
      parent: dto.parentId ? ({ id: dto.parentId } as TmTaskComment) : null,
      mentionUserIds: dto.mentionUserIds ?? [],
    });

    const saved = await this.commentRepo.save(comment);

    // Reload with relations
    const full = await this.commentRepo.findOne({
      where: { id: saved.id },
      relations: { author: true, parent: true },
    });

    // Notify mentioned users
    if (dto.mentionUserIds?.length) {
      await Promise.all(
        dto.mentionUserIds.map((uid) =>
          this.notificationRepo.save(
            this.notificationRepo.create({
              user: { id: uid } as User,
              kind: 'task_updated',
              message: `You were mentioned in a comment on task: ${task.title}`,
              payload: { taskId, commentId: saved.id },
            }),
          ),
        ),
      );
    }

    // Record history
    await this.historyRepo.save(
      this.historyRepo.create({
        task: { id: taskId } as TmTask,
        actor: { id: actor.sub } as User,
        action: TaskHistoryAction.Commented,
        previousValue: null,
        newValue: { commentId: saved.id },
        occurredAt: new Date(),
      }),
    );

    this.taskGateway.emitCommentAdded(taskId, full!);
    return full!;
  }

  async findAll(taskId: string): Promise<TmTaskComment[]> {
    return this.commentRepo.find({
      where: { task: { id: taskId }, parent: null },
      relations: { author: true, replies: { author: true } },
      order: { createdAt: 'ASC' },
      withDeleted: false,
    });
  }

  async update(
    taskId: string,
    commentId: string,
    dto: UpdateCommentDto,
    actor: ActiveUserData,
  ): Promise<TmTaskComment> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId, task: { id: taskId } },
      relations: { author: true },
    });
    if (!comment) throw new NotFoundException(`Comment ${commentId} not found`);
    if (comment.author.id !== actor.sub) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.content = dto.content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    return this.commentRepo.save(comment);
  }

  async remove(
    taskId: string,
    commentId: string,
    actor: ActiveUserData,
  ): Promise<void> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId, task: { id: taskId } },
      relations: { author: true },
    });
    if (!comment) throw new NotFoundException(`Comment ${commentId} not found`);
    if (comment.author.id !== actor.sub) {
      const isAdmin = (actor as any).role === 'admin' || (actor as any).role === 'superadmin';
      if (!isAdmin) throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentRepo.softDelete(commentId);
    this.taskGateway.emitCommentDeleted(taskId, commentId);
  }
}
