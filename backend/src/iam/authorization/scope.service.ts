import { ForbiddenException, Injectable } from '@nestjs/common';
import { Brackets, SelectQueryBuilder, WhereExpressionBuilder } from 'typeorm';
import type { ActiveUserData } from '../interfaces/activate-user-data.interface';
import { Role } from '../../users/enums/role.enum';
import { User } from '../../users/entities/user.entity';
import { Document } from '../../document/entities/document.entity';
import { Task } from '../../task/entities/task.entity';
import { FileEntity } from '../../files/entities/file.entity';
import { ScopeResolverService } from './scope-resolver.service';

@Injectable()
export class ScopeService {
  constructor(private readonly scopeResolver: ScopeResolverService) {}

  private hasOrgUnitSubtreeAccess(
    actor: ActiveUserData,
    targetOrgUnitPath?: string | null,
  ): boolean {
    if (!actor.orgUnitPath || !targetOrgUnitPath) {
      return false;
    }

    return (
      targetOrgUnitPath === actor.orgUnitPath ||
      targetOrgUnitPath.startsWith(`${actor.orgUnitPath}.`)
    );
  }

  private hasDepartmentAccess(
    actor: ActiveUserData,
    targetDepartmentId?: number | null,
  ): boolean {
    if (!targetDepartmentId) {
      return false;
    }

    if (this.isManager(actor) && actor.departmentId === targetDepartmentId) {
      return true;
    }

    return actor.delegationContext?.scopeDepartmentId === targetDepartmentId;
  }

  private addOrgUnitScopeClause(
    scopeQb: WhereExpressionBuilder,
    orgUnitPathAlias: string | undefined,
    actor: ActiveUserData,
    paramKey = 'orgUnitPathPrefix',
  ): void {
    if (!orgUnitPathAlias || !actor.orgUnitPath) {
      return;
    }

    scopeQb.orWhere(`${orgUnitPathAlias} = :actorOrgUnitPath`, {
      actorOrgUnitPath: actor.orgUnitPath,
    });
    scopeQb.orWhere(`${orgUnitPathAlias} LIKE :${paramKey}`, {
      [paramKey]: `${actor.orgUnitPath}.%`,
    });
  }

  isAdmin(actor: ActiveUserData): boolean {
    return actor.role === Role.Admin;
  }

  isManager(actor: ActiveUserData): boolean {
    return actor.role === Role.Manager;
  }

  assertUserScope(actor: ActiveUserData, targetUser: User): void {
    if (this.scopeResolver.canAccess(actor, targetUser)) {
      return;
    }
    if (this.isAdmin(actor)) {
      return;
    }
    if (actor.sub === targetUser.id) {
      return;
    }
    if (this.hasOrgUnitSubtreeAccess(actor, targetUser.orgUnit?.path)) {
      return;
    }
    if (this.hasDepartmentAccess(actor, targetUser.department?.id)) {
      return;
    }
    throw new ForbiddenException('Forbidden by user scope');
  }

  async assertOrgUnitScope(
    actor: ActiveUserData,
    orgUnitId: number,
  ): Promise<void> {
    if (this.isAdmin(actor)) {
      return;
    }

    const allowed = await this.scopeResolver.isOrgUnitWithinActorScope(
      actor,
      orgUnitId,
    );
    if (!allowed) {
      throw new ForbiddenException('Forbidden by org unit scope');
    }
  }

  assertDocumentScope(actor: ActiveUserData, document: Document): void {
    if (this.scopeResolver.canAccess(actor, document)) {
      return;
    }
    if (this.isAdmin(actor)) {
      return;
    }

    const isOwner =
      document.sender?.id === actor.sub || document.receiver?.id === actor.sub;
    if (isOwner) {
      return;
    }

    if (
      this.hasOrgUnitSubtreeAccess(actor, document.orgUnit?.path) ||
      this.hasOrgUnitSubtreeAccess(actor, document.sender?.orgUnit?.path) ||
      this.hasOrgUnitSubtreeAccess(actor, document.receiver?.orgUnit?.path)
    ) {
      return;
    }

    if (this.hasDepartmentAccess(actor, document.department?.id)) {
      return;
    }

    throw new ForbiddenException('Forbidden by document scope');
  }

  assertTaskScope(actor: ActiveUserData, task: Task): void {
    if (this.scopeResolver.canAccess(actor, task)) {
      return;
    }
    if (this.isAdmin(actor)) {
      return;
    }

    const isOwner =
      task.creator?.id === actor.sub || task.receiver?.id === actor.sub;
    if (isOwner) {
      return;
    }

    if (
      this.hasOrgUnitSubtreeAccess(actor, task.creator?.orgUnit?.path) ||
      this.hasOrgUnitSubtreeAccess(actor, task.receiver?.orgUnit?.path)
    ) {
      return;
    }

    if (
      this.hasDepartmentAccess(actor, task.creator?.department?.id) ||
      this.hasDepartmentAccess(actor, task.receiver?.department?.id)
    ) {
      return;
    }

    throw new ForbiddenException('Forbidden by task scope');
  }

  assertFileScope(actor: ActiveUserData, file: FileEntity): void {
    if (this.scopeResolver.canAccess(actor, file)) {
      return;
    }
    if (this.isAdmin(actor)) {
      return;
    }
    if (file.owner?.id === actor.sub) {
      return;
    }
    if (this.hasOrgUnitSubtreeAccess(actor, file.owner?.orgUnit?.path)) {
      return;
    }
    if (this.hasDepartmentAccess(actor, file.department?.id)) {
      return;
    }
    throw new ForbiddenException('Forbidden by file scope');
  }

  assertDocumentFileLinkScope(
    actor: ActiveUserData,
    document: Document,
    file: FileEntity,
  ): void {
    this.assertDocumentScope(actor, document);
    this.assertFileScope(actor, file);
  }

  assertTaskFileLinkScope(
    actor: ActiveUserData,
    task: Task,
    file: FileEntity,
  ): void {
    this.assertTaskScope(actor, task);
    this.assertFileScope(actor, file);
  }

  applyFileScope(
    qb: SelectQueryBuilder<FileEntity>,
    actor: ActiveUserData,
    aliases: {
      ownerAlias: string;
      departmentAlias: string;
      ownerOrgUnitPathAlias?: string;
    },
    options?: {
      extraOrCondition?: string;
      extraOrParams?: Record<string, unknown>;
    },
  ): void {
    if (this.isAdmin(actor) || actor.delegationContext?.scopeType === 'global') {
      return;
    }
    const delegatedDepartmentId = actor.delegationContext?.scopeDepartmentId;
    const onBehalfOfUserId = actor.onBehalfOfUserId ?? null;
    qb.andWhere(
      new Brackets((scopeQb) => {
        scopeQb.where(`${aliases.ownerAlias}.id = :userId`, {
          userId: actor.sub,
        });
        if (onBehalfOfUserId) {
          scopeQb.orWhere(`${aliases.ownerAlias}.id = :onBehalfOfUserId`, {
            onBehalfOfUserId,
          });
        }
        if (this.isManager(actor) && actor.departmentId) {
          scopeQb.orWhere(`${aliases.departmentAlias}.id = :departmentId`, {
            departmentId: actor.departmentId,
          });
        }
        this.addOrgUnitScopeClause(
          scopeQb,
          aliases.ownerOrgUnitPathAlias,
          actor,
          'ownerOrgUnitPathPrefix',
        );
        if (delegatedDepartmentId && delegatedDepartmentId !== actor.departmentId) {
          scopeQb.orWhere(`${aliases.departmentAlias}.id = :delegatedDepartmentId`, {
            delegatedDepartmentId,
          });
        }
        if (options?.extraOrCondition) {
          scopeQb.orWhere(
            options.extraOrCondition,
            options.extraOrParams,
          );
        }
      }),
    );
  }

  applyDocumentScope(
    qb: SelectQueryBuilder<Document>,
    actor: ActiveUserData,
    aliases: {
      senderAlias: string;
      receiverAlias: string;
      departmentAlias: string;
      documentOrgUnitPathAlias?: string;
      senderOrgUnitPathAlias?: string;
      receiverOrgUnitPathAlias?: string;
    },
  ): void {
    if (this.isAdmin(actor) || actor.delegationContext?.scopeType === 'global') {
      return;
    }
    const delegatedDepartmentId = actor.delegationContext?.scopeDepartmentId;
    const onBehalfOfUserId = actor.onBehalfOfUserId ?? null;
    qb.andWhere(
      new Brackets((scopeQb) => {
        scopeQb
          .where(`${aliases.senderAlias}.id = :userId`, { userId: actor.sub })
          .orWhere(`${aliases.receiverAlias}.id = :userId`, {
            userId: actor.sub,
          });
        if (onBehalfOfUserId) {
          scopeQb
            .orWhere(`${aliases.senderAlias}.id = :onBehalfOfUserId`, {
              onBehalfOfUserId,
            })
            .orWhere(`${aliases.receiverAlias}.id = :onBehalfOfUserId`, {
              onBehalfOfUserId,
            });
        }
        if (this.isManager(actor) && actor.departmentId) {
          scopeQb.orWhere(`${aliases.departmentAlias}.id = :departmentId`, {
            departmentId: actor.departmentId,
          });
        }
        this.addOrgUnitScopeClause(
          scopeQb,
          aliases.documentOrgUnitPathAlias,
          actor,
          'documentOrgUnitPathPrefix',
        );
        this.addOrgUnitScopeClause(
          scopeQb,
          aliases.senderOrgUnitPathAlias,
          actor,
          'senderOrgUnitPathPrefix',
        );
        this.addOrgUnitScopeClause(
          scopeQb,
          aliases.receiverOrgUnitPathAlias,
          actor,
          'receiverOrgUnitPathPrefix',
        );
        if (delegatedDepartmentId && delegatedDepartmentId !== actor.departmentId) {
          scopeQb.orWhere(`${aliases.departmentAlias}.id = :delegatedDepartmentId`, {
            delegatedDepartmentId,
          });
        }
      }),
    );
  }

  applyTaskScope(
    qb: SelectQueryBuilder<Task>,
    actor: ActiveUserData,
    aliases: {
      creatorAlias: string;
      receiverAlias: string;
      creatorDepartmentAlias: string;
      receiverDepartmentAlias: string;
      creatorOrgUnitPathAlias?: string;
      receiverOrgUnitPathAlias?: string;
    },
  ): void {
    if (this.isAdmin(actor) || actor.delegationContext?.scopeType === 'global') {
      return;
    }
    const delegatedDepartmentId = actor.delegationContext?.scopeDepartmentId;
    const onBehalfOfUserId = actor.onBehalfOfUserId ?? null;
    qb.andWhere(
      new Brackets((scopeQb) => {
        scopeQb
          .where(`${aliases.creatorAlias}.id = :userId`, { userId: actor.sub })
          .orWhere(`${aliases.receiverAlias}.id = :userId`, {
            userId: actor.sub,
          });
        if (onBehalfOfUserId) {
          scopeQb
            .orWhere(`${aliases.creatorAlias}.id = :onBehalfOfUserId`, {
              onBehalfOfUserId,
            })
            .orWhere(`${aliases.receiverAlias}.id = :onBehalfOfUserId`, {
              onBehalfOfUserId,
            });
        }
        if (this.isManager(actor) && actor.departmentId) {
          scopeQb
            .orWhere(`${aliases.creatorDepartmentAlias}.id = :departmentId`, {
              departmentId: actor.departmentId,
            })
            .orWhere(`${aliases.receiverDepartmentAlias}.id = :departmentId`, {
              departmentId: actor.departmentId,
            });
        }
        this.addOrgUnitScopeClause(
          scopeQb,
          aliases.creatorOrgUnitPathAlias,
          actor,
          'creatorOrgUnitPathPrefix',
        );
        this.addOrgUnitScopeClause(
          scopeQb,
          aliases.receiverOrgUnitPathAlias,
          actor,
          'receiverOrgUnitPathPrefix',
        );
        if (delegatedDepartmentId && delegatedDepartmentId !== actor.departmentId) {
          scopeQb
            .orWhere(
              `${aliases.creatorDepartmentAlias}.id = :delegatedDepartmentId`,
              {
                delegatedDepartmentId,
              },
            )
            .orWhere(
              `${aliases.receiverDepartmentAlias}.id = :delegatedDepartmentId`,
              {
                delegatedDepartmentId,
              },
            );
        }
      }),
    );
  }
}
