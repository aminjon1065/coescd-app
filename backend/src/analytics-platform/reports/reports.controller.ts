import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../iam/authentication/guards/access-token/access-token.guard';
import { ActiveUser } from '../../iam/decorators/active-user.decorator';
import type { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';
import { ReportsService } from './reports.service';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { Permissions } from '../../iam/authorization/decorators/permissions.decorator';
import { Role } from '../../users/enums/role.enum';
import { Permission } from '../../iam/authorization/permission.type';

@UseGuards(AccessTokenGuard)
@Roles(Role.Admin, Role.Analyst)
@Controller('analytics/reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

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
  @Permissions(Permission.REPORTS_GENERATE)
  request(@Body() dto: any, @ActiveUser() user: ActiveUserData) {
    return this.svc.request(dto, user.sub);
  }

  @Get(':id/download')
  @Permissions(Permission.ANALYTICS_READ)
  getDownloadUrl(@Param('id') id: string) {
    return this.svc.getDownloadUrl(id);
  }
}
