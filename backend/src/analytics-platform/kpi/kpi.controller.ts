import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../iam/authentication/guards/access-token/access-token.guard';
import { KpiService } from './kpi.service';
import { KpiQueryDto, KpiHistoryDto } from './dto/kpi.dto';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { Permissions } from '../../iam/authorization/decorators/permissions.decorator';
import { Role } from '../../users/enums/role.enum';
import { Permission } from '../../iam/authorization/permission.type';

@UseGuards(AccessTokenGuard)
@Roles(Role.Admin, Role.Analyst)
@Controller('analytics/kpi')
export class KpiController {
  constructor(private readonly kpi: KpiService) {}

  @Get()
  @Permissions(Permission.ANALYTICS_READ)
  listDefinitions() {
    return this.kpi.listDefinitions();
  }

  @Get('all/values')
  @Permissions(Permission.ANALYTICS_READ)
  getAllValues(@Query() q: KpiQueryDto) {
    return this.kpi.evaluateAll({ scopeType: q.scope_type, scopeValue: q.scope_value });
  }

  @Get(':code/value')
  @Permissions(Permission.ANALYTICS_READ)
  getValue(@Param('code') code: string, @Query() q: KpiQueryDto) {
    return this.kpi.evaluate(code, { scopeType: q.scope_type, scopeValue: q.scope_value });
  }

  @Get(':code/history')
  @Permissions(Permission.ANALYTICS_READ)
  getHistory(@Param('code') code: string, @Query() q: KpiHistoryDto) {
    return this.kpi.getHistory(
      code,
      { scopeType: q.scope_type, scopeValue: q.scope_value },
      q.from ? new Date(q.from) : undefined,
      q.to ? new Date(q.to) : undefined,
    );
  }
}
