import { Body, Controller, ForbiddenException, Get, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../iam/authentication/guards/access-token/access-token.guard';
import { ActiveUser } from '../../iam/decorators/active-user.decorator';
import type { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';
import { ExplorerService } from './explorer.service';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { Permissions } from '../../iam/authorization/decorators/permissions.decorator';
import { Role } from '../../users/enums/role.enum';
import { Permission } from '../../iam/authorization/permission.type';

@UseGuards(AccessTokenGuard)
@Roles(Role.Admin, Role.Analyst)
@Controller('analytics/explorer')
export class ExplorerController {
  constructor(private readonly svc: ExplorerService) {}

  @Get('tables')
  @Permissions(Permission.ANALYTICS_READ)
  getAllowedTables() {
    return this.svc.getAllowedTables();
  }

  @Post('query')
  @Permissions(Permission.ANALYTICS_READ)
  async query(
    @Body() body: { mode: 'sql' | 'builder'; sql?: string; builder?: any; params?: unknown[] },
    @ActiveUser() user: ActiveUserData,
  ) {
    if (body.mode === 'sql') {
      if (![Role.Admin, Role.Analyst].includes(user.role)) {
        throw new ForbiddenException('Raw SQL access requires analyst role');
      }
      return this.svc.execute(body.sql!, body.params ?? [], true);
    }

    const sql = this.svc.buildSql(body.builder);
    const filterValues = (body.builder?.filters ?? []).map((f: any) => f.value);
    return this.svc.execute(sql, filterValues, false);
  }
}
