import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import type { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Permissions } from '../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../iam/authorization/permission.type';
import { Policies } from '../iam/authorization/decorators/policies.decorator';
import { DocumentScopePolicy } from '../iam/authorization/policies/resource-scope.policy';
import type { Request } from 'express';
import { getRequestMeta } from '../common/http/request-meta.util';
import { GetDocumentsQueryDto } from './dto/get-documents-query.dto';

@ApiTags('Documents (Legacy)')
@ApiBearerAuth()
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @ApiOperation({ summary: 'Create a new document' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Post()
  @Permissions(Permission.DOCUMENTS_CREATE)
  create(@Body() dto: CreateDocumentDto, @ActiveUser() user: ActiveUserData) {
    return this.documentService.create(dto, user.sub);
  }

  @ApiOperation({ summary: 'Get all documents' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get()
  @Permissions(Permission.DOCUMENTS_READ)
  @Policies(new DocumentScopePolicy())
  findAll(
    @ActiveUser() user: ActiveUserData,
    @Query() query: GetDocumentsQueryDto,
  ) {
    return this.documentService.findAll(user, query);
  }

  @ApiOperation({ summary: 'Get a document by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Get(':id')
  @Permissions(Permission.DOCUMENTS_READ)
  @Policies(new DocumentScopePolicy())
  findOne(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.documentService.findOne(+id, user);
  }

  @ApiOperation({ summary: 'Get files linked to a document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get(':id/files')
  @Permissions(Permission.DOCUMENTS_READ, Permission.FILES_READ)
  @Policies(new DocumentScopePolicy())
  findDocumentFiles(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.documentService.findDocumentFiles(id, user);
  }

  @ApiOperation({ summary: 'Link a file to a document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'fileId', type: Number })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Post(':id/files/:fileId')
  @Permissions(Permission.DOCUMENTS_UPDATE, Permission.FILES_WRITE)
  @Policies(new DocumentScopePolicy())
  linkFile(
    @Param('id', ParseIntPipe) id: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @ActiveUser() user: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.documentService.linkFile(
      id,
      fileId,
      user,
      getRequestMeta(request),
    );
  }

  @ApiOperation({ summary: 'Unlink a file from a document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'fileId', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Delete(':id/files/:fileId')
  @Permissions(Permission.DOCUMENTS_UPDATE, Permission.FILES_WRITE)
  @Policies(new DocumentScopePolicy())
  unlinkFile(
    @Param('id', ParseIntPipe) id: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @ActiveUser() user: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.documentService.unlinkFile(
      id,
      fileId,
      user,
      getRequestMeta(request),
    );
  }

  @ApiOperation({ summary: 'Update a document by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Patch(':id')
  @Permissions(Permission.DOCUMENTS_UPDATE)
  @Policies(new DocumentScopePolicy())
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.documentService.update(+id, dto, user);
  }

  @ApiOperation({ summary: 'Delete a document by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Delete(':id')
  @Permissions(Permission.DOCUMENTS_DELETE)
  @Policies(new DocumentScopePolicy())
  remove(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.documentService.remove(+id, user);
  }
}
