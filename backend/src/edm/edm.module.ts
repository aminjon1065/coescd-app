import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EdmController } from './edm.controller';
import { EdmService } from './edm.service';
import { EdmDocument } from './entities/edm-document.entity';
import { EdmDocumentRoute } from './entities/edm-document-route.entity';
import { EdmRouteStage } from './entities/edm-route-stage.entity';
import { EdmStageAction } from './entities/edm-stage-action.entity';
import { EdmDocumentRegistrySequence } from './entities/edm-document-registry-sequence.entity';
import { IamDelegation } from './entities/iam-delegation.entity';
import { EdmRouteTemplate } from './entities/edm-route-template.entity';
import { EdmRouteTemplateStage } from './entities/edm-route-template-stage.entity';
import { EdmRegistrationJournal } from './entities/edm-registration-journal.entity';
import { EdmDocumentTaskLink } from './entities/edm-document-task-link.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../department/entities/department.entity';
import { Task } from '../task/entities/task.entity';
import { EdmAlert } from './entities/edm-alert.entity';
import { EdmSavedFilter } from './entities/edm-saved-filter.entity';
import { EdmDocumentTemplate } from './entities/edm-document-template.entity';
import { EdmDocumentTemplateField } from './entities/edm-document-template-field.entity';
import { FileEntity } from '../files/entities/file.entity';
import { FileLinkEntity } from '../files/entities/file-link.entity';
import { FileAccessAuditEntity } from '../files/entities/file-access-audit.entity';
import { FileAttachmentsService } from '../files/file-attachments.service';
import { ScopeService } from '../iam/authorization/scope.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EdmDocument,
      EdmDocumentRoute,
      EdmRouteStage,
      EdmStageAction,
      EdmDocumentRegistrySequence,
      IamDelegation,
      EdmRouteTemplate,
      EdmRouteTemplateStage,
      EdmRegistrationJournal,
      EdmDocumentTaskLink,
      EdmAlert,
      EdmSavedFilter,
      EdmDocumentTemplate,
      EdmDocumentTemplateField,
      User,
      Department,
      Task,
      FileEntity,
      FileLinkEntity,
      FileAccessAuditEntity,
    ]),
  ],
  controllers: [EdmController],
  providers: [EdmService, FileAttachmentsService, ScopeService],
  exports: [EdmService],
})
export class EdmModule {}
