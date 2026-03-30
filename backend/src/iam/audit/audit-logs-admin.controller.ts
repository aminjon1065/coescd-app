import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Roles } from '../authorization/decorators/roles.decorator';
import { Role } from '../../users/enums/role.enum';
import { AuditLogsAdminService } from './audit-logs-admin.service';
import { GetAuditLogsQueryDto } from './dto/get-audit-logs-query.dto';

@ApiTags('IAM - Audit')
@ApiBearerAuth()
@Controller('iam/audit-logs')
export class AuditLogsAdminController {
  constructor(private readonly auditLogsAdminService: AuditLogsAdminService) {}

  @ApiOperation({ summary: 'Get paginated audit logs (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns paginated audit log entries' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
  @Roles(Role.Admin)
  @Get()
  getLogs(@Query() query: GetAuditLogsQueryDto) {
    return this.auditLogsAdminService.getLogs(query);
  }
}
