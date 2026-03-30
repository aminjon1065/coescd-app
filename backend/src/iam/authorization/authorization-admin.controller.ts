import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Roles } from './decorators/roles.decorator';
import { Role } from '../../users/enums/role.enum';
import { RolePermissionsService } from './role-permissions.service';
import { UpdateRolePermissionsMatrixDto } from './dto/update-role-permissions-matrix.dto';

@ApiTags('IAM - Authorization')
@ApiBearerAuth()
@Controller('iam/authorization')
export class AuthorizationAdminController {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  @ApiOperation({ summary: 'Get the role-permissions matrix (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns the current role-permissions matrix' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
  @Roles(Role.Admin)
  @Get('matrix')
  getMatrix() {
    return this.rolePermissionsService.getMatrix();
  }

  @ApiOperation({ summary: 'Update the role-permissions matrix (admin only)' })
  @ApiResponse({ status: 200, description: 'Matrix updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
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
