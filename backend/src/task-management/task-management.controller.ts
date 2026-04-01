import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { TmTaskService } from './services/tm-task.service';
import { TmTaskDelegationService } from './services/tm-task-delegation.service';
import { TmTaskCommentService } from './services/tm-task-comment.service';
import { TmTaskBoardService } from './services/tm-task-board.service';
import { TmTaskReportingService } from './services/tm-task-reporting.service';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { ChangeTaskStatusDto } from './dto/change-task-status.dto';
import { GetTasksQueryDto } from './dto/get-tasks-query.dto';
import { CreateCommentDto, UpdateCommentDto } from './dto/create-comment.dto';
import { BulkTaskStatusDto, BulkTaskAssignDto, BulkTaskDeleteDto } from './dto/bulk-task.dto';
import {
  CreateBoardDto,
  MoveTaskDto,
  ReorderColumnsDto,
  UpdateBoardColumnDto,
  AddChecklistItemDto,
  UpdateChecklistItemDto,
} from './dto/create-board.dto';

import { ActiveUser } from '../iam/decorators/active-user.decorator';
import type { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Permissions } from '../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../iam/authorization/permission.type';
import { getRequestMeta } from '../common/http/request-meta.util';

@ApiTags('Task Management')
@ApiBearerAuth()
@Controller('task-management')
export class TaskManagementController {
  constructor(
    private readonly taskService: TmTaskService,
    private readonly delegationService: TmTaskDelegationService,
    private readonly commentService: TmTaskCommentService,
    private readonly boardService: TmTaskBoardService,
    private readonly reportingService: TmTaskReportingService,
  ) {}

  // ════════════════════════════════════════════════════════════════════════════
  // TASKS — Core CRUD
  // ════════════════════════════════════════════════════════════════════════════

  @Post('tasks')
  @Permissions(Permission.TM_TASKS_CREATE)
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201 })
  create(@Body() dto: CreateTaskDto, @ActiveUser() actor: ActiveUserData) {
    return this.taskService.create(dto, actor);
  }

  @Get('tasks')
  @Permissions(Permission.TM_TASKS_READ)
  @ApiOperation({ summary: 'List tasks with filters and pagination' })
  findAll(@Query() query: GetTasksQueryDto, @ActiveUser() actor: ActiveUserData) {
    return this.taskService.findAll(query, actor);
  }

  @Get('tasks/:id')
  @Permissions(Permission.TM_TASKS_READ)
  @ApiOperation({ summary: 'Get full task detail' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id', ParseUUIDPipe) id: string, @ActiveUser() actor: ActiveUserData) {
    return this.taskService.findOne(id, actor);
  }

  @Patch('tasks/:id')
  @Permissions(Permission.TM_TASKS_UPDATE)
  @ApiOperation({ summary: 'Update task fields' })
  @ApiParam({ name: 'id', type: String })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.taskService.update(id, dto, actor);
  }

  @Delete('tasks/:id')
  @Permissions(Permission.TM_TASKS_DELETE)
  @ApiOperation({ summary: 'Soft-delete a task' })
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id', ParseUUIDPipe) id: string, @ActiveUser() actor: ActiveUserData) {
    return this.taskService.remove(id, actor);
  }

  @Post('tasks/:id/status')
  @Permissions(Permission.TM_TASKS_UPDATE)
  @ApiOperation({ summary: 'Change task status (enforces state machine)' })
  @ApiParam({ name: 'id', type: String })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeTaskStatusDto,
    @ActiveUser() actor: ActiveUserData,
    @Req() req: Request,
  ) {
    return this.taskService.changeStatus(id, dto, actor, getRequestMeta(req));
  }

  @Get('tasks/:id/history')
  @Permissions(Permission.TM_TASKS_READ)
  @ApiOperation({ summary: 'Get full audit trail for a task' })
  @ApiParam({ name: 'id', type: String })
  getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskService.getHistory(id);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TASKS — Bulk operations
  // ════════════════════════════════════════════════════════════════════════════

  @Patch('tasks/bulk/status')
  @Permissions(Permission.TM_TASKS_UPDATE)
  @ApiOperation({ summary: 'Change status on multiple tasks (max 100)' })
  bulkChangeStatus(@Body() dto: BulkTaskStatusDto, @ActiveUser() actor: ActiveUserData) {
    return this.taskService.bulkChangeStatus(dto, actor);
  }

  @Patch('tasks/bulk/assign')
  @Permissions(Permission.TM_TASKS_ASSIGN)
  @ApiOperation({ summary: 'Assign multiple tasks to a user/department/role (max 100)' })
  bulkAssign(@Body() dto: BulkTaskAssignDto, @ActiveUser() actor: ActiveUserData) {
    return this.taskService.bulkAssign(dto, actor);
  }

  @Delete('tasks/bulk')
  @Permissions(Permission.TM_TASKS_DELETE)
  @ApiOperation({ summary: 'Soft-delete multiple tasks (max 100)' })
  bulkDelete(@Body() dto: BulkTaskDeleteDto, @ActiveUser() actor: ActiveUserData) {
    return this.taskService.bulkDelete(dto, actor);
  }

  @Post('tasks/:id/move')
  @Permissions(Permission.TM_TASKS_UPDATE)
  @ApiOperation({ summary: 'Move task to a Kanban column' })
  @ApiParam({ name: 'id', type: String })
  moveToColumn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveTaskDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.taskService.moveToColumn(id, dto, actor);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SUBTASKS
  // ════════════════════════════════════════════════════════════════════════════

  @Post('tasks/:id/subtasks')
  @Permissions(Permission.TM_TASKS_CREATE)
  @ApiOperation({ summary: 'Create a subtask' })
  @ApiParam({ name: 'id', type: String })
  createSubtask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTaskDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.taskService.create({ ...dto, parentTaskId: id }, actor);
  }

  @Get('tasks/:id/subtasks')
  @Permissions(Permission.TM_TASKS_READ)
  @ApiOperation({ summary: 'Get subtasks of a task' })
  @ApiParam({ name: 'id', type: String })
  getSubtasks(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskService.getSubtasks(id);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CHECKLIST
  // ════════════════════════════════════════════════════════════════════════════

  @Post('tasks/:id/checklist')
  @Permissions(Permission.TM_TASKS_UPDATE)
  @ApiOperation({ summary: 'Add checklist item to task' })
  @ApiParam({ name: 'id', type: String })
  addChecklistItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddChecklistItemDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.taskService.addChecklistItem(id, dto, actor);
  }

  @Patch('tasks/:id/checklist/:itemId')
  @Permissions(Permission.TM_TASKS_UPDATE)
  @ApiOperation({ summary: 'Update checklist item' })
  updateChecklistItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateChecklistItemDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.taskService.updateChecklistItem(id, itemId, dto, actor);
  }

  @Delete('tasks/:id/checklist/:itemId')
  @Permissions(Permission.TM_TASKS_UPDATE)
  @ApiOperation({ summary: 'Remove checklist item' })
  removeChecklistItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.taskService.removeChecklistItem(id, itemId);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ASSIGNMENT & DELEGATION
  // ════════════════════════════════════════════════════════════════════════════

  @Post('tasks/:id/assign')
  @Permissions(Permission.TM_TASKS_ASSIGN)
  @ApiOperation({ summary: 'Assign task to user / department / role' })
  @ApiParam({ name: 'id', type: String })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTaskDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.delegationService.assign(id, dto, actor);
  }

  @Post('tasks/:id/delegate')
  @Permissions(Permission.TM_TASKS_DELEGATE)
  @ApiOperation({ summary: 'Re-delegate task (creates delegation chain entry)' })
  @ApiParam({ name: 'id', type: String })
  delegate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTaskDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.delegationService.assign(id, dto, actor);
  }

  @Get('tasks/:id/delegation-chain')
  @Permissions(Permission.TM_TASKS_READ)
  @ApiOperation({ summary: 'Get full delegation chain for a task' })
  @ApiParam({ name: 'id', type: String })
  getDelegationChain(@Param('id', ParseUUIDPipe) id: string) {
    return this.delegationService.getDelegationChain(id);
  }

  @Get('tasks/:id/assignments')
  @Permissions(Permission.TM_TASKS_READ)
  @ApiOperation({ summary: 'Get all assignment records for a task' })
  @ApiParam({ name: 'id', type: String })
  getAssignments(@Param('id', ParseUUIDPipe) id: string) {
    return this.delegationService.getAllAssignments(id);
  }

  @Delete('tasks/:id/delegate/:assignmentId')
  @Permissions(Permission.TM_TASKS_DELEGATE)
  @ApiOperation({ summary: 'Revoke a delegation assignment' })
  revokeAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.delegationService.revoke(id, assignmentId, actor);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // COMMENTS
  // ════════════════════════════════════════════════════════════════════════════

  @Post('tasks/:id/comments')
  @Permissions(Permission.TM_TASKS_READ)
  @ApiOperation({ summary: 'Add comment to task (supports threading and @mentions)' })
  @ApiParam({ name: 'id', type: String })
  addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.commentService.create(id, dto, actor);
  }

  @Get('tasks/:id/comments')
  @Permissions(Permission.TM_TASKS_READ)
  @ApiOperation({ summary: 'Get threaded comments for a task' })
  @ApiParam({ name: 'id', type: String })
  getComments(@Param('id', ParseUUIDPipe) id: string) {
    return this.commentService.findAll(id);
  }

  @Patch('tasks/:id/comments/:commentId')
  @Permissions(Permission.TM_TASKS_READ)
  @ApiOperation({ summary: 'Edit own comment' })
  updateComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateCommentDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.commentService.update(id, commentId, dto, actor);
  }

  @Delete('tasks/:id/comments/:commentId')
  @Permissions(Permission.TM_TASKS_READ)
  @ApiOperation({ summary: 'Delete own comment (soft delete)' })
  removeComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.commentService.remove(id, commentId, actor);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BOARDS
  // ════════════════════════════════════════════════════════════════════════════

  @Post('boards')
  @Permissions(Permission.TM_BOARDS_MANAGE)
  @ApiOperation({ summary: 'Create a Kanban board' })
  createBoard(@Body() dto: CreateBoardDto, @ActiveUser() actor: ActiveUserData) {
    return this.boardService.create(dto, actor);
  }

  @Get('boards')
  @Permissions(Permission.TM_BOARDS_READ)
  @ApiOperation({ summary: 'List boards accessible to user' })
  listBoards(@ActiveUser() actor: ActiveUserData) {
    return this.boardService.findAll(actor);
  }

  @Get('boards/:id')
  @Permissions(Permission.TM_BOARDS_READ)
  @ApiOperation({ summary: 'Get board with columns and tasks' })
  @ApiParam({ name: 'id', type: String })
  getBoard(@Param('id', ParseUUIDPipe) id: string) {
    return this.boardService.getBoardWithTasks(id);
  }

  @Post('boards/:id/columns')
  @Permissions(Permission.TM_BOARDS_MANAGE)
  @ApiOperation({ summary: 'Add column to board' })
  @ApiParam({ name: 'id', type: String })
  addColumn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { name: string; status: string; color?: string; wipLimit?: number },
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.boardService.addColumn(id, dto, actor);
  }

  @Patch('boards/:id/columns/:colId')
  @Permissions(Permission.TM_BOARDS_MANAGE)
  @ApiOperation({ summary: 'Update board column' })
  updateColumn(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('colId', ParseUUIDPipe) colId: string,
    @Body() dto: UpdateBoardColumnDto,
  ) {
    return this.boardService.updateColumn(id, colId, dto);
  }

  @Post('boards/:id/columns/reorder')
  @Permissions(Permission.TM_BOARDS_MANAGE)
  @ApiOperation({ summary: 'Reorder columns in board' })
  @ApiParam({ name: 'id', type: String })
  reorderColumns(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderColumnsDto,
  ) {
    return this.boardService.reorderColumns(id, dto);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REPORTS
  // ════════════════════════════════════════════════════════════════════════════

  @Get('reports/workload')
  @Permissions(Permission.TM_REPORTS_READ)
  @ApiOperation({ summary: 'Get task workload per user' })
  getWorkload(@Query('departmentId') departmentId?: string) {
    return this.reportingService.getWorkload(departmentId ? Number(departmentId) : undefined);
  }

  @Get('reports/department-overview')
  @Permissions(Permission.TM_REPORTS_READ)
  @ApiOperation({ summary: 'Get task metrics per department' })
  getDepartmentOverview(@Query('departmentId') departmentId?: string) {
    return this.reportingService.getDepartmentOverview(
      departmentId ? Number(departmentId) : undefined,
    );
  }

  @Get('reports/sla-compliance')
  @Permissions(Permission.TM_REPORTS_READ)
  @ApiOperation({ summary: 'Get SLA compliance statistics' })
  getSlaCompliance(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportingService.getSlaCompliance(from, to);
  }

  @Get('reports/completion-metrics')
  @Permissions(Permission.TM_REPORTS_READ)
  @ApiOperation({ summary: 'Get task completion trends' })
  getCompletionMetrics(
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
    @Query('limit') limit?: string,
  ) {
    return this.reportingService.getCompletionMetrics(groupBy ?? 'day', limit ? Number(limit) : 30);
  }
}
