import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TmTask } from '../entities/tm-task.entity';
import { TmTaskHistory } from '../entities/tm-task-history.entity';
import { TmTaskChecklistItem } from '../entities/tm-task-checklist-item.entity';
import { TmTaskBoard } from '../entities/tm-task-board.entity';
import { TmTaskBoardColumn } from '../entities/tm-task-board-column.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { ChangeTaskStatusDto } from '../dto/change-task-status.dto';
import { GetTasksQueryDto } from '../dto/get-tasks-query.dto';
import { MoveTaskDto } from '../dto/create-board.dto';
import type { BulkTaskStatusDto, BulkTaskAssignDto, BulkTaskDeleteDto } from '../dto/bulk-task.dto';
import type { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';
import {
  TaskStatus,
  TaskHistoryAction,
  VALID_TRANSITIONS,
} from '../enums/task.enums';
import { TaskGateway } from '../gateways/task.gateway';
import { TmTaskCacheService } from './tm-task-cache.service';
import { TmTaskReportingService } from './tm-task-reporting.service';
import { Permission } from '../../iam/authorization/permission.type';

@Injectable()
export class TmTaskService {
  constructor(
    @InjectRepository(TmTask)
    private readonly taskRepo: Repository<TmTask>,
    @InjectRepository(TmTaskHistory)
    private readonly historyRepo: Repository<TmTaskHistory>,
    @InjectRepository(TmTaskChecklistItem)
    private readonly checklistRepo: Repository<TmTaskChecklistItem>,
    @InjectRepository(TmTaskBoard)
    private readonly boardRepo: Repository<TmTaskBoard>,
    @InjectRepository(TmTaskBoardColumn)
    private readonly columnRepo: Repository<TmTaskBoardColumn>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly taskGateway: TaskGateway,
    private readonly cache: TmTaskCacheService,
    private readonly reportingService: TmTaskReportingService,
  ) {}

  async create(dto: CreateTaskDto, actor: ActiveUserData): Promise<TmTask> {
    const taskNumber = await this.generateTaskNumber();

    const task = this.taskRepo.create({
      taskNumber,
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type,
      priority: dto.priority,
      visibility: dto.visibility ?? undefined,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      estimatedHours: dto.estimatedHours ?? null,
      linkedDocumentId: dto.linkedDocumentId ?? null,
      linkedDocumentVersion: dto.linkedDocumentVersion ?? null,
      linkedIncidentId: dto.linkedIncidentId ?? null,
      tags: dto.tags ?? [],
      createdBy: { id: actor.sub } as User,
    });

    if (dto.assigneeUserId) {
      task.assigneeUser = { id: dto.assigneeUserId } as User;
      task.status = TaskStatus.Assigned;
    }
    if (dto.assigneeDepartmentId) {
      task.assigneeDepartment = { id: dto.assigneeDepartmentId } as Department;
      task.status = TaskStatus.Assigned;
    }
    if (dto.assigneeRole) {
      task.assigneeRole = dto.assigneeRole;
      task.status = TaskStatus.Assigned;
    }
    if (dto.parentTaskId) {
      task.parentTask = { id: dto.parentTaskId } as TmTask;
    }
    if (dto.boardId) {
      task.board = { id: dto.boardId } as TmTaskBoard;
    }

    const saved = await this.taskRepo.save(task);

    // Create checklist items if provided
    if (dto.checklistItems?.length) {
      const items = dto.checklistItems.map((item, idx) =>
        this.checklistRepo.create({
          task: { id: saved.id } as TmTask,
          title: item.title,
          orderIndex: idx,
          assignedTo: item.assignedToId ? ({ id: item.assignedToId } as User) : null,
          dueAt: item.dueAt ? new Date(item.dueAt) : null,
        }),
      );
      await this.checklistRepo.save(items);
    }

    await this.recordHistory(saved.id, actor.sub, TaskHistoryAction.Created, null, {
      title: saved.title,
      type: saved.type,
      priority: saved.priority,
      taskNumber: saved.taskNumber,
    });

    this.taskGateway.emitTaskCreated(saved, dto.boardId);
    this.eventEmitter.emit('task_management.task.created', { task: saved });
    void this.reportingService.invalidate();
    if (dto.boardId) void this.cache.invalidateBoard(dto.boardId);

    return this.findOne(saved.id, actor);
  }

  async findAll(
    query: GetTasksQueryDto,
    actor: ActiveUserData,
  ): Promise<{ items: TmTask[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const offset = (page - 1) * limit;

    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.assigneeUser', 'assigneeUser')
      .leftJoinAndSelect('task.assigneeDepartment', 'assigneeDept')
      .leftJoinAndSelect('task.department', 'department')
      .leftJoinAndSelect('task.board', 'board')
      .leftJoinAndSelect('task.boardColumn', 'boardColumn')
      .where('task.deleted_at IS NULL')
      .orderBy('task.created_at', query.sortOrder === 'asc' ? 'ASC' : 'DESC');

    if (query.status?.length) {
      qb.andWhere('task.status IN (:...status)', { status: query.status });
    }
    if (query.priority?.length) {
      qb.andWhere('task.priority IN (:...priority)', { priority: query.priority });
    }
    if (query.type?.length) {
      qb.andWhere('task.type IN (:...type)', { type: query.type });
    }
    if (query.assigneeUserId) {
      qb.andWhere('task.assignee_user_id = :auid', { auid: query.assigneeUserId });
    }
    if (query.departmentId) {
      qb.andWhere(
        new Brackets((b) =>
          b
            .where('task.department_id = :did', { did: query.departmentId })
            .orWhere('task.assignee_department_id = :did', { did: query.departmentId }),
        ),
      );
    }
    if (query.boardId) {
      qb.andWhere('task.board_id = :boardId', { boardId: query.boardId });
    }
    if (query.dueDateFrom) {
      qb.andWhere('task.due_at >= :from', { from: query.dueDateFrom });
    }
    if (query.dueDateTo) {
      qb.andWhere('task.due_at <= :to', { to: query.dueDateTo });
    }
    if (query.isOverdue) {
      qb.andWhere("task.due_at < NOW() AND task.status NOT IN ('completed','closed')");
    }
    if (query.isSlaBreached) {
      qb.andWhere('task.sla_breached = true');
    }
    if (query.linkedDocumentId) {
      qb.andWhere('task.linked_document_id = :docId', { docId: query.linkedDocumentId });
    }
    if (query.linkedIncidentId) {
      qb.andWhere('task.linked_incident_id = :incId', { incId: query.linkedIncidentId });
    }
    if (query.q) {
      const q = `%${query.q.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((b) =>
          b
            .where('LOWER(task.title) LIKE :q', { q })
            .orWhere('LOWER(task.description) LIKE :q', { q })
            .orWhere('LOWER(task.task_number) LIKE :q', { q }),
        ),
      );
    }

    // Scope filtering: non-global users only see tasks they're involved with or in their dept
    const hasGlobalRead = actor.permissions?.includes(Permission.TM_TASKS_READ);
    if (!hasGlobalRead || (actor as any).scope !== 'global') {
      qb.andWhere(
        new Brackets((b) =>
          b
            .where('task.created_by = :uid', { uid: actor.sub })
            .orWhere('task.assignee_user_id = :uid', { uid: actor.sub })
            .orWhere('task.department_id = :deptId', { deptId: (actor as any).departmentId })
            .orWhere('task.assignee_department_id = :deptId', { deptId: (actor as any).departmentId })
            .orWhere("task.visibility = 'cross_department'")
            .orWhere("task.visibility = 'public'"),
        ),
      );
    }

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: string, actor?: ActiveUserData): Promise<TmTask> {
    const cached = await this.cache.get<TmTask>(this.cache.taskKey(id));
    if (cached) return cached;

    const task = await this.taskRepo.findOne({
      where: { id },
      relations: {
        createdBy: { department: true },
        assigneeUser: { department: true },
        assigneeDepartment: true,
        department: true,
        board: true,
        boardColumn: true,
        subtasks: true,
        checklistItems: { assignedTo: true, completedBy: true },
      },
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);

    await this.cache.set(this.cache.taskKey(id), task, this.cache.TASK_TTL);
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, actor: ActiveUserData): Promise<TmTask> {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);

    const previous: Record<string, unknown> = {};
    const updated: Record<string, unknown> = {};

    if (dto.title !== undefined && dto.title !== task.title) {
      previous.title = task.title;
      task.title = dto.title;
      updated.title = dto.title;
    }
    if (dto.description !== undefined) {
      previous.description = task.description;
      task.description = dto.description;
      updated.description = dto.description;
    }
    if (dto.priority !== undefined && dto.priority !== task.priority) {
      previous.priority = task.priority;
      task.priority = dto.priority;
      updated.priority = dto.priority;
    }
    if (dto.visibility !== undefined) {
      task.visibility = dto.visibility;
    }
    if (dto.dueAt !== undefined) {
      previous.dueAt = task.dueAt;
      task.dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
      updated.dueAt = task.dueAt;
    }
    if (dto.estimatedHours !== undefined) task.estimatedHours = dto.estimatedHours;
    if (dto.actualHours !== undefined) task.actualHours = dto.actualHours;
    if (dto.tags !== undefined) task.tags = dto.tags;

    const saved = await this.taskRepo.save(task);

    if (Object.keys(updated).length > 0) {
      await this.recordHistory(id, actor.sub, TaskHistoryAction.StatusChanged, previous, updated);
    }

    this.taskGateway.emitTaskUpdated(id, updated as Partial<TmTask>);
    await this.cache.invalidateTask(id);
    return this.findOne(id, actor);
  }

  async changeStatus(
    id: string,
    dto: ChangeTaskStatusDto,
    actor: ActiveUserData,
    requestMeta?: { ip?: string | null; userAgent?: string | null },
  ): Promise<TmTask> {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);

    const allowed = VALID_TRANSITIONS[task.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from '${task.status}' to '${dto.status}'`,
      );
    }

    if (
      (dto.status === TaskStatus.Blocked || dto.status === TaskStatus.Rejected) &&
      !dto.reason
    ) {
      throw new BadRequestException(`Reason is required when blocking or rejecting a task`);
    }

    if (dto.status === TaskStatus.Closed) {
      const isCreator = task.createdBy?.id === actor.sub;
      const isAdmin = (actor as any).role === 'admin' || (actor as any).role === 'superadmin';
      if (!isCreator && !isAdmin) {
        throw new ForbiddenException('Only the task creator or an admin can close a task');
      }
    }

    const prevStatus = task.status;
    task.status = dto.status;

    if (dto.status === TaskStatus.InProgress && !task.startedAt) {
      task.startedAt = new Date();
    }
    if (dto.status === TaskStatus.Completed) {
      task.completedAt = new Date();
      if (task.slaDeadline && new Date() > task.slaDeadline) {
        task.slaBreached = true;
      }
    }
    if (dto.status === TaskStatus.Closed) {
      task.closedAt = new Date();
    }
    if (dto.status === TaskStatus.Reopened) {
      task.completedAt = null;
      task.closedAt = null;
    }
    if (dto.status === TaskStatus.Blocked) {
      task.blockedReason = dto.reason ?? null;
    }
    if (dto.status === TaskStatus.Rejected) {
      task.rejectionReason = dto.reason ?? null;
    }

    await this.taskRepo.save(task);

    await this.recordHistory(
      id,
      actor.sub,
      TaskHistoryAction.StatusChanged,
      { status: prevStatus },
      { status: dto.status, reason: dto.reason },
      requestMeta?.ip ?? null,
      requestMeta?.userAgent ?? null,
    );

    const boardId = task.board?.id;
    this.taskGateway.emitTaskStatusChanged(id, prevStatus, dto.status, actor.sub, boardId);

    if (dto.status === TaskStatus.Completed) {
      this.eventEmitter.emit('task_management.task.completed', { task });
    }

    await this.cache.invalidateTask(id);
    if (boardId) void this.cache.invalidateBoard(boardId);
    void this.reportingService.invalidate();

    return this.findOne(id, actor);
  }

  async remove(id: string, actor: ActiveUserData): Promise<void> {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);

    await this.taskRepo.softDelete(id);
    await this.recordHistory(id, actor.sub, TaskHistoryAction.Closed, null, { deleted: true });
    await this.cache.invalidateTask(id);
    void this.reportingService.invalidate();
  }

  async moveToColumn(id: string, dto: MoveTaskDto, actor: ActiveUserData): Promise<TmTask> {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: { board: true, boardColumn: true },
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);

    const column = await this.columnRepo.findOne({
      where: { id: dto.columnId },
      relations: { board: true },
    });
    if (!column) throw new NotFoundException(`Column ${dto.columnId} not found`);

    const fromColumnId = task.boardColumn?.id ?? null;
    task.boardColumn = column;
    task.board = column.board;
    if (dto.orderIndex !== undefined) {
      task.orderIndex = dto.orderIndex;
    }

    await this.taskRepo.save(task);
    this.taskGateway.emitTaskMoved(id, fromColumnId, dto.columnId, column.board.id);

    return this.findOne(id, actor);
  }

  async getHistory(taskId: string): Promise<TmTaskHistory[]> {
    return this.historyRepo.find({
      where: { task: { id: taskId } },
      relations: { actor: true },
      order: { occurredAt: 'DESC' },
    });
  }

  // ─── Checklist ────────────────────────────────────────────────────────────

  async addChecklistItem(
    taskId: string,
    dto: { title: string; assignedToId?: number; dueAt?: string },
    actor: ActiveUserData,
  ): Promise<TmTaskChecklistItem> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);

    const count = await this.checklistRepo.count({ where: { task: { id: taskId } } });
    const item = this.checklistRepo.create({
      task: { id: taskId } as TmTask,
      title: dto.title,
      orderIndex: count,
      assignedTo: dto.assignedToId ? ({ id: dto.assignedToId } as User) : null,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
    });
    return this.checklistRepo.save(item);
  }

  async updateChecklistItem(
    taskId: string,
    itemId: string,
    dto: {
      title?: string;
      isCompleted?: boolean;
      assignedToId?: number;
      dueAt?: string;
      orderIndex?: number;
    },
    actor: ActiveUserData,
  ): Promise<TmTaskChecklistItem> {
    const item = await this.checklistRepo.findOne({
      where: { id: itemId, task: { id: taskId } },
      relations: { completedBy: true, assignedTo: true },
    });
    if (!item) throw new NotFoundException(`Checklist item ${itemId} not found`);

    if (dto.title !== undefined) item.title = dto.title;
    if (dto.isCompleted !== undefined) {
      item.isCompleted = dto.isCompleted;
      item.completedBy = dto.isCompleted ? ({ id: actor.sub } as User) : null;
      item.completedAt = dto.isCompleted ? new Date() : null;
    }
    if (dto.assignedToId !== undefined) {
      item.assignedTo = { id: dto.assignedToId } as User;
    }
    if (dto.dueAt !== undefined) {
      item.dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    }
    if (dto.orderIndex !== undefined) item.orderIndex = dto.orderIndex;

    return this.checklistRepo.save(item);
  }

  async removeChecklistItem(taskId: string, itemId: string): Promise<void> {
    const item = await this.checklistRepo.findOne({
      where: { id: itemId, task: { id: taskId } },
    });
    if (!item) throw new NotFoundException(`Checklist item ${itemId} not found`);
    await this.checklistRepo.remove(item);
  }

  // ─── Bulk operations ──────────────────────────────────────────────────────

  async bulkChangeStatus(
    dto: BulkTaskStatusDto,
    actor: ActiveUserData,
  ): Promise<{ updated: number; skipped: number }> {
    const tasks = await this.taskRepo.findBy(dto.ids.map((id) => ({ id })));
    const valid: TmTask[] = [];

    for (const task of tasks) {
      const allowed = VALID_TRANSITIONS[task.status];
      if (!allowed?.includes(dto.status)) continue;
      valid.push(task);
    }

    if (valid.length === 0) return { updated: 0, skipped: dto.ids.length };

    const validIds = valid.map((t) => t.id);
    await this.taskRepo
      .createQueryBuilder()
      .update(TmTask)
      .set({ status: dto.status })
      .whereInIds(validIds)
      .execute();

    const historyRows = valid.map((task) =>
      this.historyRepo.create({
        task: { id: task.id } as TmTask,
        actor: { id: actor.sub } as User,
        action: TaskHistoryAction.StatusChanged,
        previousValue: { status: task.status },
        newValue: { status: dto.status, reason: dto.reason },
        occurredAt: new Date(),
      }),
    );
    await this.historyRepo.save(historyRows);

    for (const id of validIds) void this.cache.invalidateTask(id);
    void this.reportingService.invalidate();

    return { updated: valid.length, skipped: dto.ids.length - valid.length };
  }

  async bulkAssign(
    dto: BulkTaskAssignDto,
    actor: ActiveUserData,
  ): Promise<{ updated: number }> {
    if (!dto.assigneeUserId && !dto.assigneeDepartmentId && !dto.assigneeRole) {
      throw new BadRequestException(
        'Must specify assigneeUserId, assigneeDepartmentId, or assigneeRole',
      );
    }

    const tasks = await this.taskRepo.findBy(dto.ids.map((id) => ({ id })));
    for (const task of tasks) {
      task.assigneeUser = dto.assigneeUserId ? ({ id: dto.assigneeUserId } as User) : null;
      task.assigneeDepartment = dto.assigneeDepartmentId
        ? ({ id: dto.assigneeDepartmentId } as Department)
        : null;
      task.assigneeRole = dto.assigneeRole ?? null;
      task.status = TaskStatus.Assigned;
    }
    await this.taskRepo.save(tasks);

    const historyRows = dto.ids.map((id) =>
      this.historyRepo.create({
        task: { id } as TmTask,
        actor: { id: actor.sub } as User,
        action: TaskHistoryAction.Assigned,
        previousValue: null,
        newValue: {
          assigneeUserId: dto.assigneeUserId,
          assigneeDepartmentId: dto.assigneeDepartmentId,
          assigneeRole: dto.assigneeRole,
        },
        occurredAt: new Date(),
      }),
    );
    await this.historyRepo.save(historyRows);

    for (const id of dto.ids) void this.cache.invalidateTask(id);

    return { updated: dto.ids.length };
  }

  async bulkDelete(
    dto: BulkTaskDeleteDto,
    actor: ActiveUserData,
  ): Promise<{ deleted: number }> {
    await this.taskRepo.softDelete(dto.ids);

    const historyRows = dto.ids.map((id) =>
      this.historyRepo.create({
        task: { id } as TmTask,
        actor: { id: actor.sub } as User,
        action: TaskHistoryAction.Closed,
        previousValue: null,
        newValue: { deleted: true },
        occurredAt: new Date(),
      }),
    );
    await this.historyRepo.save(historyRows);

    for (const id of dto.ids) void this.cache.invalidateTask(id);
    void this.reportingService.invalidate();

    return { deleted: dto.ids.length };
  }

  async getSubtasks(parentId: string): Promise<TmTask[]> {
    return this.taskRepo.find({
      where: { parentTask: { id: parentId } },
      relations: { assigneeUser: true, assigneeDepartment: true },
      order: { createdAt: 'ASC' },
    });
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  private async generateTaskNumber(): Promise<string> {
    const result = await this.dataSource.query(
      "SELECT nextval('tm_task_number_seq') AS seq",
    );
    const seq = String(result[0].seq).padStart(5, '0');
    const year = new Date().getFullYear();
    return `TASK-${year}-${seq}`;
  }

  async recordHistory(
    taskId: string,
    actorId: number,
    action: TaskHistoryAction,
    previousValue: Record<string, unknown> | null,
    newValue: Record<string, unknown>,
    ipAddress?: string | null,
    userAgent?: string | null,
    notes?: string,
  ): Promise<void> {
    const history = this.historyRepo.create({
      task: { id: taskId } as TmTask,
      actor: { id: actorId } as User,
      action,
      previousValue: previousValue ?? null,
      newValue,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      notes: notes ?? null,
      occurredAt: new Date(),
    });
    await this.historyRepo.save(history);
  }
}
