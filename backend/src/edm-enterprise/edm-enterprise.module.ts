import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EdmEnterpriseController } from './edm-enterprise.controller';
import { EdmDocumentsService } from './services/edm-documents.service';
import { EdmVersionsService } from './services/edm-versions.service';
import { EdmWorkflowEngineService } from './services/edm-workflow-engine.service';
import { EdmPermissionsService } from './services/edm-permissions.service';
import { EdmCommentsService } from './services/edm-comments.service';
import { EdmAuditService } from './services/edm-audit.service';
import { EdmCollaborationGateway } from './gateways/edm-collaboration.gateway';
import { EdmV2Document } from './entities/edm-document.entity';
import { EdmV2DocumentVersion } from './entities/edm-document-version.entity';
import { EdmV2DocumentPermission } from './entities/edm-document-permission.entity';
import { EdmV2WorkflowDefinition } from './entities/edm-workflow-definition.entity';
import { EdmV2WorkflowInstance } from './entities/edm-workflow-instance.entity';
import { EdmV2WorkflowAssignment } from './entities/edm-workflow-assignment.entity';
import { EdmV2WorkflowTransition } from './entities/edm-workflow-transition.entity';
import { EdmV2Comment } from './entities/edm-comment.entity';
import { EdmV2Attachment } from './entities/edm-attachment.entity';
import { EdmV2AuditLog } from './entities/edm-audit-log.entity';
import { User } from '../users/entities/user.entity';
import { IamModule } from '../iam/iam.module';

@Module({
  imports: [
    IamModule,
    TypeOrmModule.forFeature([
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
    ]),
  ],
  controllers: [EdmEnterpriseController],
  providers: [
    EdmDocumentsService,
    EdmVersionsService,
    EdmWorkflowEngineService,
    EdmPermissionsService,
    EdmCommentsService,
    EdmAuditService,
    EdmCollaborationGateway,
  ],
  exports: [EdmDocumentsService, EdmPermissionsService, EdmAuditService],
})
export class EdmEnterpriseModule {}
