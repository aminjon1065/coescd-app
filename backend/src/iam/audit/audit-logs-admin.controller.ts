import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../authorization/decorators/roles.decorator';
import { Role } from '../../users/enums/role.enum';
import { AuditLogsAdminService } from './audit-logs-admin.service';
import { GetAuditLogsQueryDto } from './dto/get-audit-logs-query.dto';

@Controller('iam/audit-logs')
export class AuditLogsAdminController {
  constructor(private readonly auditLogsAdminService: AuditLogsAdminService) {}

  @Roles(Role.Admin)
  @Get()
  getLogs(@Query() query: GetAuditLogsQueryDto) {
    return this.auditLogsAdminService.getLogs(query);
  }
}
