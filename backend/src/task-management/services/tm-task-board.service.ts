import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TmTaskBoard } from '../entities/tm-task-board.entity';
import { TmTaskBoardColumn } from '../entities/tm-task-board-column.entity';
import { TmTask } from '../entities/tm-task.entity';
import { Department } from '../../department/entities/department.entity';
import { User } from '../../users/entities/user.entity';
import { CreateBoardDto, UpdateBoardColumnDto, ReorderColumnsDto } from '../dto/create-board.dto';
import { TaskGateway } from '../gateways/task.gateway';
import { TmTaskCacheService } from './tm-task-cache.service';
import type { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';
import { TaskStatus } from '../enums/task.enums';

const DEFAULT_COLUMNS = [
  { name: 'To Do',       status: TaskStatus.Created,    color: '#94a3b8', orderIndex: 0 },
  { name: 'Assigned',    status: TaskStatus.Assigned,   color: '#3b82f6', orderIndex: 1 },
  { name: 'In Progress', status: TaskStatus.InProgress, color: '#f59e0b', orderIndex: 2 },
  { name: 'In Review',   status: TaskStatus.InReview,   color: '#8b5cf6', orderIndex: 3 },
  { name: 'Done',        status: TaskStatus.Completed,  color: '#10b981', orderIndex: 4 },
  { name: 'Closed',      status: TaskStatus.Closed,     color: '#6b7280', orderIndex: 5 },
];

@Injectable()
export class TmTaskBoardService {
  constructor(
    @InjectRepository(TmTaskBoard)
    private readonly boardRepo: Repository<TmTaskBoard>,
    @InjectRepository(TmTaskBoardColumn)
    private readonly columnRepo: Repository<TmTaskBoardColumn>,
    @InjectRepository(TmTask)
    private readonly taskRepo: Repository<TmTask>,
    private readonly taskGateway: TaskGateway,
    private readonly cache: TmTaskCacheService,
  ) {}

  async create(dto: CreateBoardDto, actor: ActiveUserData): Promise<TmTaskBoard> {
    const board = this.boardRepo.create({
      name:        dto.name,
      description: dto.description ?? null,
      department:  dto.departmentId ? ({ id: dto.departmentId } as Department) : null,
      createdBy:   { id: actor.sub } as User,
      visibility:  dto.visibility ?? 'department',
      isDefault:   dto.isDefault ?? false,
    });
    const saved = await this.boardRepo.save(board);

    const columnDefs = dto.columns?.length ? dto.columns : DEFAULT_COLUMNS;
    const columns = columnDefs.map((col, idx) =>
      this.columnRepo.create({
        board:      { id: saved.id } as TmTaskBoard,
        name:       col.name,
        status:     col.status ?? col.name.toLowerCase().replace(' ', '_'),
        orderIndex: idx,
        color:      col.color ?? '#94a3b8',
        wipLimit:   (col as any).wipLimit ?? null,
      }),
    );
    await this.columnRepo.save(columns);

    return this.findOne(saved.id);
  }

  async findAll(): Promise<TmTaskBoard[]> {
    return this.boardRepo
      .createQueryBuilder('board')
      .leftJoinAndSelect('board.columns', 'columns')
      .leftJoinAndSelect('board.department', 'department')
      .leftJoinAndSelect('board.createdBy', 'createdBy')
      .orderBy('board.created_at', 'DESC')
      .addOrderBy('columns.order_index', 'ASC')
      .getMany();
  }

  async findOne(id: string): Promise<TmTaskBoard> {
    const board = await this.boardRepo.findOne({
      where: { id },
      relations: { columns: true, department: true, createdBy: true },
    });
    if (!board) throw new NotFoundException(`Board ${id} not found`);
    board.columns.sort((a, b) => a.orderIndex - b.orderIndex);
    return board;
  }

  /**
   * Returns the board + all its tasks grouped by column.
   *
   * Uses a SINGLE query joining tasks → columns → board (no N+1),
   * then groups in memory. Result is cached in Redis.
   */
  async getBoardWithTasks(
    id: string,
  ): Promise<TmTaskBoard & { tasksByColumn: Record<string, TmTask[]> }> {
    const cacheKey = this.cache.boardKey(id);
    const hit = await this.cache.get<TmTaskBoard & { tasksByColumn: Record<string, TmTask[]> }>(cacheKey);
    if (hit) return hit;

    const board = await this.findOne(id);

    // Single query — tasks JOIN board_column, filtered to this board
    const tasks = await this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assigneeUser', 'assigneeUser')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.checklistItems', 'checklistItems')
      .leftJoinAndSelect('task.boardColumn', 'boardColumn')
      .where('task.board_id = :boardId', { boardId: id })
      .andWhere('task.deleted_at IS NULL')
      .orderBy('task.order_index', 'ASC')
      .getMany();

    const tasksByColumn: Record<string, TmTask[]> = {};
    board.columns.forEach((col) => { tasksByColumn[col.id] = []; });
    tasks.forEach((task) => {
      const colId = task.boardColumn?.id;
      if (colId && tasksByColumn[colId]) tasksByColumn[colId].push(task);
    });

    const result = { ...board, tasksByColumn };
    await this.cache.set(cacheKey, result, this.cache.BOARD_TTL);
    return result;
  }

  async addColumn(
    boardId: string,
    dto: { name: string; status: string; color?: string; wipLimit?: number },
  ): Promise<TmTaskBoardColumn> {
    const board = await this.boardRepo.findOne({ where: { id: boardId } });
    if (!board) throw new NotFoundException(`Board ${boardId} not found`);

    const count = await this.columnRepo.count({ where: { board: { id: boardId } } });
    const column = this.columnRepo.create({
      board:      { id: boardId } as TmTaskBoard,
      name:       dto.name,
      status:     dto.status,
      orderIndex: count,
      color:      dto.color ?? '#94a3b8',
      wipLimit:   dto.wipLimit ?? null,
    });
    const saved = await this.columnRepo.save(column);
    await this.cache.invalidateBoard(boardId);
    return saved;
  }

  async updateColumn(
    boardId: string,
    columnId: string,
    dto: UpdateBoardColumnDto,
  ): Promise<TmTaskBoardColumn> {
    const column = await this.columnRepo.findOne({
      where: { id: columnId, board: { id: boardId } },
    });
    if (!column) throw new NotFoundException(`Column ${columnId} not found`);

    if (dto.name     !== undefined) column.name     = dto.name;
    if (dto.color    !== undefined) column.color    = dto.color;
    if (dto.wipLimit !== undefined) column.wipLimit = dto.wipLimit;

    const saved = await this.columnRepo.save(column);
    await this.cache.invalidateBoard(boardId);
    return saved;
  }

  async reorderColumns(boardId: string, dto: ReorderColumnsDto): Promise<TmTaskBoard> {
    const columns = await this.columnRepo.find({ where: { board: { id: boardId } } });
    const colMap  = new Map(columns.map((c) => [c.id, c]));

    await Promise.all(
      dto.columnIds.map((id, idx) => {
        const col = colMap.get(id);
        if (col) { col.orderIndex = idx; return this.columnRepo.save(col); }
      }),
    );

    await this.cache.invalidateBoard(boardId);
    this.taskGateway.emitBoardReordered(boardId, dto.columnIds);
    return this.findOne(boardId);
  }
}
