import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { OpsService } from './ops.service';
import { GetOpsMetricsQueryDto } from './dto/get-ops-metrics-query.dto';
import { Auth } from '../iam/authentication/decorators/auth.decorators';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';

@Controller('ops')
export class OpsController {
  constructor(private readonly opsService: OpsService) {}

  @Auth(AuthType.None)
  @Get('health/live')
  getLiveness() {
    return this.opsService.getLiveness();
  }

  @Auth(AuthType.None)
  @Get('health/ready')
  getReadiness() {
    return this.opsService.getReadiness();
  }

  @Roles(Role.Admin)
  @Get('metrics')
  getMetrics(@Query() query: GetOpsMetricsQueryDto) {
    return this.opsService.getMetrics({
      windowMinutes: query.windowMinutes,
      authFailureThreshold: query.authFailureThreshold,
    });
  }

  @Roles(Role.Admin)
  @Get('backup/status')
  getBackupStatus() {
    return this.opsService.getBackupStatus();
  }
}
