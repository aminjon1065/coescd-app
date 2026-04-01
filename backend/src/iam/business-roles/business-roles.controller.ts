import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { Permission } from '../authorization/permission.type';
import { BusinessRolesService } from './business-roles.service';

@ApiTags('Business Roles')
@ApiBearerAuth()
@Controller('business-roles')
export class BusinessRolesController {
  constructor(private readonly businessRolesService: BusinessRolesService) {}

  @ApiOperation({ summary: 'Get active business roles' })
  @ApiResponse({ status: 200, description: 'Returns list of business roles' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Permissions(Permission.USERS_READ)
  @Get()
  findAll() {
    return this.businessRolesService.findAll();
  }

  @ApiOperation({ summary: 'Get business role by code' })
  @ApiParam({ name: 'code', type: String })
  @ApiResponse({ status: 200, description: 'Returns business role' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Business role not found' })
  @Permissions(Permission.USERS_READ)
  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.businessRolesService.findOne(code);
  }
}
