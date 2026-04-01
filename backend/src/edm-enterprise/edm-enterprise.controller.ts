import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../iam/authentication/guards/access-token/access-token.guard';
import type { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { EdmDocumentsService } from './services/edm-documents.service';
import { EdmVersionsService } from './services/edm-versions.service';
import { EdmWorkflowEngineService } from './services/edm-workflow-engine.service';
import { EdmPermissionsService } from './services/edm-permissions.service';
import { EdmCommentsService } from './services/edm-comments.service';
import { EdmAuditService } from './services/edm-audit.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { SaveContentDto } from './dto/save-content.dto';
import { WorkflowTransitionDto } from './dto/workflow-transition.dto';
import { GrantPermissionDto } from './dto/grant-permission.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { SearchDocumentsDto } from './dto/search-documents.dto';
import { ActiveUser } from '../iam/decorators/active-user.decorator';

@UseGuards(AccessTokenGuard)
@Controller('documents')
export class EdmEnterpriseController {
  constructor(
    private readonly documentsService: EdmDocumentsService,
    private readonly versionsService: EdmVersionsService,
    private readonly workflowService: EdmWorkflowEngineService,
    private readonly permissionsService: EdmPermissionsService,
    private readonly commentsService: EdmCommentsService,
    private readonly auditService: EdmAuditService,
  ) {}

  /* ──────────────────── DOCUMENTS ──────────────────── */

  @Post()
  async create(
    @ActiveUser() user: ActiveUserData,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documentsService.create(user.sub, dto);
  }

  @Get()
  async search(
    @ActiveUser() user: ActiveUserData,
    @Query() query: SearchDocumentsDto,
  ) {
    const [items, total] = await this.documentsService.search({
      ...query,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    });
    return {
      items,
      total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };
  }

  @Get('my-queue')
  async myQueue(@ActiveUser() user: ActiveUserData) {
    return this.documentsService.myQueue(user.sub);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.documentsService.findById(id);
  }

  @Patch(':id/metadata')
  async updateMetadata(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.updateMetadata(id, user.sub, dto);
  }

  @Post(':id/content')
  async saveContent(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
    @Body() dto: SaveContentDto,
  ) {
    await this.documentsService.saveContent(id, user.sub, dto.content, dto.autoSave ?? true);
    return { ok: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    await this.documentsService.delete(id, user.sub);
    return { ok: true };
  }

  @Post(':id/archive')
  async archive(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.documentsService.archive(id, user.sub);
  }

  /* ──────────────────── VERSIONS ──────────────────── */

  @Get(':id/versions')
  async listVersions(@Param('id') id: string) {
    return this.versionsService.list(id);
  }

  @Get(':id/versions/:vn')
  async getVersion(@Param('id') id: string, @Param('vn') vn: string) {
    return this.versionsService.getVersion(id, parseInt(vn, 10));
  }

  @Post(':id/versions/:vn/restore')
  async restoreVersion(
    @Param('id') id: string,
    @Param('vn') vn: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.versionsService.restore(id, parseInt(vn, 10), user.sub);
  }

  /* ──────────────────── WORKFLOW ──────────────────── */

  @Post(':id/workflow/start')
  async startWorkflow(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.workflowService.start(id, user.sub);
  }

  @Get(':id/workflow')
  async getWorkflow(@Param('id') id: string) {
    return this.workflowService.getState(id);
  }

  @Post(':id/workflow/transition')
  async transition(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
    @Body() dto: WorkflowTransitionDto,
  ) {
    return this.workflowService.transition(id, dto.action, user.sub, dto.comment);
  }

  @Get('workflow/definitions')
  async listDefinitions() {
    return this.workflowService.listDefinitions();
  }

  /* ──────────────────── PERMISSIONS ──────────────────── */

  @Get(':id/permissions')
  async listPermissions(@Param('id') id: string) {
    return this.permissionsService.listForDocument(id);
  }

  @Post(':id/permissions')
  async grantPermission(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
    @Body() dto: GrantPermissionDto,
  ) {
    return this.permissionsService.grant(
      id,
      dto.principalType,
      dto.principalId,
      dto.permission,
      user.sub,
      dto.expiresAt ? new Date(dto.expiresAt) : null,
      dto.conditions,
    );
  }

  @Delete(':id/permissions/:pid')
  async revokePermission(@Param('pid') pid: string) {
    await this.permissionsService.revoke(pid);
    return { ok: true };
  }

  /* ──────────────────── COMMENTS ──────────────────── */

  @Get(':id/comments')
  async listComments(@Param('id') id: string) {
    return this.commentsService.listThreads(id);
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(
      id,
      user.sub,
      dto.body,
      dto.parentId,
      dto.anchor,
      dto.isSuggestion,
    );
  }

  @Patch(':id/comments/:cid')
  async updateComment(
    @Param('cid') cid: string,
    @Body('body') body: string,
  ) {
    return this.commentsService.update(cid, body);
  }

  @Post(':id/comments/:cid/resolve')
  async resolveComment(
    @Param('cid') cid: string,
    @ActiveUser() user: ActiveUserData,
    @Body('status') status: 'resolved' | 'accepted' | 'rejected' = 'resolved',
  ) {
    return this.commentsService.resolve(cid, user.sub, status);
  }

  @Delete(':id/comments/:cid')
  async deleteComment(
    @Param('cid') cid: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    await this.commentsService.delete(cid, user.sub);
    return { ok: true };
  }

  /* ──────────────────── ATTACHMENTS ──────────────────── */

  @Get(':id/attachments')
  async listAttachments(@Param('id') id: string) {
    return this.documentsService.listAttachments(id);
  }

  @Delete(':id/attachments/:aid')
  async deleteAttachment(@Param('aid') aid: string) {
    await this.documentsService.deleteAttachment(aid);
    return { ok: true };
  }

  /* ──────────────────── AUDIT ──────────────────── */

  @Get(':id/activity')
  async getActivity(
    @Param('id') id: string,
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
    const [items, total] = await this.auditService.findByEntity(
      'document',
      id,
      parseInt(limit, 10),
      parseInt(offset, 10),
    );
    return { items, total };
  }
}
