import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FilesService } from './files.service';
import { Permissions } from '../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../iam/authorization/permission.type';
import { CreateFileLinkDto } from './dto/create-file-link.dto';
import { CreateFileShareDto } from './dto/create-file-share.dto';
import {
  CompletePresignedUploadDto,
  CreatePresignedUploadDto,
} from './dto/create-presigned-upload.dto';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import type { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { getFilesRuntimeConfig } from './files.config';
import { getRequestMeta } from '../common/http/request-meta.util';
import { GetFilesQueryDto } from './dto/get-files-query.dto';

function createUploadInterceptorOptions() {
  const config = getFilesRuntimeConfig();
  return {
    limits: {
      fileSize: config.uploadMaxBytes,
    },
    fileFilter: (
      _: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      const mimeType = (file.mimetype ?? '').trim().toLowerCase();
      if (!config.allowedMimeTypes.includes(mimeType)) {
        callback(
          new BadRequestException(`Unsupported mime type: ${file.mimetype}`),
          false,
        );
        return;
      }
      callback(null, true);
    },
  };
}

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @ApiOperation({ summary: 'Upload a file (multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Post('upload')
  @Permissions(Permission.FILES_WRITE)
  @UseInterceptors(FileInterceptor('file', createUploadInterceptorOptions()))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.filesService.uploadFile(file, actor, getRequestMeta(request));
  }

  @ApiOperation({ summary: 'Create a presigned upload URL' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Post('upload-url')
  @Permissions(Permission.FILES_WRITE)
  createUploadUrl(
    @Body() dto: CreatePresignedUploadDto,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.filesService.createPresignedUpload(
      dto,
      actor,
      getRequestMeta(request),
    );
  }

  @ApiOperation({ summary: 'Complete a presigned upload' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Post('upload-complete')
  @Permissions(Permission.FILES_WRITE)
  completeUpload(
    @Body() dto: CompletePresignedUploadDto,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.filesService.completePresignedUpload(
      dto,
      actor,
      getRequestMeta(request),
    );
  }

  @ApiOperation({ summary: 'List all files' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get()
  @Permissions(Permission.FILES_READ)
  findAll(
    @ActiveUser() actor: ActiveUserData,
    @Query() query: GetFilesQueryDto,
  ) {
    return this.filesService.findAll(actor, query);
  }

  @ApiOperation({ summary: 'Get a file by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Get(':id')
  @Permissions(Permission.FILES_READ)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.filesService.findOne(id, actor);
  }

  @ApiOperation({ summary: 'Download a file by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get(':id/download')
  @Permissions(Permission.FILES_READ)
  async download(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { file, stream } = await this.filesService.downloadFile(
      id,
      actor,
      getRequestMeta(request),
    );
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.originalName}"`,
    );
    return new StreamableFile(stream);
  }

  @ApiOperation({ summary: 'Create a presigned download URL for a file' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get(':id/download-url')
  @Permissions(Permission.FILES_READ)
  createDownloadUrl(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.filesService.createPresignedDownload(
      id,
      actor,
      getRequestMeta(request),
    );
  }

  @ApiOperation({ summary: 'Delete a file by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Delete(':id')
  @Permissions(Permission.FILES_DELETE)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.filesService.softDelete(id, actor, getRequestMeta(request));
  }

  @ApiOperation({ summary: 'Link a file to a resource' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Post(':id/link')
  @Permissions(Permission.FILES_WRITE)
  createLink(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateFileLinkDto,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.filesService.createLink(
      id,
      dto,
      actor,
      getRequestMeta(request),
    );
  }

  // ── Share Endpoints ─────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Get shares for a file' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get(':id/shares')
  @Permissions(Permission.FILES_READ)
  getShares(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.filesService.getShares(id, actor, getRequestMeta(request));
  }

  @ApiOperation({ summary: 'Add a share to a file' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Post(':id/shares')
  @Permissions(Permission.FILES_WRITE)
  addShare(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateFileShareDto,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.filesService.addShare(id, dto, actor, getRequestMeta(request));
  }

  @ApiOperation({ summary: 'Remove a share from a file' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'shareId', type: Number })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Delete(':id/shares/:shareId')
  @Permissions(Permission.FILES_WRITE)
  removeShare(
    @Param('id', ParseIntPipe) id: number,
    @Param('shareId', ParseIntPipe) shareId: number,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.filesService.removeShare(
      id,
      shareId,
      actor,
      getRequestMeta(request),
    );
  }
}
