import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TmTask } from '../entities/tm-task.entity';
import { TmTaskAssignment } from '../entities/tm-task-assignment.entity';
import { TmTaskDelegationChain } from '../entities/tm-task-delegation-chain.entity';
import { TmTaskHistory } from '../entities/tm-task-history.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';
import { AssignTaskDto } from '../dto/assign-task.dto';
import { TaskGateway } from '../gateways/task.gateway';
import { TaskStatus, TaskHistoryAction } from '../enums/task.enums';
import type { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';

@Injectable()
export class TmTaskDelegationService {
  constructor(
    @InjectRepository(TmTask)
    private readonly taskRepo: Repository<TmTask>,
    @InjectRepository(TmTaskAssignment)
    private readonly assignmentRepo: Repository<TmTaskAssignment>,
    @InjectRepository(TmTaskDelegationChain)
    private readonly chainRepo: Repository<TmTaskDelegationChain>,
    @InjectRepository(TmTaskHistory)
    private readonly historyRepo: Repository<TmTaskHistory>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    private readonly taskGateway: TaskGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async assign(
    taskId: string,
    dto: AssignTaskDto,
    actor: ActiveUserData,
  ): Promise<TmTaskAssignment> {
    if (!dto.assigneeUserId && !dto.assigneeDepartmentId && !dto.assigneeRole) {
      throw new BadRequestException(
        'Must specify assigneeUserId, assigneeDepartmentId, or assigneeRole',
      );
    }

    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: { board: true, assigneeUser: true, assigneeDepartment: true },
    });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);

    // Deactivate previous assignments
    await this.assignmentRepo.update(
      { task: { id: taskId }, isActive: true },
      { isActive: false },
    );

    // Determine next delegation level
    const lastChain = await this.chainRepo.findOne({
      where: { task: { id: taskId }, isRevoked: false },
      order: { level: 'DESC' },
    });
    const nextLevel = (lastChain?.level ?? 0) + 1;

    // Create new assignment
    const assignment = this.assignmentRepo.create({
      task: { id: taskId } as TmTask,
      assignedBy: { id: actor.sub } as User,
      isActive: true,
      notes: dto.notes ?? null,
      responseDeadline: dto.responseDeadline ? new Date(dto.responseDeadline) : null,
      delegatedFrom: lastChain ? ({ id: lastChain.id } as TmTaskAssignment) : null,
    });

    if (dto.assigneeUserId) {
      assignment.assignedToUser = { id: dto.assigneeUserId } as User;
    }
    if (dto.assigneeDepartmentId) {
      assignment.assignedToDepartment = { id: dto.assigneeDepartmentId } as Department;
    }
    if (dto.assigneeRole) {
      assignment.assignedToRole = dto.assigneeRole;
    }

    const savedAssignment = await this.assignmentRepo.save(assignment);

    // Record delegation chain
    const chain = this.chainRepo.create({
      task: { id: taskId } as TmTask,
      fromUser: { id: actor.sub } as User,
      toUser: dto.assigneeUserId ? ({ id: dto.assigneeUserId } as User) : null,
      toDepartment: dto.assigneeDepartmentId ? ({ id: dto.assigneeDepartmentId } as Department) : null,
      toRole: dto.assigneeRole ?? null,
      reason: dto.reason ?? null,
      level: nextLevel,
    });
    await this.chainRepo.save(chain);

    // Update task assignee fields + status
    const prevStatus = task.status;
    task.status = TaskStatus.Assigned;
    task.assigneeUser = dto.assigneeUserId ? ({ id: dto.assigneeUserId } as User) : task.assigneeUser;
    task.assigneeDepartment = dto.assigneeDepartmentId
      ? ({ id: dto.assigneeDepartmentId } as Department)
      : task.assigneeDepartment;
    task.assigneeRole = dto.assigneeRole ?? task.assigneeRole;
    await this.taskRepo.save(task);

    // Record history
    const histAction = prevStatus === TaskStatus.Assigned
      ? TaskHistoryAction.Reassigned
      : TaskHistoryAction.Assigned;

    await this.historyRepo.save(
      this.historyRepo.create({
        task: { id: taskId } as TmTask,
        actor: { id: actor.sub } as User,
        action: histAction,
        previousValue: { assigneeUserId: task.assigneeUser?.id },
        newValue: {
          assigneeUserId: dto.assigneeUserId,
          assigneeDepartmentId: dto.assigneeDepartmentId,
          assigneeRole: dto.assigneeRole,
        },
        occurredAt: new Date(),
      }),
    );

    // Fire-and-forget: notification + WebSocket (never blocks the HTTP response)
    if (dto.assigneeUserId) {
      this.eventEmitter.emit('task_management.task.assigned', {
        taskId,
        taskNumber: task.taskNumber,
        taskTitle: task.title,
        assigneeUserId: dto.assigneeUserId,
        actorId: actor.sub,
        boardId: task.board?.id,
      });
    }

    return savedAssignment;
  }

  async revoke(
    taskId: string,
    assignmentId: string,
    actor: ActiveUserData,
  ): Promise<void> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId, task: { id: taskId } },
      relations: { delegatedFrom: true, assignedToUser: true },
    });
    if (!assignment) throw new NotFoundException(`Assignment ${assignmentId} not found`);

    assignment.isActive = false;
    await this.assignmentRepo.save(assignment);

    // Revoke corresponding chain entry
    await this.chainRepo
      .createQueryBuilder()
      .update()
      .set({ isRevoked: true, revokedAt: new Date() })
      .where('task_id = :taskId AND is_revoked = false', { taskId })
      .execute();

    // Re-activate parent assignment if exists
    if (assignment.delegatedFrom) {
      await this.assignmentRepo.update(
        { id: assignment.delegatedFrom.id },
        { isActive: true },
      );
    }

    await this.historyRepo.save(
      this.historyRepo.create({
        task: { id: taskId } as TmTask,
        actor: { id: actor.sub } as User,
        action: TaskHistoryAction.Reassigned,
        previousValue: { assignmentId },
        newValue: { revoked: true },
        occurredAt: new Date(),
      }),
    );
  }

  async getDelegationChain(taskId: string): Promise<TmTaskDelegationChain[]> {
    return this.chainRepo.find({
      where: { task: { id: taskId } },
      relations: { fromUser: true, toUser: true, toDepartment: true },
      order: { level: 'ASC' },
    });
  }

  async getActiveAssignment(taskId: string): Promise<TmTaskAssignment | null> {
    return this.assignmentRepo.findOne({
      where: { task: { id: taskId }, isActive: true },
      relations: { assignedToUser: true, assignedToDepartment: true, assignedBy: true },
    });
  }

  async getAllAssignments(taskId: string): Promise<TmTaskAssignment[]> {
    return this.assignmentRepo.find({
      where: { task: { id: taskId } },
      relations: { assignedToUser: true, assignedToDepartment: true, assignedBy: true },
      order: { assignedAt: 'ASC' },
    });
  }

  async getWorkloadByUser(
    departmentId?: number,
  ): Promise<{ userId: number; name: string; taskCount: number; criticalCount: number }[]> {
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .select('assigneeUser.id', 'userId')
      .addSelect('assigneeUser.name', 'name')
      .addSelect('COUNT(*)', 'taskCount')
      .addSelect(
        "COUNT(*) FILTER (WHERE task.priority = 'critical')",
        'criticalCount',
      )
      .leftJoin('task.assigneeUser', 'assigneeUser')
      .where('task.deleted_at IS NULL')
      .andWhere("task.status NOT IN ('completed','closed')")
      .andWhere('task.assignee_user_id IS NOT NULL')
      .groupBy('assigneeUser.id, assigneeUser.name')
      .orderBy('"taskCount"', 'DESC');

    if (departmentId) {
      qb.andWhere('task.department_id = :deptId', { deptId: departmentId });
    }

    return qb.getRawMany();
  }

}
