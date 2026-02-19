import { Role } from '@/enums/RoleEnum';
import { DashboardWidgetConfig } from '@/features/dashboard/types';

export const adminDashboardPreset: DashboardWidgetConfig[] = [
  { id: 'my_tasks', title: 'Мои задачи', requiredRoles: [Role.Admin] },
  { id: 'documents_in_route', title: 'Документы в маршруте', requiredRoles: [Role.Admin] },
  { id: 'my_approvals', title: 'Мои согласования', requiredRoles: [Role.Admin] },
  { id: 'overdue_stages', title: 'Просрочки', requiredRoles: [Role.Admin] },
  { id: 'admin_total_users', title: 'Пользователи', requiredRoles: [Role.Admin] },
  { id: 'admin_active_users', title: 'Активные пользователи', requiredRoles: [Role.Admin] },
  { id: 'admin_total_departments', title: 'Департаменты', requiredRoles: [Role.Admin] },
  { id: 'admin_active_files', title: 'Активные файлы', requiredRoles: [Role.Admin] },
  { id: 'admin_active_routes', title: 'Активные маршруты', requiredRoles: [Role.Admin] },
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
  {
    id: 'analytics_critical_disasters',
    title: 'Критические ЧС',
    requiredAnyPermissions: ['analytics.read', 'reports.read'],
  },
  {
    id: 'analytics_monitoring_disasters',
    title: 'Мониторинг',
    requiredAnyPermissions: ['analytics.read', 'reports.read'],
  },
];

