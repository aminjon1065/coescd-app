import { Role } from '@/enums/RoleEnum';
import { DashboardWidgetConfig } from '@/features/dashboard/types';

export const managerDashboardPreset: DashboardWidgetConfig[] = [
  { id: 'my_tasks', title: 'Мои задачи', requiredRoles: [Role.Manager] },
  { id: 'documents_in_route', title: 'Документы в маршруте', requiredRoles: [Role.Manager] },
  { id: 'my_approvals', title: 'Мои согласования', requiredRoles: [Role.Manager] },
  { id: 'overdue_stages', title: 'Просрочки', requiredRoles: [Role.Manager] },
  { id: 'department_users', title: 'Сотрудники департамента', requiredRoles: [Role.Manager] },
  { id: 'department_files', title: 'Файлы департамента', requiredRoles: [Role.Manager] },
  {
    id: 'analytics_total_disasters',
    title: 'ЧС всего',
    requiredAnyPermissions: ['analytics.read', 'reports.read'],
  },
  {
    id: 'analytics_active_disasters',
    title: 'ЧС активные',
    requiredAnyPermissions: ['analytics.read', 'reports.read'],
  },
];

