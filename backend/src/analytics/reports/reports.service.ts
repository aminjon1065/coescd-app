import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Disaster } from '../disasters/entities/disaster.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';
import { Task } from '../../task/entities/task.entity';
import { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';
import { Role } from '../../users/enums/role.enum';
import { Permission } from '../../iam/authorization/permission.type';
import { EdmDocument } from '../../edm/entities/edm-document.entity';
import { EdmRouteStage } from '../../edm/entities/edm-route-stage.entity';
import { EdmAlert } from '../../edm/entities/edm-alert.entity';
import { EdmDocumentRoute } from '../../edm/entities/edm-document-route.entity';
import { FileEntity } from '../../files/entities/file.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Disaster)
    private readonly disasterRepo: Repository<Disaster>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(EdmDocument)
    private readonly edmDocumentRepo: Repository<EdmDocument>,
    @InjectRepository(EdmRouteStage)
    private readonly edmRouteStageRepo: Repository<EdmRouteStage>,
    @InjectRepository(EdmAlert)
    private readonly edmAlertRepo: Repository<EdmAlert>,
    @InjectRepository(EdmDocumentRoute)
    private readonly edmRouteRepo: Repository<EdmDocumentRoute>,
    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,
  ) {}

  async getStats() {
    const [totalDisasters, activeDisasters, totalUsers, totalDepartments, totalTasks, activeTasks] =
      await Promise.all([
        this.disasterRepo.count(),
        this.disasterRepo.count({ where: { status: 'active' } }),
        this.userRepo.count(),
        this.departmentRepo.count(),
        this.taskRepo.count(),
        this.taskRepo.count({ where: { status: 'in_progress' } }),
      ]);

    return {
      totalDisasters,
      activeDisasters,
      totalUsers,
      totalDepartments,
      totalTasks,
      activeTasks,
    };
  }

  async getMyDashboard(actor: ActiveUserData) {
    const isAdmin = actor.role === Role.Admin;
    const isDepartmentHead = actor.role === Role.Manager;
    const isAnalyst =
      actor.permissions.includes(Permission.ANALYTICS_WRITE) ||
      actor.permissions.includes(Permission.GIS_WRITE);

    const scope = isAdmin
      ? 'global'
      : isDepartmentHead
        ? 'department'
        : 'self';
    const departmentId = actor.departmentId ?? null;
    const now = new Date();

    const taskBaseQb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoin('task.creator', 'creator')
      .leftJoin('task.receiver', 'receiver');
    if (isDepartmentHead && departmentId) {
      taskBaseQb
        .leftJoin('creator.department', 'creatorDepartment')
        .leftJoin('receiver.department', 'receiverDepartment')
        .andWhere(
          '(creatorDepartment.id = :departmentId OR receiverDepartment.id = :departmentId)',
          { departmentId },
        );
    }
    if (!isAdmin && !isDepartmentHead) {
      taskBaseQb.andWhere('(creator.id = :actorId OR receiver.id = :actorId)', {
        actorId: actor.sub,
      });
    }

    const edmDocBaseQb = this.edmDocumentRepo
      .createQueryBuilder('document')
      .leftJoin('document.creator', 'creator')
      .leftJoin('document.department', 'department')
      .where('document.deletedAt IS NULL');
    if (isDepartmentHead && departmentId) {
      edmDocBaseQb.andWhere('department.id = :departmentId', { departmentId });
    }
    if (!isAdmin && !isDepartmentHead) {
      edmDocBaseQb.andWhere('creator.id = :actorId', { actorId: actor.sub });
    }

    const [taskTotal, taskInProgress, taskNew, taskCompleted] = await Promise.all([
      taskBaseQb.clone().getCount(),
      taskBaseQb.clone().andWhere('task.status = :status', { status: 'in_progress' }).getCount(),
      taskBaseQb.clone().andWhere('task.status = :status', { status: 'new' }).getCount(),
      taskBaseQb.clone().andWhere('task.status = :status', { status: 'completed' }).getCount(),
    ]);

    const [myAssignedTasks, myCreatedTasks, unreadAlerts, myApprovals] = await Promise.all([
      this.taskRepo
        .createQueryBuilder('task')
        .leftJoin('task.receiver', 'receiver')
        .where('receiver.id = :actorId', { actorId: actor.sub })
        .getCount(),
      this.taskRepo
        .createQueryBuilder('task')
        .leftJoin('task.creator', 'creator')
        .where('creator.id = :actorId', { actorId: actor.sub })
        .getCount(),
      this.edmAlertRepo
        .createQueryBuilder('alert')
        .leftJoin('alert.recipientUser', 'recipientUser')
        .where('recipientUser.id = :actorId', { actorId: actor.sub })
        .andWhere('alert.status = :status', { status: 'unread' })
        .getCount(),
      this.edmRouteStageRepo
        .createQueryBuilder('stage')
        .leftJoin('stage.route', 'route')
        .leftJoin('stage.assigneeUser', 'assigneeUser')
        .where('stage.state = :stageState', { stageState: 'in_progress' })
        .andWhere('route.state = :routeState', { routeState: 'active' })
        .andWhere('assigneeUser.id = :actorId', { actorId: actor.sub })
        .getCount(),
    ]);

    const [documentsTotal, documentsInRoute, documentsDraft, documentsArchived] =
      await Promise.all([
        edmDocBaseQb.clone().getCount(),
        edmDocBaseQb.clone().andWhere('document.status = :status', { status: 'in_route' }).getCount(),
        edmDocBaseQb.clone().andWhere('document.status = :status', { status: 'draft' }).getCount(),
        edmDocBaseQb.clone().andWhere('document.status = :status', { status: 'archived' }).getCount(),
      ]);

    const overdueStagesBaseQb = this.edmRouteStageRepo
      .createQueryBuilder('stage')
      .leftJoin('stage.route', 'route')
      .leftJoin('route.document', 'document')
      .leftJoin('document.department', 'department')
      .leftJoin('document.creator', 'creator')
      .where('stage.state IN (:...states)', { states: ['pending', 'in_progress'] })
      .andWhere('stage.dueAt IS NOT NULL')
      .andWhere('stage.dueAt < :now', { now });

    if (isDepartmentHead && departmentId) {
      overdueStagesBaseQb.andWhere('department.id = :departmentId', { departmentId });
    }
    if (!isAdmin && !isDepartmentHead) {
      overdueStagesBaseQb.andWhere('creator.id = :actorId', { actorId: actor.sub });
    }

    const overdueStages = await overdueStagesBaseQb.getCount();

    const result: {
      generatedAt: string;
      scope: 'global' | 'department' | 'self';
      actor: {
        userId: number;
        role: Role;
        departmentId: number | null;
        isAnalyst: boolean;
      };
      widgets: Record<string, unknown>;
    } = {
      generatedAt: now.toISOString(),
      scope,
      actor: {
        userId: actor.sub,
        role: actor.role,
        departmentId,
        isAnalyst,
      },
      widgets: {
        tasks: {
          total: taskTotal,
          inProgress: taskInProgress,
          new: taskNew,
          completed: taskCompleted,
          assignedToMe: myAssignedTasks,
          createdByMe: myCreatedTasks,
        },
        edm: {
          documentsTotal,
          documentsInRoute,
          documentsDraft,
          documentsArchived,
          myUnreadAlerts: unreadAlerts,
          myApprovals,
          overdueStages,
        },
      },
    };

    if (isAdmin) {
      const [totalUsers, activeUsers, totalDepartments, activeFiles, routeActiveTotal] =
        await Promise.all([
          this.userRepo.count(),
          this.userRepo.count({ where: { isActive: true } }),
          this.departmentRepo.count(),
          this.fileRepo
            .createQueryBuilder('file')
            .where('file.status = :status', { status: 'active' })
            .getCount(),
          this.edmRouteRepo
            .createQueryBuilder('route')
            .where('route.state = :state', { state: 'active' })
            .getCount(),
        ]);

      result.widgets.admin = {
        totalUsers,
        activeUsers,
        totalDepartments,
        activeFiles,
        routeActiveTotal,
      };
    }

    if (isDepartmentHead && departmentId) {
      const [departmentUsers, departmentFiles] = await Promise.all([
        this.userRepo
          .createQueryBuilder('user')
          .leftJoin('user.department', 'department')
          .where('department.id = :departmentId', { departmentId })
          .getCount(),
        this.fileRepo
          .createQueryBuilder('file')
          .leftJoin('file.department', 'department')
          .where('department.id = :departmentId', { departmentId })
          .andWhere('file.status = :status', { status: 'active' })
          .getCount(),
      ]);

      result.widgets.department = {
        departmentUsers,
        departmentFiles,
      };
    }

    if (isAnalyst || isAdmin) {
      const disasterBaseQb = this.disasterRepo
        .createQueryBuilder('disaster')
        .leftJoin('disaster.department', 'department');
      if (!isAdmin && departmentId) {
        disasterBaseQb.andWhere('department.id = :departmentId', { departmentId });
      }

      const [totalDisasters, activeDisasters, criticalDisasters, monitoringDisasters] =
        await Promise.all([
          disasterBaseQb.clone().getCount(),
          disasterBaseQb.clone().andWhere('disaster.status = :status', { status: 'active' }).getCount(),
          disasterBaseQb
            .clone()
            .andWhere('disaster.severity = :severity', { severity: 'critical' })
            .getCount(),
          disasterBaseQb
            .clone()
            .andWhere('disaster.status = :status', { status: 'monitoring' })
            .getCount(),
        ]);

      result.widgets.analytics = {
        totalDisasters,
        activeDisasters,
        criticalDisasters,
        monitoringDisasters,
      };
    }

    return result;
  }
}
