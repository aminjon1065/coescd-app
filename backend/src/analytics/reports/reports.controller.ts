import { Controller, Get } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ActiveUser } from '../../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';
import { Permissions } from '../../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../../iam/authorization/permission.type';

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
}
