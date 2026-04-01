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
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { SaveContentDto } from './dto/save-content.dto';
import { WorkflowTransitionDto } from './dto/workflow-transition.dto';
import { GrantPermissionDto } from './dto/grant-permission.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { SearchDocumentsDto } from './dto/search-documents.dto';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { DocumentsFacade } from '../modules/documents/documents.facade';

@UseGuards(AccessTokenGuard)
@Controller('documents')
export class EdmEnterpriseController {
  constructor(private readonly documentsFacade: DocumentsFacade) {}

  /* ──────────────────── DOCUMENTS ──────────────────── */

  @Post()
  async create(
    @ActiveUser() user: ActiveUserData,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documentsFacade.enterprise.create(user, dto);
  }

  @Get()
  async search(
    @ActiveUser() user: ActiveUserData,
    @Query() query: SearchDocumentsDto,
  ) {
    const [items, total] = await this.documentsFacade.enterprise.search(user, {
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
    return this.documentsFacade.enterprise.myQueue(user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.documentsFacade.enterprise.findById(id, user);
  }

  @Patch(':id/metadata')
  async updateMetadata(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsFacade.enterprise.updateMetadata(id, user, dto);
  }

  @Post(':id/content')
  async saveContent(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
    @Body() dto: SaveContentDto,
  ) {
    await this.documentsFacade.enterprise.saveContent(
      id,
      user,
      dto.content,
      dto.autoSave ?? true,
    );
    return { ok: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    await this.documentsFacade.enterprise.delete(id, user);
    return { ok: true };
  }

  @Post(':id/archive')
  async archive(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.documentsFacade.enterprise.archive(id, user);
  }

  /* ──────────────────── VERSIONS ──────────────────── */

  @Get(':id/versions')
  async listVersions(@Param('id') id: string) {
    return this.documentsFacade.enterprise.listVersions(id);
  }

  @Get(':id/versions/:vn')
  async getVersion(@Param('id') id: string, @Param('vn') vn: string) {
    return this.documentsFacade.enterprise.getVersion(id, parseInt(vn, 10));
  }

  @Post(':id/versions/:vn/restore')
  async restoreVersion(
    @Param('id') id: string,
    @Param('vn') vn: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.documentsFacade.enterprise.restoreVersion(
      id,
      parseInt(vn, 10),
      user.sub,
    );
  }

  /* ──────────────────── WORKFLOW ──────────────────── */

  @Post(':id/workflow/start')
  async startWorkflow(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    await this.documentsFacade.enterprise.requirePermission(id, user, 'edit');
    return this.documentsFacade.enterprise.startWorkflow(id, user.sub);
  }

  @Get(':id/workflow')
  async getWorkflow(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    await this.documentsFacade.enterprise.requirePermission(id, user, 'view');
    return this.documentsFacade.enterprise.getWorkflow(id);
  }

  @Post(':id/workflow/transition')
  async transition(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
    @Body() dto: WorkflowTransitionDto,
  ) {
    await this.documentsFacade.enterprise.requirePermission(id, user, 'approve');
    return this.documentsFacade.enterprise.transitionWorkflow(id, dto, user.sub);
  }

  @Get('workflow/definitions')
  async listDefinitions() {
    return this.documentsFacade.enterprise.listWorkflowDefinitions();
  }

  /* ──────────────────── PERMISSIONS ──────────────────── */

  @Get(':id/permissions')
  async listPermissions(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    await this.documentsFacade.enterprise.requirePermission(id, user, 'share');
    return this.documentsFacade.enterprise.listPermissions(id);
  }

  @Post(':id/permissions')
  async grantPermission(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
    @Body() dto: GrantPermissionDto,
  ) {
    await this.documentsFacade.enterprise.requirePermission(id, user, 'share');
    return this.documentsFacade.enterprise.grantPermission(id, dto, user.sub);
  }

  @Delete(':id/permissions/:pid')
  async revokePermission(
    @Param('id') id: string,
    @Param('pid') pid: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    await this.documentsFacade.enterprise.requirePermission(id, user, 'share');
    await this.documentsFacade.enterprise.revokePermission(pid);
    return { ok: true };
  }

  /* ──────────────────── COMMENTS ──────────────────── */

  @Get(':id/comments')
  async listComments(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    await this.documentsFacade.enterprise.requirePermission(id, user, 'view');
    return this.documentsFacade.enterprise.listComments(id);
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
    @Body() dto: CreateCommentDto,
  ) {
    await this.documentsFacade.enterprise.requirePermission(id, user, 'comment');
    return this.documentsFacade.enterprise.addComment(id, user.sub, dto);
  }

  @Patch(':id/comments/:cid')
  async updateComment(
    @Param('id') id: string,
    @Param('cid') cid: string,
    @ActiveUser() user: ActiveUserData,
    @Body('body') body: string,
  ) {
    await this.documentsFacade.enterprise.requirePermission(id, user, 'comment');
    return this.documentsFacade.enterprise.updateComment(cid, body);
  }

  @Post(':id/comments/:cid/resolve')
  async resolveComment(
    @Param('id') id: string,
    @Param('cid') cid: string,
    @ActiveUser() user: ActiveUserData,
    @Body('status') status: 'resolved' | 'accepted' | 'rejected' = 'resolved',
  ) {
    await this.documentsFacade.enterprise.requirePermission(id, user, 'comment');
    return this.documentsFacade.enterprise.resolveComment(cid, user.sub, status);
  }

  @Delete(':id/comments/:cid')
  async deleteComment(
    @Param('id') id: string,
    @Param('cid') cid: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    await this.documentsFacade.enterprise.requirePermission(id, user, 'comment');
    await this.documentsFacade.enterprise.deleteComment(cid, user.sub);
    return { ok: true };
  }

  /* ──────────────────── ATTACHMENTS ──────────────────── */

  @Get(':id/attachments')
  async listAttachments(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.documentsFacade.enterprise.listAttachments(id, user);
  }

  @Delete(':id/attachments/:aid')
  async deleteAttachment(
    @Param('id') id: string,
    @Param('aid') aid: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    await this.documentsFacade.enterprise.requirePermission(id, user, 'edit');
    await this.documentsFacade.enterprise.deleteAttachment(aid, user);
    return { ok: true };
  }

  /* ──────────────────── AUDIT ──────────────────── */

  @Get(':id/activity')
  async getActivity(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
    await this.documentsFacade.enterprise.requirePermission(id, user, 'view');
    const [items, total] = await this.documentsFacade.enterprise.getActivity(
      id,
      parseInt(limit, 10),
      parseInt(offset, 10),
    );
    return { items, total };
  }
}
