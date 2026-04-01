import { Injectable } from '@nestjs/common';
import type { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';
import { DocumentService } from '../../document/document.service';
import { EdmService } from '../../edm/edm.service';
import { EdmDocumentsService } from '../../edm-enterprise/services/edm-documents.service';
import { EdmVersionsService } from '../../edm-enterprise/services/edm-versions.service';
import { EdmWorkflowEngineService } from '../../edm-enterprise/services/edm-workflow-engine.service';
import { EdmPermissionsService } from '../../edm-enterprise/services/edm-permissions.service';
import { EdmCommentsService } from '../../edm-enterprise/services/edm-comments.service';
import { EdmAuditService } from '../../edm-enterprise/services/edm-audit.service';
import { CreateDocumentDto as LegacyCreateDocumentDto } from '../../document/dto/create-document.dto';
import { UpdateDocumentDto as LegacyUpdateDocumentDto } from '../../document/dto/update-document.dto';
import { GetDocumentsQueryDto } from '../../document/dto/get-documents-query.dto';
import { CreateEdmDocumentDto } from '../../edm/dto/create-edm-document.dto';
import { UpdateEdmDocumentDto } from '../../edm/dto/update-edm-document.dto';
import { GetEdmDocumentsQueryDto } from '../../edm/dto/get-edm-documents-query.dto';
import {
  EdmOverrideDto,
  ExecuteEdmStageActionDto,
  SubmitEdmDocumentDto,
} from '../../edm/dto/submit-edm-document.dto';
import { GetEdmQueueQueryDto } from '../../edm/dto/get-edm-queue-query.dto';
import {
  CreateRouteTemplateDto,
  GetRouteTemplatesQueryDto,
  UpdateRouteTemplateDto,
} from '../../edm/dto/route-template.dto';
import {
  GetRegistrationJournalQueryDto,
  UpdateRegistrationStatusDto,
} from '../../edm/dto/registration-journal.dto';
import { CreateResolutionTasksDto } from '../../edm/dto/document-resolution-tasks.dto';
import { GetAlertsQueryDto } from '../../edm/dto/alerts.dto';
import {
  CreateSavedFilterDto,
  GetSavedFiltersQueryDto,
  UpdateSavedFilterDto,
} from '../../edm/dto/saved-filters.dto';
import {
  AssignDocumentResponsibleDto,
  CreateDocumentReplyDto,
  ForwardEdmDocumentDto,
} from '../../edm/dto/document-history.dto';
import {
  GetDocumentAuditQueryDto,
  GetDocumentHistoryQueryDto,
} from '../../edm/dto/document-audit-query.dto';
import {
  CreateDocumentKindDto,
  GetDocumentKindsQueryDto,
  UpdateDocumentKindDto,
} from '../../edm/dto/document-kind.dto';
import {
  CreateDocumentTemplateDto,
  GetDocumentTemplatesQueryDto,
  UpdateDocumentTemplateDto,
} from '../../edm/dto/document-template.dto';
import { EdmDashboardQueryDto, EdmReportsQueryDto } from '../../edm/dto/reports.dto';
import { CreateDocumentDto, SearchDocumentsDto, UpdateDocumentDto } from '../../edm-enterprise/services/edm-documents.service';
import { WorkflowTransitionDto } from '../../edm-enterprise/dto/workflow-transition.dto';
import { GrantPermissionDto } from '../../edm-enterprise/dto/grant-permission.dto';
import { CreateCommentDto } from '../../edm-enterprise/dto/create-comment.dto';

@Injectable()
export class DocumentsFacade {
  readonly legacy: {
    create: (dto: LegacyCreateDocumentDto, actor: ActiveUserData) => ReturnType<DocumentService['create']>;
    findAll: (actor: ActiveUserData, query: GetDocumentsQueryDto) => ReturnType<DocumentService['findAll']>;
    findOne: (id: number, actor: ActiveUserData) => ReturnType<DocumentService['findOne']>;
    update: (id: number, dto: LegacyUpdateDocumentDto, actor: ActiveUserData) => ReturnType<DocumentService['update']>;
    remove: (id: number, actor: ActiveUserData) => ReturnType<DocumentService['remove']>;
    findDocumentFiles: (documentId: number, actor: ActiveUserData) => ReturnType<DocumentService['findDocumentFiles']>;
    linkFile: (
      documentId: number,
      fileId: number,
      actor: ActiveUserData,
      requestMeta: { ip: string | null; userAgent: string | null },
    ) => ReturnType<DocumentService['linkFile']>;
    unlinkFile: (
      documentId: number,
      fileId: number,
      actor: ActiveUserData,
      requestMeta: { ip: string | null; userAgent: string | null },
    ) => ReturnType<DocumentService['unlinkFile']>;
  };

  readonly edm: {
    createDocumentKind: (dto: CreateDocumentKindDto, actor: ActiveUserData) => ReturnType<EdmService['createDocumentKind']>;
    listDocumentKinds: (query: GetDocumentKindsQueryDto) => ReturnType<EdmService['listDocumentKinds']>;
    findDocumentKind: (kindId: number) => ReturnType<EdmService['findDocumentKind']>;
    updateDocumentKind: (kindId: number, dto: UpdateDocumentKindDto, actor: ActiveUserData) => ReturnType<EdmService['updateDocumentKind']>;
    deleteDocumentKind: (kindId: number, actor: ActiveUserData) => ReturnType<EdmService['deleteDocumentKind']>;
    createDocumentTemplate: (dto: CreateDocumentTemplateDto, actor: ActiveUserData) => ReturnType<EdmService['createDocumentTemplate']>;
    listDocumentTemplates: (actor: ActiveUserData, query: GetDocumentTemplatesQueryDto) => ReturnType<EdmService['listDocumentTemplates']>;
    findDocumentTemplate: (templateId: number, actor: ActiveUserData) => ReturnType<EdmService['findDocumentTemplate']>;
    updateDocumentTemplate: (templateId: number, dto: UpdateDocumentTemplateDto, actor: ActiveUserData) => ReturnType<EdmService['updateDocumentTemplate']>;
    deleteDocumentTemplate: (templateId: number, actor: ActiveUserData) => ReturnType<EdmService['deleteDocumentTemplate']>;
    createRouteTemplate: (dto: CreateRouteTemplateDto, actor: ActiveUserData) => ReturnType<EdmService['createRouteTemplate']>;
    listRouteTemplates: (actor: ActiveUserData, query: GetRouteTemplatesQueryDto) => ReturnType<EdmService['listRouteTemplates']>;
    findRouteTemplate: (templateId: number, actor: ActiveUserData) => ReturnType<EdmService['findRouteTemplate']>;
    updateRouteTemplate: (templateId: number, dto: UpdateRouteTemplateDto, actor: ActiveUserData) => ReturnType<EdmService['updateRouteTemplate']>;
    deleteRouteTemplate: (templateId: number, actor: ActiveUserData) => ReturnType<EdmService['deleteRouteTemplate']>;
    createSavedFilter: (dto: CreateSavedFilterDto, actor: ActiveUserData) => ReturnType<EdmService['createSavedFilter']>;
    listSavedFilters: (actor: ActiveUserData, query: GetSavedFiltersQueryDto) => ReturnType<EdmService['listSavedFilters']>;
    updateSavedFilter: (filterId: number, dto: UpdateSavedFilterDto, actor: ActiveUserData) => ReturnType<EdmService['updateSavedFilter']>;
    deleteSavedFilter: (filterId: number, actor: ActiveUserData) => ReturnType<EdmService['deleteSavedFilter']>;
    createDraft: (dto: CreateEdmDocumentDto, actor: ActiveUserData) => ReturnType<EdmService['createDraft']>;
    updateDraft: (id: number, dto: UpdateEdmDocumentDto, actor: ActiveUserData) => ReturnType<EdmService['updateDraft']>;
    archive: (documentId: number, actor: ActiveUserData) => ReturnType<EdmService['archive']>;
    findAll: (actor: ActiveUserData, query: GetEdmDocumentsQueryDto) => ReturnType<EdmService['findAll']>;
    findOne: (documentId: number, actor: ActiveUserData) => ReturnType<EdmService['findOne']>;
    listQueue: (queue: 'inbox' | 'outbox' | 'my-approvals', actor: ActiveUserData, query: GetEdmQueueQueryDto) => ReturnType<EdmService['listQueue']>;
    listMailbox: (mailbox: 'incoming' | 'outgoing', actor: ActiveUserData, query: GetEdmQueueQueryDto) => ReturnType<EdmService['listMailbox']>;
    findRoute: (documentId: number, actor: ActiveUserData) => ReturnType<EdmService['findRoute']>;
    forwardDocument: (
      documentId: number,
      dto: ForwardEdmDocumentDto,
      actor: ActiveUserData,
      requestMeta: { ip: string | null; userAgent: string | null },
    ) => ReturnType<EdmService['forwardDocument']>;
    assignResponsible: (
      documentId: number,
      dto: AssignDocumentResponsibleDto,
      actor: ActiveUserData,
      requestMeta: { ip: string | null; userAgent: string | null },
    ) => ReturnType<EdmService['assignResponsible']>;
    createReply: (
      documentId: number,
      dto: CreateDocumentReplyDto,
      actor: ActiveUserData,
      requestMeta: { ip: string | null; userAgent: string | null },
    ) => ReturnType<EdmService['createReply']>;
    listReplies: (documentId: number, actor: ActiveUserData) => ReturnType<EdmService['listReplies']>;
    findFiles: (documentId: number, actor: ActiveUserData) => ReturnType<EdmService['findFiles']>;
    linkFile: (
      documentId: number,
      fileId: number,
      actor: ActiveUserData,
      requestMeta: { ip: string | null; userAgent: string | null },
    ) => ReturnType<EdmService['linkFile']>;
    unlinkFile: (
      documentId: number,
      fileId: number,
      actor: ActiveUserData,
      requestMeta: { ip: string | null; userAgent: string | null },
    ) => ReturnType<EdmService['unlinkFile']>;
    registerDocument: (documentId: number, actor: ActiveUserData) => ReturnType<EdmService['registerDocument']>;
    updateRegistrationStatus: (documentId: number, dto: UpdateRegistrationStatusDto, actor: ActiveUserData) => ReturnType<EdmService['updateRegistrationStatus']>;
    listRegistrationJournal: (actor: ActiveUserData, query: GetRegistrationJournalQueryDto) => ReturnType<EdmService['listRegistrationJournal']>;
    createResolutionTasks: (documentId: number, dto: CreateResolutionTasksDto, actor: ActiveUserData) => ReturnType<EdmService['createResolutionTasks']>;
    listDocumentTasks: (documentId: number, actor: ActiveUserData) => ReturnType<EdmService['listDocumentTasks']>;
    getDocumentTaskProgress: (documentId: number, actor: ActiveUserData) => ReturnType<EdmService['getDocumentTaskProgress']>;
    processDeadlineAlerts: (actor: ActiveUserData) => ReturnType<EdmService['processDeadlineAlerts']>;
    processDeadlineAlertsBySystem: () => ReturnType<EdmService['processDeadlineAlertsBySystem']>;
    listMyAlerts: (actor: ActiveUserData, query: GetAlertsQueryDto) => ReturnType<EdmService['listMyAlerts']>;
    acknowledgeAlert: (alertId: number, actor: ActiveUserData) => ReturnType<EdmService['acknowledgeAlert']>;
    getSlaReport: (actor: ActiveUserData, query: EdmReportsQueryDto) => ReturnType<EdmService['getSlaReport']>;
    getOverdueReport: (actor: ActiveUserData, query: EdmReportsQueryDto) => ReturnType<EdmService['getOverdueReport']>;
    getWorkloadReport: (actor: ActiveUserData, query: EdmReportsQueryDto) => ReturnType<EdmService['getWorkloadReport']>;
    exportSlaReportCsv: (actor: ActiveUserData, query: EdmReportsQueryDto) => ReturnType<EdmService['exportSlaReportCsv']>;
    exportSlaReportXlsx: (actor: ActiveUserData, query: EdmReportsQueryDto) => ReturnType<EdmService['exportSlaReportXlsx']>;
    exportOverdueReportCsv: (actor: ActiveUserData, query: EdmReportsQueryDto) => ReturnType<EdmService['exportOverdueReportCsv']>;
    exportOverdueReportXlsx: (actor: ActiveUserData, query: EdmReportsQueryDto) => ReturnType<EdmService['exportOverdueReportXlsx']>;
    exportWorkloadReportCsv: (actor: ActiveUserData, query: EdmReportsQueryDto) => ReturnType<EdmService['exportWorkloadReportCsv']>;
    exportWorkloadReportXlsx: (actor: ActiveUserData, query: EdmReportsQueryDto) => ReturnType<EdmService['exportWorkloadReportXlsx']>;
    getDashboardSummary: (actor: ActiveUserData, query: EdmDashboardQueryDto) => ReturnType<EdmService['getDashboardSummary']>;
    submitToRoute: (id: number, dto: SubmitEdmDocumentDto, actor: ActiveUserData) => ReturnType<EdmService['submitToRoute']>;
    executeStageAction: (
      documentId: number,
      stageId: number,
      dto: ExecuteEdmStageActionDto,
      actor: ActiveUserData,
      requestMeta: { ip: string | null; userAgent: string | null },
    ) => ReturnType<EdmService['executeStageAction']>;
    override: (
      documentId: number,
      dto: EdmOverrideDto,
      actor: ActiveUserData,
      requestMeta: { ip: string | null; userAgent: string | null },
    ) => ReturnType<EdmService['override']>;
    findAudit: (documentId: number, actor: ActiveUserData, query: GetDocumentAuditQueryDto) => ReturnType<EdmService['findAudit']>;
    findHistory: (documentId: number, actor: ActiveUserData, query: GetDocumentHistoryQueryDto) => ReturnType<EdmService['findHistory']>;
    exportDocumentAuditCsv: (documentId: number, actor: ActiveUserData, query: GetDocumentAuditQueryDto) => ReturnType<EdmService['exportDocumentAuditCsv']>;
    exportDocumentAuditXlsx: (documentId: number, actor: ActiveUserData, query: GetDocumentAuditQueryDto) => ReturnType<EdmService['exportDocumentAuditXlsx']>;
    exportDocumentHistoryCsv: (documentId: number, actor: ActiveUserData, query: GetDocumentHistoryQueryDto) => ReturnType<EdmService['exportDocumentHistoryCsv']>;
    exportDocumentHistoryXlsx: (documentId: number, actor: ActiveUserData, query: GetDocumentHistoryQueryDto) => ReturnType<EdmService['exportDocumentHistoryXlsx']>;
    listStages: (documentId: number, actor: ActiveUserData) => ReturnType<EdmService['listStages']>;
  };

  readonly enterprise: {
    create: (actor: ActiveUserData, dto: CreateDocumentDto) => ReturnType<EdmDocumentsService['create']>;
    search: (actor: ActiveUserData, query: SearchDocumentsDto) => ReturnType<EdmDocumentsService['search']>;
    myQueue: (actor: ActiveUserData) => ReturnType<EdmDocumentsService['myQueue']>;
    findById: (id: string, actor: ActiveUserData) => ReturnType<EdmDocumentsService['findById']>;
    updateMetadata: (id: string, actor: ActiveUserData, dto: UpdateDocumentDto) => ReturnType<EdmDocumentsService['updateMetadata']>;
    saveContent: (id: string, actor: ActiveUserData, content: Record<string, unknown>, autoSave?: boolean) => ReturnType<EdmDocumentsService['saveContent']>;
    delete: (id: string, actor: ActiveUserData) => ReturnType<EdmDocumentsService['delete']>;
    archive: (id: string, actor: ActiveUserData) => ReturnType<EdmDocumentsService['archive']>;
    requirePermission: (
      id: string,
      actor: ActiveUserData,
      permission: 'view' | 'comment' | 'edit' | 'approve' | 'share' | 'delete',
    ) => ReturnType<EdmDocumentsService['requirePermission']>;
    listVersions: (id: string) => ReturnType<EdmVersionsService['list']>;
    getVersion: (id: string, versionNumber: number) => ReturnType<EdmVersionsService['getVersion']>;
    restoreVersion: (id: string, versionNumber: number, actorId: number) => ReturnType<EdmVersionsService['restore']>;
    getLatestVersion: (id: string) => ReturnType<EdmVersionsService['getLatest']>;
    startWorkflow: (id: string, actorId: number) => ReturnType<EdmWorkflowEngineService['start']>;
    getWorkflow: (id: string) => ReturnType<EdmWorkflowEngineService['getState']>;
    transitionWorkflow: (id: string, dto: WorkflowTransitionDto, actorId: number) => ReturnType<EdmWorkflowEngineService['transition']>;
    listWorkflowDefinitions: () => ReturnType<EdmWorkflowEngineService['listDefinitions']>;
    listPermissions: (id: string) => ReturnType<EdmPermissionsService['listForDocument']>;
    grantPermission: (id: string, dto: GrantPermissionDto, actorId: number) => ReturnType<EdmPermissionsService['grant']>;
    revokePermission: (permissionId: string) => ReturnType<EdmPermissionsService['revoke']>;
    listComments: (id: string) => ReturnType<EdmCommentsService['listThreads']>;
    addComment: (id: string, actorId: number, dto: CreateCommentDto) => ReturnType<EdmCommentsService['create']>;
    updateComment: (commentId: string, body: string) => ReturnType<EdmCommentsService['update']>;
    resolveComment: (commentId: string, actorId: number, status?: 'resolved' | 'accepted' | 'rejected') => ReturnType<EdmCommentsService['resolve']>;
    deleteComment: (commentId: string, actorId: number) => ReturnType<EdmCommentsService['delete']>;
    listAttachments: (id: string, actor: ActiveUserData) => ReturnType<EdmDocumentsService['listAttachments']>;
    deleteAttachment: (attachmentId: string, actor: ActiveUserData) => ReturnType<EdmDocumentsService['deleteAttachment']>;
    getActivity: (id: string, limit?: number, offset?: number) => ReturnType<EdmAuditService['findByEntity']>;
  };

  constructor(
    private readonly documentService: DocumentService,
    private readonly edmService: EdmService,
    private readonly edmDocumentsService: EdmDocumentsService,
    private readonly edmVersionsService: EdmVersionsService,
    private readonly edmWorkflowEngineService: EdmWorkflowEngineService,
    private readonly edmPermissionsService: EdmPermissionsService,
    private readonly edmCommentsService: EdmCommentsService,
    private readonly edmAuditService: EdmAuditService,
  ) {
    this.legacy = {
      create: (dto, actor) => this.documentService.create(dto, actor),
      findAll: (actor, query) => this.documentService.findAll(actor, query),
      findOne: (id, actor) => this.documentService.findOne(id, actor),
      update: (id, dto, actor) => this.documentService.update(id, dto, actor),
      remove: (id, actor) => this.documentService.remove(id, actor),
      findDocumentFiles: (documentId, actor) =>
        this.documentService.findDocumentFiles(documentId, actor),
      linkFile: (documentId, fileId, actor, requestMeta) =>
        this.documentService.linkFile(documentId, fileId, actor, requestMeta),
      unlinkFile: (documentId, fileId, actor, requestMeta) =>
        this.documentService.unlinkFile(documentId, fileId, actor, requestMeta),
    };

    this.edm = {
      createDocumentKind: (dto, actor) => this.edmService.createDocumentKind(dto, actor),
      listDocumentKinds: (query) => this.edmService.listDocumentKinds(query),
      findDocumentKind: (kindId) => this.edmService.findDocumentKind(kindId),
      updateDocumentKind: (kindId, dto, actor) =>
        this.edmService.updateDocumentKind(kindId, dto, actor),
      deleteDocumentKind: (kindId, actor) => this.edmService.deleteDocumentKind(kindId, actor),
      createDocumentTemplate: (dto, actor) =>
        this.edmService.createDocumentTemplate(dto, actor),
      listDocumentTemplates: (actor, query) =>
        this.edmService.listDocumentTemplates(actor, query),
      findDocumentTemplate: (templateId, actor) =>
        this.edmService.findDocumentTemplate(templateId, actor),
      updateDocumentTemplate: (templateId, dto, actor) =>
        this.edmService.updateDocumentTemplate(templateId, dto, actor),
      deleteDocumentTemplate: (templateId, actor) =>
        this.edmService.deleteDocumentTemplate(templateId, actor),
      createRouteTemplate: (dto, actor) => this.edmService.createRouteTemplate(dto, actor),
      listRouteTemplates: (actor, query) =>
        this.edmService.listRouteTemplates(actor, query),
      findRouteTemplate: (templateId, actor) =>
        this.edmService.findRouteTemplate(templateId, actor),
      updateRouteTemplate: (templateId, dto, actor) =>
        this.edmService.updateRouteTemplate(templateId, dto, actor),
      deleteRouteTemplate: (templateId, actor) =>
        this.edmService.deleteRouteTemplate(templateId, actor),
      createSavedFilter: (dto, actor) => this.edmService.createSavedFilter(dto, actor),
      listSavedFilters: (actor, query) => this.edmService.listSavedFilters(actor, query),
      updateSavedFilter: (filterId, dto, actor) =>
        this.edmService.updateSavedFilter(filterId, dto, actor),
      deleteSavedFilter: (filterId, actor) =>
        this.edmService.deleteSavedFilter(filterId, actor),
      createDraft: (dto, actor) => this.edmService.createDraft(dto, actor),
      updateDraft: (id, dto, actor) => this.edmService.updateDraft(id, dto, actor),
      archive: (documentId, actor) => this.edmService.archive(documentId, actor),
      findAll: (actor, query) => this.edmService.findAll(actor, query),
      findOne: (documentId, actor) => this.edmService.findOne(documentId, actor),
      listQueue: (queue, actor, query) => this.edmService.listQueue(queue, actor, query),
      listMailbox: (mailbox, actor, query) =>
        this.edmService.listMailbox(mailbox, actor, query),
      findRoute: (documentId, actor) => this.edmService.findRoute(documentId, actor),
      forwardDocument: (documentId, dto, actor, requestMeta) =>
        this.edmService.forwardDocument(documentId, dto, actor, requestMeta),
      assignResponsible: (documentId, dto, actor, requestMeta) =>
        this.edmService.assignResponsible(documentId, dto, actor, requestMeta),
      createReply: (documentId, dto, actor, requestMeta) =>
        this.edmService.createReply(documentId, dto, actor, requestMeta),
      listReplies: (documentId, actor) => this.edmService.listReplies(documentId, actor),
      findFiles: (documentId, actor) => this.edmService.findFiles(documentId, actor),
      linkFile: (documentId, fileId, actor, requestMeta) =>
        this.edmService.linkFile(documentId, fileId, actor, requestMeta),
      unlinkFile: (documentId, fileId, actor, requestMeta) =>
        this.edmService.unlinkFile(documentId, fileId, actor, requestMeta),
      registerDocument: (documentId, actor) =>
        this.edmService.registerDocument(documentId, actor),
      updateRegistrationStatus: (documentId, dto, actor) =>
        this.edmService.updateRegistrationStatus(documentId, dto, actor),
      listRegistrationJournal: (actor, query) =>
        this.edmService.listRegistrationJournal(actor, query),
      createResolutionTasks: (documentId, dto, actor) =>
        this.edmService.createResolutionTasks(documentId, dto, actor),
      listDocumentTasks: (documentId, actor) =>
        this.edmService.listDocumentTasks(documentId, actor),
      getDocumentTaskProgress: (documentId, actor) =>
        this.edmService.getDocumentTaskProgress(documentId, actor),
      processDeadlineAlerts: (actor) => this.edmService.processDeadlineAlerts(actor),
      processDeadlineAlertsBySystem: () =>
        this.edmService.processDeadlineAlertsBySystem(),
      listMyAlerts: (actor, query) => this.edmService.listMyAlerts(actor, query),
      acknowledgeAlert: (alertId, actor) => this.edmService.acknowledgeAlert(alertId, actor),
      getSlaReport: (actor, query) => this.edmService.getSlaReport(actor, query),
      getOverdueReport: (actor, query) => this.edmService.getOverdueReport(actor, query),
      getWorkloadReport: (actor, query) => this.edmService.getWorkloadReport(actor, query),
      exportSlaReportCsv: (actor, query) =>
        this.edmService.exportSlaReportCsv(actor, query),
      exportSlaReportXlsx: (actor, query) =>
        this.edmService.exportSlaReportXlsx(actor, query),
      exportOverdueReportCsv: (actor, query) =>
        this.edmService.exportOverdueReportCsv(actor, query),
      exportOverdueReportXlsx: (actor, query) =>
        this.edmService.exportOverdueReportXlsx(actor, query),
      exportWorkloadReportCsv: (actor, query) =>
        this.edmService.exportWorkloadReportCsv(actor, query),
      exportWorkloadReportXlsx: (actor, query) =>
        this.edmService.exportWorkloadReportXlsx(actor, query),
      getDashboardSummary: (actor, query) =>
        this.edmService.getDashboardSummary(actor, query),
      submitToRoute: (id, dto, actor) => this.edmService.submitToRoute(id, dto, actor),
      executeStageAction: (documentId, stageId, dto, actor, requestMeta) =>
        this.edmService.executeStageAction(documentId, stageId, dto, actor, requestMeta),
      override: (documentId, dto, actor, requestMeta) =>
        this.edmService.override(documentId, dto, actor, requestMeta),
      findAudit: (documentId, actor, query) =>
        this.edmService.findAudit(documentId, actor, query),
      findHistory: (documentId, actor, query) =>
        this.edmService.findHistory(documentId, actor, query),
      exportDocumentAuditCsv: (documentId, actor, query) =>
        this.edmService.exportDocumentAuditCsv(documentId, actor, query),
      exportDocumentAuditXlsx: (documentId, actor, query) =>
        this.edmService.exportDocumentAuditXlsx(documentId, actor, query),
      exportDocumentHistoryCsv: (documentId, actor, query) =>
        this.edmService.exportDocumentHistoryCsv(documentId, actor, query),
      exportDocumentHistoryXlsx: (documentId, actor, query) =>
        this.edmService.exportDocumentHistoryXlsx(documentId, actor, query),
      listStages: (documentId, actor) => this.edmService.listStages(documentId, actor),
    };

    this.enterprise = {
      create: (actor, dto) => this.edmDocumentsService.create(actor, dto),
      search: (actor, query) => this.edmDocumentsService.search(actor, query),
      myQueue: (actor) => this.edmDocumentsService.myQueue(actor),
      findById: (id, actor) => this.edmDocumentsService.findById(id, actor),
      updateMetadata: (id, actor, dto) =>
        this.edmDocumentsService.updateMetadata(id, actor, dto),
      saveContent: (id, actor, content, autoSave) =>
        this.edmDocumentsService.saveContent(id, actor, content, autoSave),
      delete: (id, actor) => this.edmDocumentsService.delete(id, actor),
      archive: (id, actor) => this.edmDocumentsService.archive(id, actor),
      requirePermission: (id, actor, permission) =>
        this.edmDocumentsService.requirePermission(id, actor, permission),
      listVersions: (id) => this.edmVersionsService.list(id),
      getVersion: (id, versionNumber) =>
        this.edmVersionsService.getVersion(id, versionNumber),
      restoreVersion: (id, versionNumber, actorId) =>
        this.edmVersionsService.restore(id, versionNumber, actorId),
      getLatestVersion: (id) => this.edmVersionsService.getLatest(id),
      startWorkflow: (id, actorId) => this.edmWorkflowEngineService.start(id, actorId),
      getWorkflow: (id) => this.edmWorkflowEngineService.getState(id),
      transitionWorkflow: (id, dto, actorId) =>
        this.edmWorkflowEngineService.transition(id, dto.action, actorId, dto.comment),
      listWorkflowDefinitions: () => this.edmWorkflowEngineService.listDefinitions(),
      listPermissions: (id) => this.edmPermissionsService.listForDocument(id),
      grantPermission: (id, dto, actorId) =>
        this.edmPermissionsService.grant(
          id,
          dto.principalType,
          dto.principalId,
          dto.permission,
          actorId,
          dto.expiresAt ? new Date(dto.expiresAt) : null,
          dto.conditions,
        ),
      revokePermission: (permissionId) =>
        this.edmPermissionsService.revoke(permissionId),
      listComments: (id) => this.edmCommentsService.listThreads(id),
      addComment: (id, actorId, dto) =>
        this.edmCommentsService.create(
          id,
          actorId,
          dto.body,
          dto.parentId,
          dto.anchor,
          dto.isSuggestion,
        ),
      updateComment: (commentId, body) => this.edmCommentsService.update(commentId, body),
      resolveComment: (commentId, actorId, status) =>
        this.edmCommentsService.resolve(commentId, actorId, status),
      deleteComment: (commentId, actorId) =>
        this.edmCommentsService.delete(commentId, actorId),
      listAttachments: (id, actor) => this.edmDocumentsService.listAttachments(id, actor),
      deleteAttachment: (attachmentId, actor) =>
        this.edmDocumentsService.deleteAttachment(attachmentId, actor),
      getActivity: (id, limit, offset) =>
        this.edmAuditService.findByEntity('document', id, limit, offset),
    };
  }
}
