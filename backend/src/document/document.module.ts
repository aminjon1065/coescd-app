import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { Document } from './entities/document.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../department/entities/department.entity';
import { FileEntity } from '../files/entities/file.entity';
import { FileLinkEntity } from '../files/entities/file-link.entity';
import { FileAccessAuditEntity } from '../files/entities/file-access-audit.entity';
import { FileAttachmentsService } from '../files/file-attachments.service';
import { IamModule } from '../iam/iam.module';

@Module({
  imports: [
    IamModule,
    TypeOrmModule.forFeature([
      Document,
      User,
      Department,
      FileEntity,
      FileLinkEntity,
      FileAccessAuditEntity,
    ]),
  ],
  controllers: [DocumentController],
  providers: [DocumentService, FileAttachmentsService],
  exports: [TypeOrmModule],
})
export class DocumentModule {}
