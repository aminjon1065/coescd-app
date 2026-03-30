import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { OpsService } from './ops.service';
import { GetOpsMetricsQueryDto } from './dto/get-ops-metrics-query.dto';
import { Auth } from '../iam/authentication/decorators/auth.decorators';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';

@ApiTags('Ops')
@Controller('ops')
export class OpsController {
  constructor(private readonly opsService: OpsService) {}

  @ApiOperation({ summary: 'Liveness health check' })
  @ApiResponse({ status: 200, description: 'Success' })
  @Auth(AuthType.None)
  @Get('health/live')
  getLiveness() {
    return this.opsService.getLiveness();
  }

  @ApiOperation({ summary: 'Readiness health check' })
  @ApiResponse({ status: 200, description: 'Success' })
  @Auth(AuthType.None)
  @Get('health/ready')
  getReadiness() {
    return this.opsService.getReadiness();
  }

  @ApiOperation({ summary: 'Get application metrics (admin only)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Roles(Role.Admin)
  @Get('metrics')
  getMetrics(@Query() query: GetOpsMetricsQueryDto) {
    return this.opsService.getMetrics({
      windowMinutes: query.windowMinutes,
      authFailureThreshold: query.authFailureThreshold,
    });
  }

  @ApiOperation({ summary: 'Get backup status (admin only)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Roles(Role.Admin)
  @Get('backup/status')
  getBackupStatus() {
    return this.opsService.getBackupStatus();
  }
}
