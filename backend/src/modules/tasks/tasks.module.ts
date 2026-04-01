import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import jwtConfig from '../../iam/config/jwt.config';
import { IamModule } from '../../iam/iam.module';
import { TasksFacade } from './tasks.facade';
import { TaskController } from './controllers/task.controller';
import { TaskManagementController } from './controllers/task-management.controller';
import { TaskService } from '../../task/task.service';
import { Task } from '../../task/entities/task.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { FileEntity } from '../../files/entities/file.entity';
import { FileLinkEntity } from '../../files/entities/file-link.entity';
import { FileAccessAuditEntity } from '../../files/entities/file-access-audit.entity';
import { FileAttachmentsService } from '../../files/file-attachments.service';
import { TmTask } from '../../task-management/entities/tm-task.entity';
import { TmTaskAssignment } from '../../task-management/entities/tm-task-assignment.entity';
import { TmTaskDelegationChain } from '../../task-management/entities/tm-task-delegation-chain.entity';
import { TmTaskHistory } from '../../task-management/entities/tm-task-history.entity';
import { TmTaskComment } from '../../task-management/entities/tm-task-comment.entity';
import { TmTaskChecklistItem } from '../../task-management/entities/tm-task-checklist-item.entity';
import { TmTaskBoard } from '../../task-management/entities/tm-task-board.entity';
import { TmTaskBoardColumn } from '../../task-management/entities/tm-task-board-column.entity';
import { TmTaskEscalationRule } from '../../task-management/entities/tm-task-escalation-rule.entity';
import { TmTaskService } from '../../task-management/services/tm-task.service';
import { TmTaskDelegationService } from '../../task-management/services/tm-task-delegation.service';
import { TmTaskCommentService } from '../../task-management/services/tm-task-comment.service';
import { TmTaskBoardService } from '../../task-management/services/tm-task-board.service';
import { TmTaskWorkflowService } from '../../task-management/services/tm-task-workflow.service';
import { TmTaskReportingService } from '../../task-management/services/tm-task-reporting.service';
import { TmTaskCacheService } from '../../task-management/services/tm-task-cache.service';
import { TaskGateway } from './gateways/task.gateway';
import { TaskEscalationScheduler } from '../../task-management/schedulers/task-escalation.scheduler';
import { TmTaskNotificationListener } from '../../task-management/listeners/tm-task-notification.listener';

@Module({
  imports: [
    IamModule,
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    TypeOrmModule.forFeature([
      Task,
      TmTask,
      TmTaskAssignment,
      TmTaskDelegationChain,
      TmTaskHistory,
      TmTaskComment,
      TmTaskChecklistItem,
      TmTaskBoard,
      TmTaskBoardColumn,
      TmTaskEscalationRule,
      User,
      Department,
      Notification,
      FileEntity,
      FileLinkEntity,
      FileAccessAuditEntity,
    ]),
  ],
  controllers: [TaskController, TaskManagementController],
  providers: [
    TasksFacade,
    TaskService,
    FileAttachmentsService,
    TmTaskCacheService,
    TmTaskService,
    TmTaskDelegationService,
    TmTaskCommentService,
    TmTaskBoardService,
    TmTaskWorkflowService,
    TmTaskReportingService,
    TaskGateway,
    TaskEscalationScheduler,
    TmTaskNotificationListener,
  ],
  exports: [TasksFacade, TaskService, TmTaskService, TmTaskDelegationService, TaskGateway],
})
export class TasksModule {}
