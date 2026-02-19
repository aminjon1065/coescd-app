import { ForbiddenException, Injectable } from '@nestjs/common';
import { Brackets, SelectQueryBuilder } from 'typeorm';
import { ActiveUserData } from '../interfaces/activate-user-data.interface';
import { Role } from '../../users/enums/role.enum';
import { User } from '../../users/entities/user.entity';
import { Document } from '../../document/entities/document.entity';
import { Task } from '../../task/entities/task.entity';
import { FileEntity } from '../../files/entities/file.entity';

@Injectable()
export class ScopeService {
  isAdmin(actor: ActiveUserData): boolean {
    return actor.role === Role.Admin;
  }

  isManager(actor: ActiveUserData): boolean {
    return actor.role === Role.Manager;
  }

  assertUserScope(actor: ActiveUserData, targetUser: User): void {
    if (this.isAdmin(actor)) {
      return;
    }
    if (actor.sub === targetUser.id) {
      return;
    }
    if (
      this.isManager(actor) &&
      actor.departmentId &&
      targetUser.department?.id === actor.departmentId
    ) {
      return;
    }
    throw new ForbiddenException('Forbidden by user scope');
  }

  assertDocumentScope(actor: ActiveUserData, document: Document): void {
    if (this.isAdmin(actor)) {
      return;
    }

    const isOwner =
      document.sender?.id === actor.sub || document.receiver?.id === actor.sub;
    if (isOwner) {
      return;
    }

    if (
      this.isManager(actor) &&
      actor.departmentId &&
      document.department?.id === actor.departmentId
    ) {
      return;
    }

    throw new ForbiddenException('Forbidden by document scope');
  }

  assertTaskScope(actor: ActiveUserData, task: Task): void {
    if (this.isAdmin(actor)) {
      return;
    }

    const isOwner =
      task.creator?.id === actor.sub || task.receiver?.id === actor.sub;
    if (isOwner) {
      return;
    }

    if (
      this.isManager(actor) &&
      actor.departmentId &&
      (task.creator?.department?.id === actor.departmentId ||
        task.receiver?.department?.id === actor.departmentId)
    ) {
      return;
    }

    throw new ForbiddenException('Forbidden by task scope');
  }

  assertFileScope(actor: ActiveUserData, file: FileEntity): void {
    if (this.isAdmin(actor)) {
      return;
    }
    if (file.owner?.id === actor.sub) {
      return;
    }
    if (
      this.isManager(actor) &&
      actor.departmentId &&
      file.department?.id === actor.departmentId
    ) {
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
    },
  ): void {
    if (this.isAdmin(actor)) {
      return;
    }
    qb.andWhere(
      new Brackets((scopeQb) => {
        scopeQb.where(`${aliases.ownerAlias}.id = :userId`, {
          userId: actor.sub,
        });
        if (this.isManager(actor) && actor.departmentId) {
          scopeQb.orWhere(`${aliases.departmentAlias}.id = :departmentId`, {
            departmentId: actor.departmentId,
          });
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
    },
  ): void {
    if (this.isAdmin(actor)) {
      return;
    }
    qb.andWhere(
      new Brackets((scopeQb) => {
        scopeQb
          .where(`${aliases.senderAlias}.id = :userId`, { userId: actor.sub })
          .orWhere(`${aliases.receiverAlias}.id = :userId`, {
            userId: actor.sub,
          });
        if (this.isManager(actor) && actor.departmentId) {
          scopeQb.orWhere(`${aliases.departmentAlias}.id = :departmentId`, {
            departmentId: actor.departmentId,
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
    },
  ): void {
    if (this.isAdmin(actor)) {
      return;
    }
    qb.andWhere(
      new Brackets((scopeQb) => {
        scopeQb
          .where(`${aliases.creatorAlias}.id = :userId`, { userId: actor.sub })
          .orWhere(`${aliases.receiverAlias}.id = :userId`, {
            userId: actor.sub,
          });
        if (this.isManager(actor) && actor.departmentId) {
          scopeQb
            .orWhere(`${aliases.creatorDepartmentAlias}.id = :departmentId`, {
              departmentId: actor.departmentId,
            })
            .orWhere(`${aliases.receiverDepartmentAlias}.id = :departmentId`, {
              departmentId: actor.departmentId,
            });
        }
      }),
    );
  }
}
