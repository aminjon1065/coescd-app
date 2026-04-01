import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ReportsService } from './reports.service';
import { ActiveUser } from '../../iam/decorators/active-user.decorator';
import type { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';
import { Permissions } from '../../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../../iam/authorization/permission.type';
import { IncidentsTrendQueryDto } from './dto/incidents-trend-query.dto';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { Role } from '../../users/enums/role.enum';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get overall system statistics' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStats() {
    return this.reportsService.getStats();
  }

  @Get('my-dashboard')
  @Permissions(Permission.DOCUMENTS_READ, Permission.TASKS_READ)
  @ApiOperation({ summary: 'Get personalised dashboard data for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getMyDashboard(@ActiveUser() actor: ActiveUserData) {
    return this.reportsService.getMyDashboard(actor);
  }

  @Get('incidents-trend')
  @Throttle({ heavy: { ttl: 60_000, limit: 10 } })
  @Roles(Role.Admin, Role.Analyst)
  @Permissions(Permission.ANALYTICS_READ)
  @ApiOperation({ summary: 'Get incident count trend over a date range' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getIncidentsTrend(@Query() query: IncidentsTrendQueryDto) {
    const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const from = query.fromDate ? new Date(query.fromDate) : defaultFrom;
    const to = query.toDate ? new Date(query.toDate) : new Date();
    return this.reportsService.getIncidentsTrend(from, to);
  }

  @Get('tasks-by-department')
  @Throttle({ heavy: { ttl: 60_000, limit: 10 } })
  @Roles(Role.Admin, Role.Analyst)
  @Permissions(Permission.ANALYTICS_READ)
  @ApiOperation({ summary: 'Get task counts grouped by department' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getTasksByDepartment() {
    return this.reportsService.getTasksByDepartment();
  }
}
