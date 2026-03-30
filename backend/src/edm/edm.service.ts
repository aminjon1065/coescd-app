import { Injectable } from '@nestjs/common';
import { EdmDocument } from './entities/edm-document.entity';
import { EdmDocumentRoute } from './entities/edm-document-route.entity';
import { EdmRouteStage } from './entities/edm-route-stage.entity';
import { EdmRegistrationJournal } from './entities/edm-registration-journal.entity';
import { EdmAlert } from './entities/edm-alert.entity';
import { EdmSavedFilter } from './entities/edm-saved-filter.entity';
import { EdmDocumentTemplate } from './entities/edm-document-template.entity';
import { EdmDocumentReply } from './entities/edm-document-reply.entity';
import { EdmDocumentKind } from './entities/edm-document-kind.entity';
import { EdmRouteTemplate } from './entities/edm-route-template.entity';
import { Task } from '../task/entities/task.entity';
import { FileEntity } from '../files/entities/file.entity';
import { FileLinkEntity } from '../files/entities/file-link.entity';
import type { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { CreateEdmDocumentDto } from './dto/create-edm-document.dto';
import { UpdateEdmDocumentDto } from './dto/update-edm-document.dto';
import { GetEdmDocumentsQueryDto } from './dto/get-edm-documents-query.dto';
import {
  EdmOverrideDto,
  ExecuteEdmStageActionDto,
  SubmitEdmDocumentDto,
} from './dto/submit-edm-document.dto';
import {
  CreateRouteTemplateDto,
  GetRouteTemplatesQueryDto,
  UpdateRouteTemplateDto,
} from './dto/route-template.dto';
import { PaginatedResponse } from '../common/http/pagination-query.dto';
import {
  CreateSavedFilterDto,
  GetSavedFiltersQueryDto,
  UpdateSavedFilterDto,
} from './dto/saved-filters.dto';
import {
  CreateDocumentTemplateDto,
  GetDocumentTemplatesQueryDto,
  UpdateDocumentTemplateDto,
} from './dto/document-template.dto';
import { EdmDashboardQueryDto, EdmReportsQueryDto } from './dto/reports.dto';
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
  GetRegistrationJournalQueryDto,
  UpdateRegistrationStatusDto,
} from './dto/registration-journal.dto';
import { CreateResolutionTasksDto } from './dto/document-resolution-tasks.dto';
import { GetAlertsQueryDto } from './dto/alerts.dto';
import { EdmTemplatesService } from './edm-templates.service';
import { EdmRegistrationService } from './edm-registration.service';
import { EdmReportsService } from './edm-reports.service';
import { EdmRouteService } from './edm-route.service';
import { EdmDocumentService } from './edm-document.service';

@Injectable()
export class EdmService {
  constructor(
    private readonly edmTemplatesService: EdmTemplatesService,
    private readonly edmRegistrationService: EdmRegistrationService,
    private readonly edmReportsService: EdmReportsService,
    private readonly edmRouteService: EdmRouteService,
    private readonly edmDocumentService: EdmDocumentService,
  ) {}

  // ── Saved Filters ──────────────────────────────────────────────────────────

  createSavedFilter(dto: CreateSavedFilterDto, actor: ActiveUserData): Promise<EdmSavedFilter> {
    return this.edmTemplatesService.createSavedFilter(dto, actor);
  }

  listSavedFilters(actor: ActiveUserData, query: GetSavedFiltersQueryDto): Promise<EdmSavedFilter[]> {
    return this.edmTemplatesService.listSavedFilters(actor, query);
  }

  updateSavedFilter(filterId: number, dto: UpdateSavedFilterDto, actor: ActiveUserData): Promise<EdmSavedFilter> {
    return this.edmTemplatesService.updateSavedFilter(filterId, dto, actor);
  }

  deleteSavedFilter(filterId: number, actor: ActiveUserData): Promise<void> {
    return this.edmTemplatesService.deleteSavedFilter(filterId, actor);
  }

  // ── Document Kinds ─────────────────────────────────────────────────────────

  createDocumentKind(dto: CreateDocumentKindDto, actor: ActiveUserData): Promise<EdmDocumentKind> {
    return this.edmTemplatesService.createDocumentKind(dto, actor);
  }

  listDocumentKinds(query: GetDocumentKindsQueryDto): Promise<EdmDocumentKind[]> {
    return this.edmTemplatesService.listDocumentKinds(query);
  }

  findDocumentKind(kindId: number): Promise<EdmDocumentKind> {
    return this.edmTemplatesService.findDocumentKind(kindId);
  }

  updateDocumentKind(kindId: number, dto: UpdateDocumentKindDto, actor: ActiveUserData): Promise<EdmDocumentKind> {
    return this.edmTemplatesService.updateDocumentKind(kindId, dto, actor);
  }

  deleteDocumentKind(kindId: number, actor: ActiveUserData): Promise<void> {
    return this.edmTemplatesService.deleteDocumentKind(kindId, actor);
  }

  // ── Document Templates ─────────────────────────────────────────────────────

  createDocumentTemplate(dto: CreateDocumentTemplateDto, actor: ActiveUserData): Promise<EdmDocumentTemplate> {
    return this.edmTemplatesService.createDocumentTemplate(dto, actor);
  }

  listDocumentTemplates(actor: ActiveUserData, query: GetDocumentTemplatesQueryDto): Promise<EdmDocumentTemplate[]> {
    return this.edmTemplatesService.listDocumentTemplates(actor, query);
  }

  findDocumentTemplate(templateId: number, actor: ActiveUserData): Promise<EdmDocumentTemplate> {
    return this.edmTemplatesService.findDocumentTemplate(templateId, actor);
  }

  updateDocumentTemplate(templateId: number, dto: UpdateDocumentTemplateDto, actor: ActiveUserData): Promise<EdmDocumentTemplate> {
    return this.edmTemplatesService.updateDocumentTemplate(templateId, dto, actor);
  }

  deleteDocumentTemplate(templateId: number, actor: ActiveUserData): Promise<void> {
    return this.edmTemplatesService.deleteDocumentTemplate(templateId, actor);
  }

  // ── Route Templates ────────────────────────────────────────────────────────

  createRouteTemplate(dto: CreateRouteTemplateDto, actor: ActiveUserData): Promise<EdmRouteTemplate> {
    return this.edmTemplatesService.createRouteTemplate(dto, actor);
  }

  listRouteTemplates(actor: ActiveUserData, query: GetRouteTemplatesQueryDto): Promise<EdmRouteTemplate[]> {
    return this.edmTemplatesService.listRouteTemplates(actor, query);
  }

  findRouteTemplate(templateId: number, actor: ActiveUserData): Promise<EdmRouteTemplate> {
    return this.edmTemplatesService.findRouteTemplate(templateId, actor);
  }

  updateRouteTemplate(templateId: number, dto: UpdateRouteTemplateDto, actor: ActiveUserData): Promise<EdmRouteTemplate> {
    return this.edmTemplatesService.updateRouteTemplate(templateId, dto, actor);
  }

  deleteRouteTemplate(templateId: number, actor: ActiveUserData): Promise<void> {
    return this.edmTemplatesService.deleteRouteTemplate(templateId, actor);
  }

  // ── Documents ──────────────────────────────────────────────────────────────

  createDraft(dto: CreateEdmDocumentDto, actor: ActiveUserData): Promise<EdmDocument> {
    return this.edmDocumentService.createDraft(dto, actor);
  }

  updateDraft(id: number, dto: UpdateEdmDocumentDto, actor: ActiveUserData): Promise<EdmDocument> {
    return this.edmDocumentService.updateDraft(id, dto, actor);
  }

  archive(documentId: number, actor: ActiveUserData) {
    return this.edmDocumentService.archive(documentId, actor);
  }

  findAll(actor: ActiveUserData, query: GetEdmDocumentsQueryDto): Promise<PaginatedResponse<EdmDocument>> {
    return this.edmDocumentService.findAll(actor, query);
  }

  findOne(documentId: number, actor: ActiveUserData) {
    return this.edmDocumentService.findOne(documentId, actor);
  }

  listQueue(
    queue: 'inbox' | 'outbox' | 'my-approvals',
    actor: ActiveUserData,
    query: { page?: number; limit?: number; q?: string },
  ) {
    return this.edmDocumentService.listQueue(queue, actor, query);
  }

  listMailbox(
    mailbox: 'incoming' | 'outgoing',
    actor: ActiveUserData,
    query: { page?: number; limit?: number; q?: string },
  ) {
    return this.edmDocumentService.listMailbox(mailbox, actor, query);
  }

  findRoute(documentId: number, actor: ActiveUserData) {
    return this.edmDocumentService.findRoute(documentId, actor);
  }

  forwardDocument(
    documentId: number,
    dto: ForwardEdmDocumentDto,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    return this.edmDocumentService.forwardDocument(documentId, dto, actor, requestMeta);
  }

  assignResponsible(
    documentId: number,
    dto: AssignDocumentResponsibleDto,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    return this.edmDocumentService.assignResponsible(documentId, dto, actor, requestMeta);
  }

  createReply(
    documentId: number,
    dto: CreateDocumentReplyDto,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    return this.edmDocumentService.createReply(documentId, dto, actor, requestMeta);
  }

  listReplies(documentId: number, actor: ActiveUserData) {
    return this.edmDocumentService.listReplies(documentId, actor);
  }

  findFiles(documentId: number, actor: ActiveUserData): Promise<FileEntity[]> {
    return this.edmDocumentService.findFiles(documentId, actor);
  }

  linkFile(
    documentId: number,
    fileId: number,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ): Promise<FileLinkEntity> {
    return this.edmDocumentService.linkFile(documentId, fileId, actor, requestMeta);
  }

  unlinkFile(
    documentId: number,
    fileId: number,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ): Promise<{ unlinked: true }> {
    return this.edmDocumentService.unlinkFile(documentId, fileId, actor, requestMeta);
  }

  // ── Registration ───────────────────────────────────────────────────────────

  registerDocument(documentId: number, actor: ActiveUserData) {
    return this.edmRegistrationService.registerDocument(documentId, actor);
  }

  updateRegistrationStatus(documentId: number, dto: UpdateRegistrationStatusDto, actor: ActiveUserData) {
    return this.edmRegistrationService.updateRegistrationStatus(documentId, dto, actor);
  }

  listRegistrationJournal(actor: ActiveUserData, query: GetRegistrationJournalQueryDto): Promise<PaginatedResponse<EdmRegistrationJournal>> {
    return this.edmRegistrationService.listRegistrationJournal(actor, query);
  }

  createResolutionTasks(documentId: number, dto: CreateResolutionTasksDto, actor: ActiveUserData) {
    return this.edmRegistrationService.createResolutionTasks(documentId, dto, actor);
  }

  listDocumentTasks(documentId: number, actor: ActiveUserData): Promise<Task[]> {
    return this.edmRegistrationService.listDocumentTasks(documentId, actor);
  }

  getDocumentTaskProgress(documentId: number, actor: ActiveUserData) {
    return this.edmRegistrationService.getDocumentTaskProgress(documentId, actor);
  }

  // ── Alerts & Reports ───────────────────────────────────────────────────────

  processDeadlineAlerts(actor: ActiveUserData) {
    return this.edmReportsService.processDeadlineAlerts(actor);
  }

  processDeadlineAlertsBySystem() {
    return this.edmReportsService.processDeadlineAlertsBySystem();
  }

  listMyAlerts(actor: ActiveUserData, query: GetAlertsQueryDto): Promise<PaginatedResponse<EdmAlert>> {
    return this.edmReportsService.listMyAlerts(actor, query);
  }

  acknowledgeAlert(alertId: number, actor: ActiveUserData): Promise<EdmAlert> {
    return this.edmReportsService.acknowledgeAlert(alertId, actor);
  }

  getSlaReport(actor: ActiveUserData, query: EdmReportsQueryDto) {
    return this.edmReportsService.getSlaReport(actor, query);
  }

  getOverdueReport(actor: ActiveUserData, query: EdmReportsQueryDto) {
    return this.edmReportsService.getOverdueReport(actor, query);
  }

  getWorkloadReport(actor: ActiveUserData, query: EdmReportsQueryDto) {
    return this.edmReportsService.getWorkloadReport(actor, query);
  }

  exportSlaReportCsv(actor: ActiveUserData, query: EdmReportsQueryDto): Promise<string> {
    return this.edmReportsService.exportSlaReportCsv(actor, query);
  }

  exportSlaReportXlsx(actor: ActiveUserData, query: EdmReportsQueryDto): Promise<Buffer> {
    return this.edmReportsService.exportSlaReportXlsx(actor, query);
  }

  exportOverdueReportCsv(actor: ActiveUserData, query: EdmReportsQueryDto): Promise<string> {
    return this.edmReportsService.exportOverdueReportCsv(actor, query);
  }

  exportOverdueReportXlsx(actor: ActiveUserData, query: EdmReportsQueryDto): Promise<Buffer> {
    return this.edmReportsService.exportOverdueReportXlsx(actor, query);
  }

  exportWorkloadReportCsv(actor: ActiveUserData, query: EdmReportsQueryDto): Promise<string> {
    return this.edmReportsService.exportWorkloadReportCsv(actor, query);
  }

  exportWorkloadReportXlsx(actor: ActiveUserData, query: EdmReportsQueryDto): Promise<Buffer> {
    return this.edmReportsService.exportWorkloadReportXlsx(actor, query);
  }

  getDashboardSummary(actor: ActiveUserData, query: EdmDashboardQueryDto) {
    return this.edmReportsService.getDashboardSummary(actor, query);
  }

  // ── Route Actions ──────────────────────────────────────────────────────────

  submitToRoute(
    id: number,
    dto: SubmitEdmDocumentDto,
    actor: ActiveUserData,
  ): Promise<{
    documentId: number;
    status: string;
    routeId: number;
    versionNo: number;
    externalNumber: string;
  }> {
    return this.edmRouteService.submitToRoute(id, dto, actor);
  }

  executeStageAction(
    documentId: number,
    stageId: number,
    dto: ExecuteEdmStageActionDto,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    return this.edmRouteService.executeStageAction(documentId, stageId, dto, actor, requestMeta);
  }

  override(
    documentId: number,
    dto: EdmOverrideDto,
    actor: ActiveUserData,
    requestMeta: { ip: string | null; userAgent: string | null },
  ) {
    return this.edmRouteService.override(documentId, dto, actor, requestMeta);
  }

  findAudit(documentId: number, actor: ActiveUserData, query: GetDocumentAuditQueryDto) {
    return this.edmRouteService.findAudit(documentId, actor, query);
  }

  findHistory(documentId: number, actor: ActiveUserData, query: GetDocumentHistoryQueryDto) {
    return this.edmRouteService.findHistory(documentId, actor, query);
  }

  exportDocumentAuditCsv(documentId: number, actor: ActiveUserData, query: GetDocumentAuditQueryDto): Promise<string> {
    return this.edmRouteService.exportDocumentAuditCsv(documentId, actor, query);
  }

  exportDocumentAuditXlsx(documentId: number, actor: ActiveUserData, query: GetDocumentAuditQueryDto): Promise<Buffer> {
    return this.edmRouteService.exportDocumentAuditXlsx(documentId, actor, query);
  }

  exportDocumentHistoryCsv(documentId: number, actor: ActiveUserData, query: GetDocumentHistoryQueryDto): Promise<string> {
    return this.edmRouteService.exportDocumentHistoryCsv(documentId, actor, query);
  }

  exportDocumentHistoryXlsx(documentId: number, actor: ActiveUserData, query: GetDocumentHistoryQueryDto): Promise<Buffer> {
    return this.edmRouteService.exportDocumentHistoryXlsx(documentId, actor, query);
  }

  // ── Route Stage Listing ────────────────────────────────────────────────────
  // (delegated through findRoute on EdmDocumentService)

  listStages(documentId: number, actor: ActiveUserData): Promise<EdmDocumentRoute | null> {
    return this.edmDocumentService.findRoute(documentId, actor) as Promise<EdmDocumentRoute | null>;
  }
}
