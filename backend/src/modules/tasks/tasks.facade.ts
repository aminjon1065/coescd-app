import { Injectable } from '@nestjs/common';
import type { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';
import { TaskService } from '../../task/task.service';
import { TmTaskService } from '../../task-management/services/tm-task.service';
import { TmTaskDelegationService } from '../../task-management/services/tm-task-delegation.service';
import { TmTaskCommentService } from '../../task-management/services/tm-task-comment.service';
import { TmTaskBoardService } from '../../task-management/services/tm-task-board.service';
import { TmTaskReportingService } from '../../task-management/services/tm-task-reporting.service';
import { TaskGateway } from '../../task-management/gateways/task.gateway';
import { CreateTaskDto as LegacyCreateTaskDto } from '../../task/dto/create-task.dto';
import { UpdateTaskDto as LegacyUpdateTaskDto } from '../../task/dto/update-task.dto';
import { GetTasksQueryDto as LegacyGetTasksQueryDto } from '../../task/dto/get-tasks-query.dto';
import { CreateTaskDto as TmCreateTaskDto } from '../../task-management/dto/create-task.dto';
import { UpdateTaskDto as TmUpdateTaskDto } from '../../task-management/dto/update-task.dto';
import { AssignTaskDto } from '../../task-management/dto/assign-task.dto';
import { ChangeTaskStatusDto } from '../../task-management/dto/change-task-status.dto';
import { GetTasksQueryDto as TmGetTasksQueryDto } from '../../task-management/dto/get-tasks-query.dto';
import { CreateCommentDto, UpdateCommentDto } from '../../task-management/dto/create-comment.dto';
import {
  BulkTaskAssignDto,
  BulkTaskDeleteDto,
  BulkTaskStatusDto,
} from '../../task-management/dto/bulk-task.dto';
import {
  AddChecklistItemDto,
  CreateBoardDto,
  MoveTaskDto,
  ReorderColumnsDto,
  UpdateBoardColumnDto,
  UpdateChecklistItemDto,
} from '../../task-management/dto/create-board.dto';

@Injectable()
export class TasksFacade {
  readonly legacy = {
    create: (dto: LegacyCreateTaskDto, actor: ActiveUserData) =>
      this.taskService.create(dto, actor),
    findAll: (actor: ActiveUserData, query: LegacyGetTasksQueryDto) =>
      this.taskService.findAll(actor, query),
    findOne: (id: number, actor: ActiveUserData) =>
      this.taskService.findOne(id, actor),
    update: (id: number, dto: LegacyUpdateTaskDto, actor: ActiveUserData) =>
      this.taskService.update(id, dto, actor),
    remove: (id: number, actor: ActiveUserData) => this.taskService.remove(id, actor),
    findTaskFiles: (taskId: number, actor: ActiveUserData) =>
      this.taskService.findTaskFiles(taskId, actor),
    linkFile: (
      taskId: number,
      fileId: number,
      actor: ActiveUserData,
      requestMeta: { ip: string | null; userAgent: string | null },
    ) => this.taskService.linkFile(taskId, fileId, actor, requestMeta),
    unlinkFile: (
      taskId: number,
      fileId: number,
      actor: ActiveUserData,
      requestMeta: { ip: string | null; userAgent: string | null },
    ) => this.taskService.unlinkFile(taskId, fileId, actor, requestMeta),
  };

  readonly management = {
    create: (dto: TmCreateTaskDto, actor: ActiveUserData) =>
      this.tmTaskService.create(dto, actor),
    findAll: (query: TmGetTasksQueryDto, actor: ActiveUserData) =>
      this.tmTaskService.findAll(query, actor),
    findOne: (id: string, actor: ActiveUserData) =>
      this.tmTaskService.findOne(id, actor),
    update: (id: string, dto: TmUpdateTaskDto, actor: ActiveUserData) =>
      this.tmTaskService.update(id, dto, actor),
    remove: (id: string, actor: ActiveUserData) =>
      this.tmTaskService.remove(id, actor),
    changeStatus: (
      id: string,
      dto: ChangeTaskStatusDto,
      actor: ActiveUserData,
      requestMeta: { ip: string | null; userAgent: string | null },
    ) => this.tmTaskService.changeStatus(id, dto, actor, requestMeta),
    getHistory: (id: string) => this.tmTaskService.getHistory(id),
    bulkChangeStatus: (dto: BulkTaskStatusDto, actor: ActiveUserData) =>
      this.tmTaskService.bulkChangeStatus(dto, actor),
    bulkAssign: (dto: BulkTaskAssignDto, actor: ActiveUserData) =>
      this.tmTaskService.bulkAssign(dto, actor),
    bulkDelete: (dto: BulkTaskDeleteDto, actor: ActiveUserData) =>
      this.tmTaskService.bulkDelete(dto, actor),
    moveToColumn: (
      id: string,
      dto: MoveTaskDto,
      actor: ActiveUserData,
    ) => this.tmTaskService.moveToColumn(id, dto, actor),
    createSubtask: (id: string, dto: TmCreateTaskDto, actor: ActiveUserData) =>
      this.tmTaskService.create({ ...dto, parentTaskId: id }, actor),
    getSubtasks: (id: string) => this.tmTaskService.getSubtasks(id),
    addChecklistItem: (id: string, dto: AddChecklistItemDto, actor: ActiveUserData) =>
      this.tmTaskService.addChecklistItem(id, dto, actor),
    updateChecklistItem: (
      id: string,
      itemId: string,
      dto: UpdateChecklistItemDto,
      actor: ActiveUserData,
    ) => this.tmTaskService.updateChecklistItem(id, itemId, dto, actor),
    removeChecklistItem: (id: string, itemId: string) =>
      this.tmTaskService.removeChecklistItem(id, itemId),
    assign: (id: string, dto: AssignTaskDto, actor: ActiveUserData) =>
      this.tmTaskDelegationService.assign(id, dto, actor),
    delegate: (id: string, dto: AssignTaskDto, actor: ActiveUserData) =>
      this.tmTaskDelegationService.assign(id, dto, actor),
    getDelegationChain: (id: string) =>
      this.tmTaskDelegationService.getDelegationChain(id),
    getAssignments: (id: string) =>
      this.tmTaskDelegationService.getAllAssignments(id),
    revokeAssignment: (id: string, assignmentId: string, actor: ActiveUserData) =>
      this.tmTaskDelegationService.revoke(id, assignmentId, actor),
    addComment: (id: string, dto: CreateCommentDto, actor: ActiveUserData) =>
      this.tmTaskCommentService.create(id, dto, actor),
    getComments: (id: string) => this.tmTaskCommentService.findAll(id),
    updateComment: (
      id: string,
      commentId: string,
      dto: UpdateCommentDto,
      actor: ActiveUserData,
    ) => this.tmTaskCommentService.update(id, commentId, dto, actor),
    deleteComment: (id: string, commentId: string, actor: ActiveUserData) =>
      this.tmTaskCommentService.remove(id, commentId, actor),
    createBoard: (dto: CreateBoardDto, actor: ActiveUserData) =>
      this.tmTaskBoardService.create(dto, actor),
    getBoards: (actor?: ActiveUserData) => this.tmTaskBoardService.findAll(actor),
    getBoard: (id: string) => this.tmTaskBoardService.findOne(id),
    getBoardWithTasks: (id: string) => this.tmTaskBoardService.getBoardWithTasks(id),
    updateBoardColumn: (
      boardId: string,
      columnId: string,
      dto: UpdateBoardColumnDto,
    ) => this.tmTaskBoardService.updateColumn(boardId, columnId, dto),
    reorderColumns: (boardId: string, dto: ReorderColumnsDto) =>
      this.tmTaskBoardService.reorderColumns(boardId, dto),
    getDepartmentOverview: (departmentId?: number) =>
      this.tmTaskReportingService.getDepartmentOverview(departmentId),
    getWorkload: (departmentId?: number) =>
      this.tmTaskReportingService.getWorkload(departmentId),
    getGateway: () => this.taskGateway,
  };

  constructor(
    private readonly taskService: TaskService,
    private readonly tmTaskService: TmTaskService,
    private readonly tmTaskDelegationService: TmTaskDelegationService,
    private readonly tmTaskCommentService: TmTaskCommentService,
    private readonly tmTaskBoardService: TmTaskBoardService,
    private readonly tmTaskReportingService: TmTaskReportingService,
    private readonly taskGateway: TaskGateway,
  ) {}
}
