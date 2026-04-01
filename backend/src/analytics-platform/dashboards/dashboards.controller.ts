import { Body, Controller, Delete, Get, Param, Post, Patch, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../iam/authentication/guards/access-token/access-token.guard';
import { ActiveUser } from '../../iam/decorators/active-user.decorator';
import type { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';
import { DashboardsService } from './dashboards.service';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { Permissions } from '../../iam/authorization/decorators/permissions.decorator';
import { Role } from '../../users/enums/role.enum';
import { Permission } from '../../iam/authorization/permission.type';

@UseGuards(AccessTokenGuard)
@Roles(Role.Admin, Role.Analyst)
@Controller('analytics/dashboards')
export class DashboardsController {
  constructor(private readonly svc: DashboardsService) {}

  @Get()
  @Permissions(Permission.ANALYTICS_READ)
  findAll(@ActiveUser() user: ActiveUserData) {
    return this.svc.findAll(user.sub);
  }

  @Get(':id')
  @Permissions(Permission.ANALYTICS_READ)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @Permissions(Permission.ANALYTICS_WRITE)
  create(@Body() dto: any, @ActiveUser() user: ActiveUserData) {
    return this.svc.create(dto, user.sub);
  }

  @Patch(':id')
  @Permissions(Permission.ANALYTICS_WRITE)
  update(@Param('id') id: string, @Body() dto: any, @ActiveUser() user: ActiveUserData) {
    return this.svc.update(id, dto, user.sub);
  }

  @Delete(':id')
  @Permissions(Permission.ANALYTICS_WRITE)
  remove(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.svc.remove(id, user.sub);
  }
}
