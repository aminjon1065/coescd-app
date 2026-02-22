import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ActiveUser } from '../../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';
import { Permissions } from '../../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../../iam/authorization/permission.type';
import { IncidentsTrendQueryDto } from './dto/incidents-trend-query.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('stats')
  getStats() {
    return this.reportsService.getStats();
  }

  @Get('my-dashboard')
  @Permissions(Permission.DOCUMENTS_READ, Permission.TASKS_READ)
  getMyDashboard(@ActiveUser() actor: ActiveUserData) {
    return this.reportsService.getMyDashboard(actor);
  }

  @Get('incidents-trend')
  @Permissions(Permission.ANALYTICS_READ)
  getIncidentsTrend(@Query() query: IncidentsTrendQueryDto) {
    const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const from = query.fromDate ? new Date(query.fromDate) : defaultFrom;
    const to = query.toDate ? new Date(query.toDate) : new Date();
    return this.reportsService.getIncidentsTrend(from, to);
  }

  @Get('tasks-by-department')
  @Permissions(Permission.ANALYTICS_READ)
  getTasksByDepartment() {
    return this.reportsService.getTasksByDepartment();
  }
}
