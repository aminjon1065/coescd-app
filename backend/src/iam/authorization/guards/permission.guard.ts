import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { ActiveUserData } from '../../interfaces/activate-user-data.interface';
import {
  REQUEST_DELEGATION_CONTEXT_KEY,
  REQUEST_USER_KEY,
} from '../../iam.constants';
import { PermissionType } from '../permission.type';
import { PERMISSION_KEY } from '../decorators/permissions.decorator';
import { RolePermissionsService } from '../role-permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const contextPermissions = this.reflector.getAllAndOverride<
      PermissionType[]
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (!contextPermissions) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user: ActiveUserData = request[REQUEST_USER_KEY];
    const effectivePermissions =
      this.rolePermissionsService.resolveUserPermissions(
        user.role,
        user.permissions,
        user.businessRole,
      );
    const hasDelegationContext = !!request[REQUEST_DELEGATION_CONTEXT_KEY];
    const delegatedSubset = (request[REQUEST_DELEGATION_CONTEXT_KEY]
      ?.permissionSubset ?? []) as string[];
    const permissionsToEvaluate = hasDelegationContext
      ? effectivePermissions.filter((permission) =>
          delegatedSubset.includes(permission),
        )
      : effectivePermissions;
    return contextPermissions.every((permission) =>
      permissionsToEvaluate.includes(permission),
    );
  }
}
