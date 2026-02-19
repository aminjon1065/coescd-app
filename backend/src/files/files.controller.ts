import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { Permissions } from '../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../iam/authorization/permission.type';
import { CreateFileLinkDto } from './dto/create-file-link.dto';
import {
  CompletePresignedUploadDto,
  CreatePresignedUploadDto,
} from './dto/create-presigned-upload.dto';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { getFilesRuntimeConfig } from './files.config';
import { getRequestMeta } from '../common/http/request-meta.util';

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

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

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

  @Get()
  @Permissions(Permission.FILES_READ)
  findAll(@ActiveUser() actor: ActiveUserData) {
    return this.filesService.findAll(actor);
  }

  @Get(':id')
  @Permissions(Permission.FILES_READ)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
  ) {
    return this.filesService.findOne(id, actor);
  }

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

  @Delete(':id')
  @Permissions(Permission.FILES_DELETE)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() actor: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.filesService.softDelete(id, actor, getRequestMeta(request));
  }

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
}
