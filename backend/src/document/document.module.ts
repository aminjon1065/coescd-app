import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { Document } from './entities/document.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../department/entities/department.entity';
import { ScopeService } from '../iam/authorization/scope.service';

@Module({
  imports: [TypeOrmModule.forFeature([Document, User, Department])],
  controllers: [DocumentController],
  providers: [DocumentService, ScopeService],
  exports: [TypeOrmModule],
})
export class DocumentModule {}
