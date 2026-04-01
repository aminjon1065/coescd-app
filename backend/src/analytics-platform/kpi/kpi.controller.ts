import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../iam/authentication/guards/access-token/access-token.guard';
import { KpiService } from './kpi.service';
import { KpiQueryDto, KpiHistoryDto } from './dto/kpi.dto';

@UseGuards(AccessTokenGuard)
@Controller('analytics/kpi')
export class KpiController {
  constructor(private readonly kpi: KpiService) {}

  @Get()
  listDefinitions() {
    return this.kpi.listDefinitions();
  }

  @Get('all/values')
  getAllValues(@Query() q: KpiQueryDto) {
    return this.kpi.evaluateAll({ scopeType: q.scope_type, scopeValue: q.scope_value });
  }

  @Get(':code/value')
  getValue(@Param('code') code: string, @Query() q: KpiQueryDto) {
    return this.kpi.evaluate(code, { scopeType: q.scope_type, scopeValue: q.scope_value });
  }

  @Get(':code/history')
  getHistory(@Param('code') code: string, @Query() q: KpiHistoryDto) {
    return this.kpi.getHistory(
      code,
      { scopeType: q.scope_type, scopeValue: q.scope_value },
      q.from ? new Date(q.from) : undefined,
      q.to ? new Date(q.to) : undefined,
    );
  }
}
