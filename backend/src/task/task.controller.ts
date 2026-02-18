import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Permissions } from '../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../iam/authorization/permission.type';
import { Policies } from '../iam/authorization/decorators/policies.decorator';
import { TaskScopePolicy } from '../iam/authorization/policies/resource-scope.policy';
import { Request } from 'express';
import { getRequestMeta } from '../common/http/request-meta.util';

@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @Permissions(Permission.TASKS_CREATE)
  create(
    @Body() createTaskDto: CreateTaskDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.taskService.create(createTaskDto, user.sub);
  }

  @Get()
  @Permissions(Permission.TASKS_READ)
  @Policies(new TaskScopePolicy())
  findAll(@ActiveUser() user: ActiveUserData) {
    return this.taskService.findAll(user);
  }

  @Get(':id')
  @Permissions(Permission.TASKS_READ)
  @Policies(new TaskScopePolicy())
  findOne(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.taskService.findOne(+id, user);
  }

  @Get(':id/files')
  @Permissions(Permission.TASKS_READ, Permission.FILES_READ)
  @Policies(new TaskScopePolicy())
  findTaskFiles(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.taskService.findTaskFiles(id, user);
  }

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

  @Delete(':id/files/:fileId')
  @Permissions(Permission.TASKS_UPDATE, Permission.FILES_WRITE)
  @Policies(new TaskScopePolicy())
  unlinkFile(
    @Param('id', ParseIntPipe) id: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @ActiveUser() user: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.taskService.unlinkFile(id, fileId, user, getRequestMeta(request));
  }

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

  @Delete(':id')
  @Permissions(Permission.TASKS_DELETE)
  @Policies(new TaskScopePolicy())
  remove(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.taskService.remove(+id, user);
  }

}
