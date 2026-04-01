import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Permissions } from '../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../iam/authorization/permission.type';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import type { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { CreateEdmDocumentDto } from './dto/create-edm-document.dto';
import { UpdateEdmDocumentDto } from './dto/update-edm-document.dto';
import { GetEdmDocumentsQueryDto } from './dto/get-edm-documents-query.dto';
import {
  EdmOverrideDto,
  ExecuteEdmStageActionDto,
  SubmitEdmDocumentDto,
} from './dto/submit-edm-document.dto';
import { getRequestMeta } from '../common/http/request-meta.util';
import { GetEdmQueueQueryDto } from './dto/get-edm-queue-query.dto';
import {
  CreateRouteTemplateDto,
  GetRouteTemplatesQueryDto,
  UpdateRouteTemplateDto,
} from './dto/route-template.dto';
import {
  GetRegistrationJournalQueryDto,
  UpdateRegistrationStatusDto,
} from './dto/registration-journal.dto';
import { CreateResolutionTasksDto } from './dto/document-resolution-tasks.dto';
import { GetAlertsQueryDto } from './dto/alerts.dto';
import {
  CreateSavedFilterDto,
  GetSavedFiltersQueryDto,
  UpdateSavedFilterDto,
} from './dto/saved-filters.dto';
import {
  AssignDocumentResponsibleDto,
  CreateDocumentReplyDto,
  ForwardEdmDocumentDto,
} from './dto/document-history.dto';
import {
  GetDocumentAuditQueryDto,
  GetDocumentHistoryQueryDto,
} from './dto/document-audit-query.dto';
import {
  CreateDocumentKindDto,
  GetDocumentKindsQueryDto,
  UpdateDocumentKindDto,
} from './dto/document-kind.dto';
import {
  CreateDocumentTemplateDto,
  GetDocumentTemplatesQueryDto,
  UpdateDocumentTemplateDto,
} from './dto/document-template.dto';
import { EdmDashboardQueryDto, EdmReportsQueryDto } from './dto/reports.dto';
import { DocumentsFacade } from '../modules/documents/documents.facade';

@ApiTags('EDM')
@ApiBearerAuth()
@Controller('edm')
export class EdmController {
  constructor(private readonly documentsFacade: DocumentsFacade) {}

  @Post('document-kinds')
  @Permissions(Permission.DOCUMENTS_TEMPLATES_WRITE)
  @ApiOperation({ summary: 'Create a document kind' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  createDocumentKind(
    @Body() dto: CreateDocumentKindDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.createDocumentKind(dto, actor);
  }

  @Get('document-kinds')
  @Permissions(Permission.DOCUMENTS_TEMPLATES_READ)
  @ApiOperation({ summary: 'List document kinds' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  listDocumentKinds(@Query() query: GetDocumentKindsQueryDto) {
    return this.documentsFacade.edm.listDocumentKinds(query);
  }

  @Get('document-kinds/:id')
  @Permissions(Permission.DOCUMENTS_TEMPLATES_READ)
  @ApiOperation({ summary: 'Find a document kind by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findDocumentKind(@Param('id', ParseIntPipe) id: number) {
    return this.documentsFacade.edm.findDocumentKind(id);
  }

  @Patch('document-kinds/:id')
  @Permissions(Permission.DOCUMENTS_TEMPLATES_WRITE)
  @ApiOperation({ summary: 'Update a document kind' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  updateDocumentKind(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentKindDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.updateDocumentKind(id, dto, actor);
  }

  @Delete('document-kinds/:id')
  @Permissions(Permission.DOCUMENTS_TEMPLATES_WRITE)
  @ApiOperation({ summary: 'Delete a document kind' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async deleteDocumentKind(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    await this.documentsFacade.edm.deleteDocumentKind(id, actor);
    return { deleted: true };
  }

  @Post('document-templates')
  @Permissions(Permission.DOCUMENTS_TEMPLATES_WRITE)
  @ApiOperation({ summary: 'Create a document template' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  createDocumentTemplate(
    @Body() dto: CreateDocumentTemplateDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.createDocumentTemplate(dto, actor);
  }

  @Get('document-templates')
  @Permissions(Permission.DOCUMENTS_TEMPLATES_READ)
  @ApiOperation({ summary: 'List document templates' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  listDocumentTemplates(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetDocumentTemplatesQueryDto,
  ) {
    return this.documentsFacade.edm.listDocumentTemplates(actor, query);
  }

  @Get('document-templates/:id')
  @Permissions(Permission.DOCUMENTS_TEMPLATES_READ)
  @ApiOperation({ summary: 'Find a document template by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findDocumentTemplate(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.findDocumentTemplate(id, actor);
  }

  @Patch('document-templates/:id')
  @Permissions(Permission.DOCUMENTS_TEMPLATES_WRITE)
  @ApiOperation({ summary: 'Update a document template' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  updateDocumentTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentTemplateDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.updateDocumentTemplate(id, dto, actor);
  }

  @Delete('document-templates/:id')
  @Permissions(Permission.DOCUMENTS_TEMPLATES_WRITE)
  @ApiOperation({ summary: 'Delete a document template' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async deleteDocumentTemplate(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    await this.documentsFacade.edm.deleteDocumentTemplate(id, actor);
    return { deleted: true };
  }

  @Post('route-templates')
  @Permissions(Permission.DOCUMENTS_ROUTE_TEMPLATES_WRITE)
  @ApiOperation({ summary: 'Create a route template' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  createRouteTemplate(
    @Body() dto: CreateRouteTemplateDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.createRouteTemplate(dto, actor);
  }

  @Get('route-templates')
  @Permissions(Permission.DOCUMENTS_ROUTE_TEMPLATES_READ)
  @ApiOperation({ summary: 'List route templates' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  listRouteTemplates(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetRouteTemplatesQueryDto,
  ) {
    return this.documentsFacade.edm.listRouteTemplates(actor, query);
  }

  @Get('route-templates/:id')
  @Permissions(Permission.DOCUMENTS_ROUTE_TEMPLATES_READ)
  @ApiOperation({ summary: 'Find a route template by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findRouteTemplate(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.findRouteTemplate(id, actor);
  }

  @Patch('route-templates/:id')
  @Permissions(Permission.DOCUMENTS_ROUTE_TEMPLATES_WRITE)
  @ApiOperation({ summary: 'Update a route template' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  updateRouteTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRouteTemplateDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.updateRouteTemplate(id, dto, actor);
  }

  @Delete('route-templates/:id')
  @Permissions(Permission.DOCUMENTS_ROUTE_TEMPLATES_WRITE)
  @ApiOperation({ summary: 'Delete a route template' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async deleteRouteTemplate(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    await this.documentsFacade.edm.deleteRouteTemplate(id, actor);
    return { deleted: true };
  }

  @Post('documents/:id/register')
  @Permissions(Permission.DOCUMENTS_REGISTER)
  @ApiOperation({ summary: 'Register a document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  registerDocument(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.registerDocument(id, actor);
  }

  @Patch('documents/:id/registration-status')
  @Permissions(Permission.DOCUMENTS_REGISTER)
  @ApiOperation({ summary: 'Update document registration status' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  updateRegistrationStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRegistrationStatusDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.updateRegistrationStatus(id, dto, actor);
  }

  @Get('registration-journal')
  @Permissions(Permission.DOCUMENTS_REGISTER)
  @ApiOperation({ summary: 'List registration journal' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  listRegistrationJournal(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetRegistrationJournalQueryDto,
  ) {
    return this.documentsFacade.edm.listRegistrationJournal(actor, query);
  }

  @Post('documents/:id/resolution-tasks')
  @Permissions(Permission.DOCUMENTS_UPDATE, Permission.TASKS_CREATE)
  @ApiOperation({ summary: 'Create resolution tasks for a document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  createResolutionTasks(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateResolutionTasksDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.createResolutionTasks(id, dto, actor);
  }

  @Get('documents/:id/tasks')
  @Permissions(Permission.DOCUMENTS_READ, Permission.TASKS_READ)
  @ApiOperation({ summary: 'List tasks for a document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  listDocumentTasks(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.listDocumentTasks(id, actor);
  }

  @Get('documents/:id/task-progress')
  @Permissions(Permission.DOCUMENTS_READ, Permission.TASKS_READ)
  @ApiOperation({ summary: 'Get task progress for a document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  getDocumentTaskProgress(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.getDocumentTaskProgress(id, actor);
  }

  @Post('alerts/process')
  @Permissions(Permission.DOCUMENTS_ALERTS_MANAGE)
  @ApiOperation({ summary: 'Process deadline alerts' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  processDeadlineAlerts(@ActiveUser() actor: ActiveUserData) {
    return this.documentsFacade.edm.processDeadlineAlerts(actor);
  }

  @Get('alerts/my')
  @Permissions(Permission.DOCUMENTS_ALERTS_READ)
  @ApiOperation({ summary: 'List my alerts' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  listMyAlerts(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetAlertsQueryDto,
  ) {
    return this.documentsFacade.edm.listMyAlerts(actor, query);
  }

  @Patch('alerts/:id/ack')
  @Permissions(Permission.DOCUMENTS_ALERTS_READ)
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  acknowledgeAlert(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.acknowledgeAlert(id, actor);
  }

  @Post('saved-filters')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'Create a saved filter' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  createSavedFilter(
    @Body() dto: CreateSavedFilterDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.createSavedFilter(dto, actor);
  }

  @Get('saved-filters')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'List saved filters' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  listSavedFilters(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetSavedFiltersQueryDto,
  ) {
    return this.documentsFacade.edm.listSavedFilters(actor, query);
  }

  @Patch('saved-filters/:id')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'Update a saved filter' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  updateSavedFilter(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSavedFilterDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.updateSavedFilter(id, dto, actor);
  }

  @Delete('saved-filters/:id')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'Delete a saved filter' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async deleteSavedFilter(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    await this.documentsFacade.edm.deleteSavedFilter(id, actor);
    return { deleted: true };
  }

  @Get('reports/sla')
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Get SLA report' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getSlaReport(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: EdmReportsQueryDto,
  ) {
    return this.documentsFacade.edm.getSlaReport(actor, query);
  }

  @Get('reports/sla/export')
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Export SLA report as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file stream' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async exportSlaReportCsv(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: EdmReportsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileName = `edm-sla-report-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return this.documentsFacade.edm.exportSlaReportCsv(actor, query);
  }

  @Get('reports/sla/export/xlsx')
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Export SLA report as XLSX' })
  @ApiResponse({ status: 200, description: 'XLSX file stream' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async exportSlaReportXlsx(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: EdmReportsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileName = `edm-sla-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return this.documentsFacade.edm.exportSlaReportXlsx(actor, query);
  }

  @Get('reports/overdue')
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Get overdue report' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getOverdueReport(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: EdmReportsQueryDto,
  ) {
    return this.documentsFacade.edm.getOverdueReport(actor, query);
  }

  @Get('reports/overdue/export')
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Export overdue report as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file stream' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async exportOverdueReportCsv(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: EdmReportsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileName = `edm-overdue-report-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return this.documentsFacade.edm.exportOverdueReportCsv(actor, query);
  }

  @Get('reports/overdue/export/xlsx')
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Export overdue report as XLSX' })
  @ApiResponse({ status: 200, description: 'XLSX file stream' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async exportOverdueReportXlsx(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: EdmReportsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileName = `edm-overdue-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return this.documentsFacade.edm.exportOverdueReportXlsx(actor, query);
  }

  @Get('reports/workload')
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Get workload report' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getWorkloadReport(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: EdmReportsQueryDto,
  ) {
    return this.documentsFacade.edm.getWorkloadReport(actor, query);
  }

  @Get('reports/workload/export')
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Export workload report as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file stream' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async exportWorkloadReportCsv(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: EdmReportsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileName = `edm-workload-report-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return this.documentsFacade.edm.exportWorkloadReportCsv(actor, query);
  }

  @Get('reports/workload/export/xlsx')
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Export workload report as XLSX' })
  @ApiResponse({ status: 200, description: 'XLSX file stream' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async exportWorkloadReportXlsx(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: EdmReportsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileName = `edm-workload-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return this.documentsFacade.edm.exportWorkloadReportXlsx(actor, query);
  }

  @Get('reports/dashboard')
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Get dashboard summary' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getDashboardSummary(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: EdmDashboardQueryDto,
  ) {
    return this.documentsFacade.edm.getDashboardSummary(actor, query);
  }

  @Post('documents')
  @Permissions(Permission.DOCUMENTS_CREATE)
  @ApiOperation({ summary: 'Create a document draft' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  createDraft(
    @Body() dto: CreateEdmDocumentDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.createDraft(dto, actor);
  }

  @Patch('documents/:id')
  @Permissions(Permission.DOCUMENTS_UPDATE)
  @ApiOperation({ summary: 'Update a document draft' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  updateDraft(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEdmDocumentDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.updateDraft(id, dto, actor);
  }

  @Post('documents/:id/submit')
  @Permissions(Permission.DOCUMENTS_UPDATE)
  @ApiOperation({ summary: 'Submit a document to route' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  submitToRoute(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitEdmDocumentDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.submitToRoute(id, dto, actor);
  }

  @Post('documents/:id/stages/:stageId/actions')
  @Permissions(Permission.DOCUMENTS_ROUTE_EXECUTE)
  @ApiOperation({ summary: 'Execute a stage action on a document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'stageId', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  executeStageAction(
    @Param('id', ParseIntPipe) id: number,
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() dto: ExecuteEdmStageActionDto,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.documentsFacade.edm.executeStageAction(
      id,
      stageId,
      dto,
      actor,
      getRequestMeta(request),
    );
  }

  @Post('documents/:id/override')
  @Permissions(Permission.DOCUMENTS_ROUTE_EXECUTE)
  @ApiOperation({ summary: 'Override document route outcome' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  override(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EdmOverrideDto,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.documentsFacade.edm.override(
      id,
      dto,
      actor,
      getRequestMeta(request),
    );
  }

  @Post('documents/:id/archive')
  @Permissions(Permission.DOCUMENTS_ARCHIVE)
  @ApiOperation({ summary: 'Archive a document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  archive(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.archive(id, actor);
  }

  @Get('documents')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'List all documents' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetEdmDocumentsQueryDto,
  ) {
    return this.documentsFacade.edm.findAll(actor, query);
  }

  @Get('documents/:id')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'Find a document by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.findOne(id, actor);
  }

  @Get('queues/inbox')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'List inbox queue' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  inbox(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetEdmQueueQueryDto,
  ) {
    return this.documentsFacade.edm.listQueue('inbox', actor, query);
  }

  @Get('queues/outbox')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'List outbox queue' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  outbox(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetEdmQueueQueryDto,
  ) {
    return this.documentsFacade.edm.listQueue('outbox', actor, query);
  }

  @Get('queues/my-approvals')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'List my approvals queue' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  myApprovals(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetEdmQueueQueryDto,
  ) {
    return this.documentsFacade.edm.listQueue('my-approvals', actor, query);
  }

  @Get('mailboxes/incoming')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'List incoming mailbox' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  incomingMailbox(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetEdmQueueQueryDto,
  ) {
    return this.documentsFacade.edm.listMailbox('incoming', actor, query);
  }

  @Get('mailboxes/outgoing')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'List outgoing mailbox' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  outgoingMailbox(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetEdmQueueQueryDto,
  ) {
    return this.documentsFacade.edm.listMailbox('outgoing', actor, query);
  }

  @Get('documents/:id/route')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'Get document route details' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findRoute(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.findRoute(id, actor);
  }

  @Get('documents/:id/audit')
  @Permissions(Permission.DOCUMENTS_AUDIT_READ)
  @ApiOperation({ summary: 'Get document audit log' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findAudit(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetDocumentAuditQueryDto,
  ) {
    return this.documentsFacade.edm.findAudit(id, actor, query);
  }

  @Get('documents/:id/audit/export')
  @Permissions(Permission.DOCUMENTS_AUDIT_READ)
  @ApiOperation({ summary: 'Export document audit log as CSV' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'CSV file stream' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async exportAuditCsv(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetDocumentAuditQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileName = `edm-document-${id}-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return this.documentsFacade.edm.exportDocumentAuditCsv(id, actor, query);
  }

  @Get('documents/:id/audit/export/xlsx')
  @Permissions(Permission.DOCUMENTS_AUDIT_READ)
  @ApiOperation({ summary: 'Export document audit log as XLSX' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'XLSX file stream' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async exportAuditXlsx(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetDocumentAuditQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileName = `edm-document-${id}-audit-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return this.documentsFacade.edm.exportDocumentAuditXlsx(id, actor, query);
  }

  @Get('documents/:id/history')
  @Permissions(Permission.DOCUMENTS_AUDIT_READ)
  @ApiOperation({ summary: 'Get document history' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findHistory(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetDocumentHistoryQueryDto,
  ) {
    return this.documentsFacade.edm.findHistory(id, actor, query);
  }

  @Get('documents/:id/history/export')
  @Permissions(Permission.DOCUMENTS_AUDIT_READ)
  @ApiOperation({ summary: 'Export document history as CSV' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'CSV file stream' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async exportHistoryCsv(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetDocumentHistoryQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileName = `edm-document-${id}-history-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return this.documentsFacade.edm.exportDocumentHistoryCsv(id, actor, query);
  }

  @Get('documents/:id/history/export/xlsx')
  @Permissions(Permission.DOCUMENTS_AUDIT_READ)
  @ApiOperation({ summary: 'Export document history as XLSX' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'XLSX file stream' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async exportHistoryXlsx(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetDocumentHistoryQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileName = `edm-document-${id}-history-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return this.documentsFacade.edm.exportDocumentHistoryXlsx(id, actor, query);
  }

  @Post('documents/:id/forward')
  @Permissions(Permission.DOCUMENTS_ROUTE_EXECUTE)
  @ApiOperation({ summary: 'Forward a document to another user' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  forwardDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ForwardEdmDocumentDto,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.documentsFacade.edm.forwardDocument(
      id,
      dto,
      actor,
      getRequestMeta(request),
    );
  }

  @Post('documents/:id/responsible')
  @Permissions(Permission.DOCUMENTS_UPDATE)
  @ApiOperation({ summary: 'Assign responsible user to a document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  assignResponsible(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignDocumentResponsibleDto,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.documentsFacade.edm.assignResponsible(
      id,
      dto,
      actor,
      getRequestMeta(request),
    );
  }

  @Post('documents/:id/replies')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'Create a reply on a document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  createReply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDocumentReplyDto,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.documentsFacade.edm.createReply(
      id,
      dto,
      actor,
      getRequestMeta(request),
    );
  }

  @Get('documents/:id/replies')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'List replies on a document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  listReplies(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.listReplies(id, actor);
  }

  @Get('documents/:id/files')
  @Permissions(Permission.DOCUMENTS_READ, Permission.FILES_READ)
  @ApiOperation({ summary: 'List files attached to a document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findFiles(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.documentsFacade.edm.findFiles(id, actor);
  }

  @Post('documents/:id/files/:fileId')
  @Permissions(Permission.DOCUMENTS_UPDATE, Permission.FILES_WRITE)
  @ApiOperation({ summary: 'Link a file to a document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'fileId', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  linkFile(
    @Param('id', ParseIntPipe) id: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.documentsFacade.edm.linkFile(
      id,
      fileId,
      actor,
      getRequestMeta(request),
    );
  }

  @Delete('documents/:id/files/:fileId')
  @Permissions(Permission.DOCUMENTS_UPDATE, Permission.FILES_WRITE)
  @ApiOperation({ summary: 'Unlink a file from a document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'fileId', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  unlinkFile(
    @Param('id', ParseIntPipe) id: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.documentsFacade.edm.unlinkFile(
      id,
      fileId,
      actor,
      getRequestMeta(request),
    );
  }
}
