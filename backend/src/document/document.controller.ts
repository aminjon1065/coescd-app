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
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Permissions } from '../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../iam/authorization/permission.type';
import { Policies } from '../iam/authorization/decorators/policies.decorator';
import { DocumentScopePolicy } from '../iam/authorization/policies/resource-scope.policy';
import { Request } from 'express';
import { getRequestMeta } from '../common/http/request-meta.util';
import { GetDocumentsQueryDto } from './dto/get-documents-query.dto';

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @Permissions(Permission.DOCUMENTS_CREATE)
  create(
    @Body() dto: CreateDocumentDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.documentService.create(dto, user.sub);
  }

  @Get()
  @Permissions(Permission.DOCUMENTS_READ)
  @Policies(new DocumentScopePolicy())
  findAll(
    @ActiveUser() user: ActiveUserData,
    @Query() query: GetDocumentsQueryDto,
  ) {
    return this.documentService.findAll(user, query);
  }

  @Get(':id')
  @Permissions(Permission.DOCUMENTS_READ)
  @Policies(new DocumentScopePolicy())
  findOne(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.documentService.findOne(+id, user);
  }

  @Get(':id/files')
  @Permissions(Permission.DOCUMENTS_READ, Permission.FILES_READ)
  @Policies(new DocumentScopePolicy())
  findDocumentFiles(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.documentService.findDocumentFiles(id, user);
  }

  @Post(':id/files/:fileId')
  @Permissions(Permission.DOCUMENTS_UPDATE, Permission.FILES_WRITE)
  @Policies(new DocumentScopePolicy())
  linkFile(
    @Param('id', ParseIntPipe) id: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @ActiveUser() user: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.documentService.linkFile(id, fileId, user, getRequestMeta(request));
  }

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

  @Delete(':id')
  @Permissions(Permission.DOCUMENTS_DELETE)
  @Policies(new DocumentScopePolicy())
  remove(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.documentService.remove(+id, user);
  }

}
