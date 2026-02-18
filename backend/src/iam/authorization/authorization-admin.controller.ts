import { Controller, Get } from '@nestjs/common';
import { Roles } from './decorators/roles.decorator';
import { Role } from '../../users/enums/role.enum';
import { Permission } from './permission.type';
import { ROLE_PERMISSIONS } from './role-permissions.map';

@Controller('iam/authorization')
export class AuthorizationAdminController {
  @Roles(Role.Admin)
  @Get('matrix')
  getMatrix() {
    return {
      permissions: Object.values(Permission),
      rolePermissions: ROLE_PERMISSIONS,
    };
  }
}
