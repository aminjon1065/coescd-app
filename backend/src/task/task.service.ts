import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async findAll(actor: ActiveUserData): Promise<Task[]> {
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('creator.department', 'creatorDepartment')
      .leftJoinAndSelect('task.receiver', 'receiver')
      .leftJoinAndSelect('receiver.department', 'receiverDepartment')
      .orderBy('task.created_at', 'DESC');

    this.scopeService.applyTaskScope(qb, actor, {
      creatorAlias: 'creator',
      receiverAlias: 'receiver',
      creatorDepartmentAlias: 'creatorDepartment',
      receiverDepartmentAlias: 'receiverDepartment',
    });

    return qb.getMany();
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
