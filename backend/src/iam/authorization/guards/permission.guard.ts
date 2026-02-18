import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { ActiveUserData } from '../../interfaces/activate-user-data.interface';
import { REQUEST_USER_KEY } from '../../iam.constants';
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
    const user: ActiveUserData = context.switchToHttp().getRequest()[
      REQUEST_USER_KEY
    ];
    const effectivePermissions = this.rolePermissionsService.resolveUserPermissions(
      user.role,
      user.permissions,
    );
    return contextPermissions.every((permission) =>
      effectivePermissions.includes(permission),
    );
  }
}
