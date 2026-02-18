import { ExecutionContext, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../users/entities/user.entity';
import { Document } from '../../../document/entities/document.entity';
import { Task } from '../../../task/entities/task.entity';
import { Role } from '../../../users/enums/role.enum';
import { ActiveUserData } from '../../interfaces/activate-user-data.interface';
import { Policy } from './interfaces/policy.interface';
import { PolicyHandler } from './interfaces/policy-handler.interface';
import { PolicyHandlersStorage } from './policy-handlers.storage';
import { Request } from 'express';
import { ScopeService } from '../scope.service';

class BaseScopePolicy implements Policy {
  constructor(
    public readonly name: string,
    public readonly idParam = 'id',
  ) {}
}

export class UserScopePolicy extends BaseScopePolicy {
  constructor(idParam = 'id') {
    super('UserScope', idParam);
  }
}

export class DocumentScopePolicy extends BaseScopePolicy {
  constructor(idParam = 'id') {
    super('DocumentScope', idParam);
  }
}

export class TaskScopePolicy extends BaseScopePolicy {
  constructor(idParam = 'id') {
    super('TaskScope', idParam);
  }
}

@Injectable()
export class UserScopePolicyHandler
  implements PolicyHandler<UserScopePolicy>
{
  constructor(
    private readonly policyHandlerStorage: PolicyHandlersStorage,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly scopeService: ScopeService,
  ) {
    this.policyHandlerStorage.add(UserScopePolicy, this);
  }

  async handle(
    policy: UserScopePolicy,
    user: ActiveUserData,
    context: ExecutionContext,
  ): Promise<void> {
    if (user.role === Role.Admin) {
      return;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const id = Number(request.params?.[policy.idParam]);
    if (!id) {
      return;
    }

    const targetUser = await this.userRepository.findOne({
      where: { id },
      relations: { department: true },
    });
    if (!targetUser) {
      throw new Error('Target user not found');
    }

    this.scopeService.assertUserScope(user, targetUser);
  }
}

@Injectable()
export class DocumentScopePolicyHandler
  implements PolicyHandler<DocumentScopePolicy>
{
  constructor(
    private readonly policyHandlerStorage: PolicyHandlersStorage,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly scopeService: ScopeService,
  ) {
    this.policyHandlerStorage.add(DocumentScopePolicy, this);
  }

  async handle(
    policy: DocumentScopePolicy,
    user: ActiveUserData,
    context: ExecutionContext,
  ): Promise<void> {
    if (user.role === Role.Admin) {
      return;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const id = Number(request.params?.[policy.idParam]);
    if (!id) {
      return;
    }

    const document = await this.documentRepository.findOne({
      where: { id },
      relations: {
        sender: { department: true },
        receiver: { department: true },
        department: true,
      },
    });
    if (!document) {
      throw new Error('Document not found');
    }

    this.scopeService.assertDocumentScope(user, document);
  }
}

@Injectable()
export class TaskScopePolicyHandler implements PolicyHandler<TaskScopePolicy> {
  constructor(
    private readonly policyHandlerStorage: PolicyHandlersStorage,
    @InjectRepository(Task) private readonly taskRepository: Repository<Task>,
    private readonly scopeService: ScopeService,
  ) {
    this.policyHandlerStorage.add(TaskScopePolicy, this);
  }

  async handle(
    policy: TaskScopePolicy,
    user: ActiveUserData,
    context: ExecutionContext,
  ): Promise<void> {
    if (user.role === Role.Admin) {
      return;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const id = Number(request.params?.[policy.idParam]);
    if (!id) {
      return;
    }

    const task = await this.taskRepository.findOne({
      where: { id },
      relations: {
        creator: { department: true },
        receiver: { department: true },
      },
    });
    if (!task) {
      throw new Error('Task not found');
    }

    this.scopeService.assertTaskScope(user, task);
  }
}
