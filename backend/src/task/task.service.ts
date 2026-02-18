import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { User } from '../users/entities/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Permission } from '../iam/authorization/permission.type';
import { ScopeService } from '../iam/authorization/scope.service';
import { FileLinkEntity } from '../files/entities/file-link.entity';
import { FileEntity } from '../files/entities/file.entity';
import { FileAttachmentsService } from '../files/file-attachments.service';
import { GetTasksQueryDto } from './dto/get-tasks-query.dto';
import { PaginatedResponse } from '../common/http/pagination-query.dto';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly scopeService: ScopeService,
    private readonly fileAttachmentsService: FileAttachmentsService,
  ) {}

  async create(dto: CreateTaskDto, creatorId: number): Promise<Task> {
    const creator = await this.userRepo.findOneBy({ id: creatorId });
    if (!creator) throw new NotFoundException('Creator not found');

    const receiver = await this.userRepo.findOneBy({ id: dto.receiverId });
    if (!receiver) throw new NotFoundException('Receiver not found');

    const task = this.taskRepo.create({
      title: dto.title,
      description: dto.description,
      creator,
      receiver,
    });
    return this.taskRepo.save(task);
  }

  async findAll(
    actor: ActiveUserData,
    query: GetTasksQueryDto,
  ): Promise<PaginatedResponse<Task>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));
    const offset = (page - 1) * limit;
    const search = query.q?.toLowerCase();

    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('creator.department', 'creatorDepartment')
      .leftJoinAndSelect('task.receiver', 'receiver')
      .leftJoinAndSelect('receiver.department', 'receiverDepartment')
      .orderBy('task.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('task.status = :status', { status: query.status });
    }

    if (search) {
      qb.andWhere(
        new Brackets((scopeQb) => {
          scopeQb
            .where('LOWER(task.title) LIKE :q', { q: `%${search}%` })
            .orWhere('LOWER(task.description) LIKE :q', {
              q: `%${search}%`,
            });
        }),
      );
    }

    this.scopeService.applyTaskScope(qb, actor, {
      creatorAlias: 'creator',
      receiverAlias: 'receiver',
      creatorDepartmentAlias: 'creatorDepartment',
      receiverDepartmentAlias: 'receiverDepartment',
    });

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number, actor: ActiveUserData): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: {
        creator: { department: true },
        receiver: { department: true },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    this.scopeService.assertTaskScope(actor, task);
    return task;
  }

  async update(id: number, dto: UpdateTaskDto, actor: ActiveUserData): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: {
        creator: { department: true },
        receiver: { department: true },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    this.scopeService.assertTaskScope(actor, task);

    if (dto.receiverId) {
      if (!actor.permissions?.includes(Permission.TASKS_ASSIGN)) {
        throw new ForbiddenException('Missing permission: tasks.assign');
      }
      const receiver = await this.userRepo.findOneBy({ id: dto.receiverId });
      if (!receiver) throw new NotFoundException('Receiver not found');
      task.receiver = receiver;
    }

    if (dto.title) task.title = dto.title;
    if (dto.description) task.description = dto.description;
    if (dto.status) task.status = dto.status;

    return this.taskRepo.save(task);
  }

  async remove(id: number, actor: ActiveUserData): Promise<void> {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: {
        creator: { department: true },
        receiver: { department: true },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    this.scopeService.assertTaskScope(actor, task);
    await this.taskRepo.remove(task);
  }

  async findTaskFiles(taskId: number, actor: ActiveUserData): Promise<FileEntity[]> {
    await this.findOne(taskId, actor);
    return this.fileAttachmentsService.listResourceFiles({
      resourceType: 'task',
      resourceId: taskId,
      actor,
    });
  }

  async linkFile(
    taskId: number,
    fileId: number,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ): Promise<FileLinkEntity> {
    const [task, file] = await Promise.all([
      this.findOne(taskId, actor),
      this.fileAttachmentsService.findAttachableFile(fileId),
    ]);
    this.scopeService.assertTaskFileLinkScope(actor, task, file);
    return this.fileAttachmentsService.linkResourceFile({
      resourceType: 'task',
      resourceId: taskId,
      file,
      actor,
      requestMeta,
    });
  }

  async unlinkFile(
    taskId: number,
    fileId: number,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ): Promise<{ unlinked: true }> {
    const [task, file] = await Promise.all([
      this.findOne(taskId, actor),
      this.fileAttachmentsService.findAttachableFile(fileId),
    ]);
    this.scopeService.assertTaskFileLinkScope(actor, task, file);
    return this.fileAttachmentsService.unlinkResourceFile({
      resourceType: 'task',
      resourceId: taskId,
      file,
      actor,
      requestMeta,
    });
  }
}
