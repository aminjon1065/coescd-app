import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CreateTaskDto } from '../../../task/dto/create-task.dto';
import { UpdateTaskDto } from '../../../task/dto/update-task.dto';
import { GetTasksQueryDto } from '../../../task/dto/get-tasks-query.dto';
import { ActiveUser } from '../../../iam/decorators/active-user.decorator';
import type { ActiveUserData } from '../../../iam/interfaces/activate-user-data.interface';
import { Permissions } from '../../../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../../../iam/authorization/permission.type';
import { Policies } from '../../../iam/authorization/decorators/policies.decorator';
import { TaskScopePolicy } from '../../../iam/authorization/policies/resource-scope.policy';
import { getRequestMeta } from '../../../common/http/request-meta.util';
import { TasksFacade } from '../tasks.facade';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('task')
export class TaskController {
  constructor(private readonly tasksFacade: TasksFacade) {}

  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Post()
  @Permissions(Permission.TASKS_CREATE)
  create(@Body() dto: CreateTaskDto, @ActiveUser() user: ActiveUserData) {
    return this.tasksFacade.legacy.create(dto, user);
  }

  @ApiOperation({ summary: 'Get all tasks' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get()
  @Permissions(Permission.TASKS_READ)
  @Policies(new TaskScopePolicy())
  findAll(
    @ActiveUser() user: ActiveUserData,
    @Query() query: GetTasksQueryDto,
  ) {
    return this.tasksFacade.legacy.findAll(user, query);
  }

  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Get(':id')
  @Permissions(Permission.TASKS_READ)
  @Policies(new TaskScopePolicy())
  findOne(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.tasksFacade.legacy.findOne(+id, user);
  }

  @ApiOperation({ summary: 'Get files linked to a task' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get(':id/files')
  @Permissions(Permission.TASKS_READ, Permission.FILES_READ)
  @Policies(new TaskScopePolicy())
  findTaskFiles(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.tasksFacade.legacy.findTaskFiles(id, user);
  }

  @ApiOperation({ summary: 'Link a file to a task' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'fileId', type: Number })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Post(':id/files/:fileId')
  @Permissions(Permission.TASKS_UPDATE, Permission.FILES_WRITE)
  @Policies(new TaskScopePolicy())
  linkFile(
    @Param('id', ParseIntPipe) id: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @ActiveUser() user: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.tasksFacade.legacy.linkFile(id, fileId, user, getRequestMeta(request));
  }

  @ApiOperation({ summary: 'Unlink a file from a task' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'fileId', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Delete(':id/files/:fileId')
  @Permissions(Permission.TASKS_UPDATE, Permission.FILES_WRITE)
  @Policies(new TaskScopePolicy())
  unlinkFile(
    @Param('id', ParseIntPipe) id: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @ActiveUser() user: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.tasksFacade.legacy.unlinkFile(id, fileId, user, getRequestMeta(request));
  }

  @ApiOperation({ summary: 'Update a task by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Patch(':id')
  @Permissions(Permission.TASKS_UPDATE)
  @Policies(new TaskScopePolicy())
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.tasksFacade.legacy.update(+id, dto, user);
  }

  @ApiOperation({ summary: 'Delete a task by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Delete(':id')
  @Permissions(Permission.TASKS_DELETE)
  @Policies(new TaskScopePolicy())
  remove(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.tasksFacade.legacy.remove(+id, user);
  }
}
