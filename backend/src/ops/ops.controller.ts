import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { OpsService } from './ops.service';
import { GetOpsMetricsQueryDto } from './dto/get-ops-metrics-query.dto';

@Controller('ops')
export class OpsController {
  constructor(private readonly opsService: OpsService) {}

  @Roles(Role.Admin)
  @Get('metrics')
  getMetrics(@Query() query: GetOpsMetricsQueryDto) {
    return this.opsService.getMetrics({
      windowMinutes: query.windowMinutes,
      authFailureThreshold: query.authFailureThreshold,
    });
  }
}

