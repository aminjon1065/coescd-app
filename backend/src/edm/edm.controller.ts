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
import { EdmService } from './edm.service';
import { Permissions } from '../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../iam/authorization/permission.type';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
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
  CreateDocumentTemplateDto,
  GetDocumentTemplatesQueryDto,
  UpdateDocumentTemplateDto,
} from './dto/document-template.dto';
import { EdmDashboardQueryDto, EdmReportsQueryDto } from './dto/reports.dto';

@Controller('edm')
export class EdmController {
  constructor(private readonly edmService: EdmService) {}

  @Post('document-templates')
  @Permissions(Permission.DOCUMENTS_TEMPLATES_WRITE)
  createDocumentTemplate(
    @Body() dto: CreateDocumentTemplateDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.createDocumentTemplate(dto, actor);
  }

  @Get('document-templates')
  @Permissions(Permission.DOCUMENTS_TEMPLATES_READ)
  listDocumentTemplates(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetDocumentTemplatesQueryDto,
  ) {
    return this.edmService.listDocumentTemplates(actor, query);
  }

  @Get('document-templates/:id')
  @Permissions(Permission.DOCUMENTS_TEMPLATES_READ)
  findDocumentTemplate(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.findDocumentTemplate(id, actor);
  }

  @Patch('document-templates/:id')
  @Permissions(Permission.DOCUMENTS_TEMPLATES_WRITE)
  updateDocumentTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentTemplateDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.updateDocumentTemplate(id, dto, actor);
  }

  @Delete('document-templates/:id')
  @Permissions(Permission.DOCUMENTS_TEMPLATES_WRITE)
  async deleteDocumentTemplate(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    await this.edmService.deleteDocumentTemplate(id, actor);
    return { deleted: true };
  }

  @Post('route-templates')
  @Permissions(Permission.DOCUMENTS_ROUTE_TEMPLATES_WRITE)
  createRouteTemplate(
    @Body() dto: CreateRouteTemplateDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.createRouteTemplate(dto, actor);
  }

  @Get('route-templates')
  @Permissions(Permission.DOCUMENTS_ROUTE_TEMPLATES_READ)
  listRouteTemplates(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetRouteTemplatesQueryDto,
  ) {
    return this.edmService.listRouteTemplates(actor, query);
  }

  @Get('route-templates/:id')
  @Permissions(Permission.DOCUMENTS_ROUTE_TEMPLATES_READ)
  findRouteTemplate(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.findRouteTemplate(id, actor);
  }

  @Patch('route-templates/:id')
  @Permissions(Permission.DOCUMENTS_ROUTE_TEMPLATES_WRITE)
  updateRouteTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRouteTemplateDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.updateRouteTemplate(id, dto, actor);
  }

  @Delete('route-templates/:id')
  @Permissions(Permission.DOCUMENTS_ROUTE_TEMPLATES_WRITE)
  async deleteRouteTemplate(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    await this.edmService.deleteRouteTemplate(id, actor);
    return { deleted: true };
  }

  @Post('documents/:id/register')
  @Permissions(Permission.DOCUMENTS_REGISTER)
  registerDocument(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.registerDocument(id, actor);
  }

  @Patch('documents/:id/registration-status')
  @Permissions(Permission.DOCUMENTS_REGISTER)
  updateRegistrationStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRegistrationStatusDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.updateRegistrationStatus(id, dto, actor);
  }

  @Get('registration-journal')
  @Permissions(Permission.DOCUMENTS_REGISTER)
  listRegistrationJournal(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetRegistrationJournalQueryDto,
  ) {
    return this.edmService.listRegistrationJournal(actor, query);
  }

  @Post('documents/:id/resolution-tasks')
  @Permissions(Permission.DOCUMENTS_UPDATE, Permission.TASKS_CREATE)
  createResolutionTasks(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateResolutionTasksDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.createResolutionTasks(id, dto, actor);
  }

  @Get('documents/:id/tasks')
  @Permissions(Permission.DOCUMENTS_READ, Permission.TASKS_READ)
  listDocumentTasks(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.listDocumentTasks(id, actor);
  }

  @Get('documents/:id/task-progress')
  @Permissions(Permission.DOCUMENTS_READ, Permission.TASKS_READ)
  getDocumentTaskProgress(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.getDocumentTaskProgress(id, actor);
  }

  @Post('alerts/process')
  @Permissions(Permission.DOCUMENTS_ALERTS_MANAGE)
  processDeadlineAlerts(@ActiveUser() actor: ActiveUserData) {
    return this.edmService.processDeadlineAlerts(actor);
  }

  @Get('alerts/my')
  @Permissions(Permission.DOCUMENTS_ALERTS_READ)
  listMyAlerts(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetAlertsQueryDto,
  ) {
    return this.edmService.listMyAlerts(actor, query);
  }

  @Patch('alerts/:id/ack')
  @Permissions(Permission.DOCUMENTS_ALERTS_READ)
  acknowledgeAlert(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.acknowledgeAlert(id, actor);
  }

  @Post('saved-filters')
  @Permissions(Permission.DOCUMENTS_READ)
  createSavedFilter(
    @Body() dto: CreateSavedFilterDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.createSavedFilter(dto, actor);
  }

  @Get('saved-filters')
  @Permissions(Permission.DOCUMENTS_READ)
  listSavedFilters(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetSavedFiltersQueryDto,
  ) {
    return this.edmService.listSavedFilters(actor, query);
  }

  @Patch('saved-filters/:id')
  @Permissions(Permission.DOCUMENTS_READ)
  updateSavedFilter(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSavedFilterDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.updateSavedFilter(id, dto, actor);
  }

  @Delete('saved-filters/:id')
  @Permissions(Permission.DOCUMENTS_READ)
  async deleteSavedFilter(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    await this.edmService.deleteSavedFilter(id, actor);
    return { deleted: true };
  }

  @Get('reports/sla')
  @Permissions(Permission.REPORTS_READ)
  getSlaReport(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: EdmReportsQueryDto,
  ) {
    return this.edmService.getSlaReport(actor, query);
  }

  @Get('reports/sla/export')
  @Permissions(Permission.REPORTS_READ)
  async exportSlaReportCsv(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: EdmReportsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileName = `edm-sla-report-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return this.edmService.exportSlaReportCsv(actor, query);
  }

  @Get('reports/sla/export/xlsx')
  @Permissions(Permission.REPORTS_READ)
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
    return this.edmService.exportSlaReportXlsx(actor, query);
  }

  @Get('reports/overdue')
  @Permissions(Permission.REPORTS_READ)
  getOverdueReport(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: EdmReportsQueryDto,
  ) {
    return this.edmService.getOverdueReport(actor, query);
  }

  @Get('reports/overdue/export')
  @Permissions(Permission.REPORTS_READ)
  async exportOverdueReportCsv(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: EdmReportsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileName = `edm-overdue-report-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return this.edmService.exportOverdueReportCsv(actor, query);
  }

  @Get('reports/overdue/export/xlsx')
  @Permissions(Permission.REPORTS_READ)
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
    return this.edmService.exportOverdueReportXlsx(actor, query);
  }

  @Get('reports/workload')
  @Permissions(Permission.REPORTS_READ)
  getWorkloadReport(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: EdmReportsQueryDto,
  ) {
    return this.edmService.getWorkloadReport(actor, query);
  }

  @Get('reports/workload/export')
  @Permissions(Permission.REPORTS_READ)
  async exportWorkloadReportCsv(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: EdmReportsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileName = `edm-workload-report-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return this.edmService.exportWorkloadReportCsv(actor, query);
  }

  @Get('reports/workload/export/xlsx')
  @Permissions(Permission.REPORTS_READ)
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
    return this.edmService.exportWorkloadReportXlsx(actor, query);
  }

  @Get('reports/dashboard')
  @Permissions(Permission.REPORTS_READ)
  getDashboardSummary(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: EdmDashboardQueryDto,
  ) {
    return this.edmService.getDashboardSummary(actor, query);
  }

  @Post('documents')
  @Permissions(Permission.DOCUMENTS_CREATE)
  createDraft(
    @Body() dto: CreateEdmDocumentDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.createDraft(dto, actor);
  }

  @Patch('documents/:id')
  @Permissions(Permission.DOCUMENTS_UPDATE)
  updateDraft(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEdmDocumentDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.updateDraft(id, dto, actor);
  }

  @Post('documents/:id/submit')
  @Permissions(Permission.DOCUMENTS_UPDATE)
  submitToRoute(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitEdmDocumentDto,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.submitToRoute(id, dto, actor);
  }

  @Post('documents/:id/stages/:stageId/actions')
  @Permissions(Permission.DOCUMENTS_ROUTE_EXECUTE)
  executeStageAction(
    @Param('id', ParseIntPipe) id: number,
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() dto: ExecuteEdmStageActionDto,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.edmService.executeStageAction(
      id,
      stageId,
      dto,
      actor,
      getRequestMeta(request),
    );
  }

  @Post('documents/:id/override')
  @Permissions(Permission.DOCUMENTS_ROUTE_EXECUTE)
  override(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EdmOverrideDto,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.edmService.override(id, dto, actor, getRequestMeta(request));
  }

  @Post('documents/:id/archive')
  @Permissions(Permission.DOCUMENTS_ARCHIVE)
  archive(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.archive(id, actor);
  }

  @Get('documents')
  @Permissions(Permission.DOCUMENTS_READ)
  findAll(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetEdmDocumentsQueryDto,
  ) {
    return this.edmService.findAll(actor, query);
  }

  @Get('documents/:id')
  @Permissions(Permission.DOCUMENTS_READ)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.findOne(id, actor);
  }

  @Get('queues/inbox')
  @Permissions(Permission.DOCUMENTS_READ)
  inbox(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetEdmQueueQueryDto,
  ) {
    return this.edmService.listQueue('inbox', actor, query);
  }

  @Get('queues/outbox')
  @Permissions(Permission.DOCUMENTS_READ)
  outbox(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetEdmQueueQueryDto,
  ) {
    return this.edmService.listQueue('outbox', actor, query);
  }

  @Get('queues/my-approvals')
  @Permissions(Permission.DOCUMENTS_READ)
  myApprovals(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetEdmQueueQueryDto,
  ) {
    return this.edmService.listQueue('my-approvals', actor, query);
  }

  @Get('documents/:id/route')
  @Permissions(Permission.DOCUMENTS_READ)
  findRoute(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.findRoute(id, actor);
  }

  @Get('documents/:id/audit')
  @Permissions(Permission.DOCUMENTS_AUDIT_READ)
  findAudit(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetDocumentAuditQueryDto,
  ) {
    return this.edmService.findAudit(id, actor, query);
  }

  @Get('documents/:id/audit/export')
  @Permissions(Permission.DOCUMENTS_AUDIT_READ)
  async exportAuditCsv(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetDocumentAuditQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileName = `edm-document-${id}-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return this.edmService.exportDocumentAuditCsv(id, actor, query);
  }

  @Get('documents/:id/audit/export/xlsx')
  @Permissions(Permission.DOCUMENTS_AUDIT_READ)
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
    return this.edmService.exportDocumentAuditXlsx(id, actor, query);
  }

  @Get('documents/:id/history')
  @Permissions(Permission.DOCUMENTS_AUDIT_READ)
  findHistory(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetDocumentHistoryQueryDto,
  ) {
    return this.edmService.findHistory(id, actor, query);
  }

  @Get('documents/:id/history/export')
  @Permissions(Permission.DOCUMENTS_AUDIT_READ)
  async exportHistoryCsv(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetDocumentHistoryQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileName = `edm-document-${id}-history-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return this.edmService.exportDocumentHistoryCsv(id, actor, query);
  }

  @Get('documents/:id/history/export/xlsx')
  @Permissions(Permission.DOCUMENTS_AUDIT_READ)
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
    return this.edmService.exportDocumentHistoryXlsx(id, actor, query);
  }

  @Post('documents/:id/forward')
  @Permissions(Permission.DOCUMENTS_ROUTE_EXECUTE)
  forwardDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ForwardEdmDocumentDto,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.edmService.forwardDocument(
      id,
      dto,
      actor,
      getRequestMeta(request),
    );
  }

  @Post('documents/:id/responsible')
  @Permissions(Permission.DOCUMENTS_UPDATE)
  assignResponsible(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignDocumentResponsibleDto,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.edmService.assignResponsible(
      id,
      dto,
      actor,
      getRequestMeta(request),
    );
  }

  @Post('documents/:id/replies')
  @Permissions(Permission.DOCUMENTS_READ)
  createReply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDocumentReplyDto,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.edmService.createReply(id, dto, actor, getRequestMeta(request));
  }

  @Get('documents/:id/replies')
  @Permissions(Permission.DOCUMENTS_READ)
  listReplies(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.listReplies(id, actor);
  }

  @Get('documents/:id/files')
  @Permissions(Permission.DOCUMENTS_READ, Permission.FILES_READ)
  findFiles(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.edmService.findFiles(id, actor);
  }

  @Post('documents/:id/files/:fileId')
  @Permissions(Permission.DOCUMENTS_UPDATE, Permission.FILES_WRITE)
  linkFile(
    @Param('id', ParseIntPipe) id: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.edmService.linkFile(id, fileId, actor, getRequestMeta(request));
  }

  @Delete('documents/:id/files/:fileId')
  @Permissions(Permission.DOCUMENTS_UPDATE, Permission.FILES_WRITE)
  unlinkFile(
    @Param('id', ParseIntPipe) id: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.edmService.unlinkFile(
      id,
      fileId,
      actor,
      getRequestMeta(request),
    );
  }
}
