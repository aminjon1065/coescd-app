import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import type { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Permissions } from '../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../iam/authorization/permission.type';
import { Policies } from '../iam/authorization/decorators/policies.decorator';
import { TaskScopePolicy } from '../iam/authorization/policies/resource-scope.policy';
import type { Request } from 'express';
import { getRequestMeta } from '../common/http/request-meta.util';
import { GetTasksQueryDto } from './dto/get-tasks-query.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Post()
  @Permissions(Permission.TASKS_CREATE)
  create(
    @Body() createTaskDto: CreateTaskDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.taskService.create(createTaskDto, user.sub);
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
    return this.taskService.findAll(user, query);
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
    return this.taskService.findOne(+id, user);
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
    return this.taskService.findTaskFiles(id, user);
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
    return this.taskService.linkFile(id, fileId, user, getRequestMeta(request));
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
    return this.taskService.unlinkFile(
      id,
      fileId,
      user,
      getRequestMeta(request),
    );
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
    @Body() updateTaskDto: UpdateTaskDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.taskService.update(+id, updateTaskDto, user);
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
    return this.taskService.remove(+id, user);
  }
}
