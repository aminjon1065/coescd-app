import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { TmTask } from './entities/tm-task.entity';
import { TmTaskAssignment } from './entities/tm-task-assignment.entity';
import { TmTaskDelegationChain } from './entities/tm-task-delegation-chain.entity';
import { TmTaskHistory } from './entities/tm-task-history.entity';
import { TmTaskComment } from './entities/tm-task-comment.entity';
import { TmTaskChecklistItem } from './entities/tm-task-checklist-item.entity';
import { TmTaskBoard } from './entities/tm-task-board.entity';
import { TmTaskBoardColumn } from './entities/tm-task-board-column.entity';
import { TmTaskEscalationRule } from './entities/tm-task-escalation-rule.entity';

// Shared entities
import { User } from '../users/entities/user.entity';
import { Department } from '../department/entities/department.entity';
import { Notification } from '../notifications/entities/notification.entity';

// Services
import { TmTaskService } from './services/tm-task.service';
import { TmTaskDelegationService } from './services/tm-task-delegation.service';
import { TmTaskCommentService } from './services/tm-task-comment.service';
import { TmTaskBoardService } from './services/tm-task-board.service';
import { TmTaskWorkflowService } from './services/tm-task-workflow.service';
import { TmTaskReportingService } from './services/tm-task-reporting.service';
import { TmTaskCacheService } from './services/tm-task-cache.service';

// Gateway, Scheduler, Listeners
import { TaskGateway } from './gateways/task.gateway';
import { TaskEscalationScheduler } from './schedulers/task-escalation.scheduler';
import { TmTaskNotificationListener } from './listeners/tm-task-notification.listener';

// Controller
import { TaskManagementController } from './task-management.controller';

// IAM
import { IamModule } from '../iam/iam.module';
import jwtConfig from '../iam/config/jwt.config';

@Module({
  imports: [
    IamModule,
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    TypeOrmModule.forFeature([
      TmTask,
      TmTaskAssignment,
      TmTaskDelegationChain,
      TmTaskHistory,
      TmTaskComment,
      TmTaskChecklistItem,
      TmTaskBoard,
      TmTaskBoardColumn,
      TmTaskEscalationRule,
      // Shared
      User,
      Department,
      Notification,
    ]),
  ],
  controllers: [TaskManagementController],
  providers: [
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
  exports: [TmTaskService, TmTaskDelegationService, TaskGateway],
})
export class TaskManagementModule {}
