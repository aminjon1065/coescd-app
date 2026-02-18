import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FileEntity } from './entities/file.entity';
import { FileLinkEntity } from './entities/file-link.entity';
import { FileAccessAuditEntity } from './entities/file-access-audit.entity';
import { User } from '../users/entities/user.entity';
import { ScopeService } from '../iam/authorization/scope.service';
import { FilesStorageService } from './storage/files-storage.service';
import { Department } from '../department/entities/department.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FileEntity,
      FileLinkEntity,
      FileAccessAuditEntity,
      User,
      Department,
    ]),
  ],
  controllers: [FilesController],
  providers: [FilesService, ScopeService, FilesStorageService],
  exports: [FilesService],
})
export class FilesModule {}
