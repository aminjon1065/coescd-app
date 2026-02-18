import { Body, Controller, Get, Put } from '@nestjs/common';
import { Roles } from './decorators/roles.decorator';
import { Role } from '../../users/enums/role.enum';
import { RolePermissionsService } from './role-permissions.service';
import { UpdateRolePermissionsMatrixDto } from './dto/update-role-permissions-matrix.dto';

@Controller('iam/authorization')
export class AuthorizationAdminController {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  @Roles(Role.Admin)
  @Get('matrix')
  getMatrix() {
    return this.rolePermissionsService.getMatrix();
  }

  @Roles(Role.Admin)
  @Put('matrix')
  async updateMatrix(@Body() dto: UpdateRolePermissionsMatrixDto) {
    const rolePermissions = await this.rolePermissionsService.updateMatrix(
      dto.rolePermissions,
    );
    return {
      permissions: this.rolePermissionsService.getMatrix().permissions,
      rolePermissions,
    };
  }
}
