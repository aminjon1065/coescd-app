import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import jwtConfig from '../../iam/config/jwt.config';
import { IamModule } from '../../iam/iam.module';
import { DocumentsFacade } from './documents.facade';
import { DocumentController } from './controllers/document.controller';
import { DocumentService } from '../../document/document.service';
import { Document } from '../../document/entities/document.entity';
import { EdmController } from './controllers/edm.controller';
import { EdmService } from '../../edm/edm.service';
import { EdmCoreService } from '../../edm/edm-core.service';
import { EdmTemplatesService } from '../../edm/edm-templates.service';
import { EdmRegistrationService } from '../../edm/edm-registration.service';
import { EdmReportsService } from '../../edm/edm-reports.service';
import { EdmRouteService } from '../../edm/edm-route.service';
import { EdmDocumentService } from '../../edm/edm-document.service';
import { EdmEventListener } from '../../edm/edm-event.listener';
import { EdmDocument } from '../../edm/entities/edm-document.entity';
import { EdmDocumentRoute } from '../../edm/entities/edm-document-route.entity';
import { EdmRouteStage } from '../../edm/entities/edm-route-stage.entity';
import { EdmStageAction } from '../../edm/entities/edm-stage-action.entity';
import { EdmDocumentRegistrySequence } from '../../edm/entities/edm-document-registry-sequence.entity';
import { IamDelegation } from '../../edm/entities/iam-delegation.entity';
import { EdmRouteTemplate } from '../../edm/entities/edm-route-template.entity';
import { EdmRouteTemplateStage } from '../../edm/entities/edm-route-template-stage.entity';
import { EdmRegistrationJournal } from '../../edm/entities/edm-registration-journal.entity';
import { EdmDocumentTaskLink } from '../../edm/entities/edm-document-task-link.entity';
import { EdmAlert } from '../../edm/entities/edm-alert.entity';
import { EdmSavedFilter } from '../../edm/entities/edm-saved-filter.entity';
import { EdmDocumentTemplate } from '../../edm/entities/edm-document-template.entity';
import { EdmDocumentTemplateField } from '../../edm/entities/edm-document-template-field.entity';
import { EdmDocumentTimelineEvent } from '../../edm/entities/edm-document-timeline-event.entity';
import { EdmDocumentReply } from '../../edm/entities/edm-document-reply.entity';
import { EdmDocumentKind } from '../../edm/entities/edm-document-kind.entity';
import { EdmEnterpriseController } from './controllers/edm-enterprise.controller';
import { EdmCollaborationGateway } from './gateways/edm-collaboration.gateway';
import { EdmDocumentsService } from '../../edm-enterprise/services/edm-documents.service';
import { EdmVersionsService } from '../../edm-enterprise/services/edm-versions.service';
import { EdmWorkflowEngineService } from '../../edm-enterprise/services/edm-workflow-engine.service';
import { EdmPermissionsService } from '../../edm-enterprise/services/edm-permissions.service';
import { EdmCommentsService } from '../../edm-enterprise/services/edm-comments.service';
import { EdmAuditService } from '../../edm-enterprise/services/edm-audit.service';
import { EdmV2Document } from '../../edm-enterprise/entities/edm-document.entity';
import { EdmV2DocumentVersion } from '../../edm-enterprise/entities/edm-document-version.entity';
import { EdmV2DocumentPermission } from '../../edm-enterprise/entities/edm-document-permission.entity';
import { EdmV2WorkflowDefinition } from '../../edm-enterprise/entities/edm-workflow-definition.entity';
import { EdmV2WorkflowInstance } from '../../edm-enterprise/entities/edm-workflow-instance.entity';
import { EdmV2WorkflowAssignment } from '../../edm-enterprise/entities/edm-workflow-assignment.entity';
import { EdmV2WorkflowTransition } from '../../edm-enterprise/entities/edm-workflow-transition.entity';
import { EdmV2Comment } from '../../edm-enterprise/entities/edm-comment.entity';
import { EdmV2Attachment } from '../../edm-enterprise/entities/edm-attachment.entity';
import { EdmV2AuditLog } from '../../edm-enterprise/entities/edm-audit-log.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';
import { OrgUnit } from '../../iam/entities/org-unit.entity';
import { Task } from '../../task/entities/task.entity';
import { FileEntity } from '../../files/entities/file.entity';
import { FileLinkEntity } from '../../files/entities/file-link.entity';
import { FileAccessAuditEntity } from '../../files/entities/file-access-audit.entity';
import { FileAttachmentsService } from '../../files/file-attachments.service';

@Module({
  imports: [
    IamModule,
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    TypeOrmModule.forFeature([
      Document,
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
      EdmDocumentTimelineEvent,
      EdmDocumentReply,
      EdmDocumentKind,
      EdmV2Document,
      EdmV2DocumentVersion,
      EdmV2DocumentPermission,
      EdmV2WorkflowDefinition,
      EdmV2WorkflowInstance,
      EdmV2WorkflowAssignment,
      EdmV2WorkflowTransition,
      EdmV2Comment,
      EdmV2Attachment,
      EdmV2AuditLog,
      User,
      Department,
      OrgUnit,
      Task,
      FileEntity,
      FileLinkEntity,
      FileAccessAuditEntity,
    ]),
  ],
  controllers: [DocumentController, EdmController, EdmEnterpriseController],
  providers: [
    DocumentsFacade,
    DocumentService,
    EdmService,
    EdmCoreService,
    EdmTemplatesService,
    EdmRegistrationService,
    EdmReportsService,
    EdmRouteService,
    EdmDocumentService,
    EdmEventListener,
    EdmDocumentsService,
    EdmVersionsService,
    EdmWorkflowEngineService,
    EdmPermissionsService,
    EdmCommentsService,
    EdmAuditService,
    EdmCollaborationGateway,
    FileAttachmentsService,
  ],
  exports: [DocumentsFacade],
})
export class DocumentsModule {}
