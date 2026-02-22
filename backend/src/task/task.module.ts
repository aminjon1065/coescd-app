import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { Task } from './entities/task.entity';
import { User } from '../users/entities/user.entity';
import { FileEntity } from '../files/entities/file.entity';
import { FileLinkEntity } from '../files/entities/file-link.entity';
import { FileAccessAuditEntity } from '../files/entities/file-access-audit.entity';
import { FileAttachmentsService } from '../files/file-attachments.service';
import { IamModule } from '../iam/iam.module';

@Module({
  imports: [
    IamModule,
    TypeOrmModule.forFeature([
      Task,
      User,
      FileEntity,
      FileLinkEntity,
      FileAccessAuditEntity,
    ]),
  ],
  controllers: [TaskController],
  providers: [TaskService, FileAttachmentsService],
  exports: [TypeOrmModule],
})
export class TaskModule {}
