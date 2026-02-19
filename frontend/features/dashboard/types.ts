import { Role } from '@/enums/RoleEnum';

export type DashboardScope = 'global' | 'department' | 'self';

export interface DashboardResponse {
  generatedAt: string;
  scope: DashboardScope;
  actor: {
    userId: number;
    role: Role;
    departmentId: number | null;
    isAnalyst: boolean;
  };
  widgets: {
    tasks: {
      total: number;
      inProgress: number;
      new: number;
      completed: number;
      assignedToMe: number;
      createdByMe: number;
    };
    edm: {
      documentsTotal: number;
      documentsInRoute: number;
      documentsDraft: number;
      documentsArchived: number;
      myUnreadAlerts: number;
      myApprovals: number;
      overdueStages: number;
    };
    admin?: {
      totalUsers: number;
      activeUsers: number;
      totalDepartments: number;
      activeFiles: number;
      routeActiveTotal: number;
    };
    department?: {
      departmentUsers: number;
      departmentFiles: number;
    };
    analytics?: {
      totalDisasters: number;
      activeDisasters: number;
      criticalDisasters: number;
      monitoringDisasters: number;
    };
  };
}

export type DashboardWidgetId =
  | 'my_tasks'
  | 'documents_in_route'
  | 'my_approvals'
  | 'overdue_stages'
  | 'department_users'
  | 'department_files'
  | 'admin_total_users'
  | 'admin_active_users'
  | 'admin_total_departments'
  | 'admin_active_files'
  | 'admin_active_routes'
  | 'analytics_total_disasters'
  | 'analytics_active_disasters'
  | 'analytics_critical_disasters'
  | 'analytics_monitoring_disasters';

export interface DashboardWidgetConfig {
  id: DashboardWidgetId;
  title: string;
  requiredRoles?: Role[];
  requiredAnyPermissions?: string[];
}

