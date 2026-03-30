import { Role } from '@/enums/RoleEnum';
import { DashboardWidgetConfig } from '@/features/dashboard/types';

export const adminDashboardPreset: DashboardWidgetConfig[] = [
  { id: 'admin_total_users', title: 'Пользователи', requiredRoles: [Role.Admin] },
  { id: 'admin_active_users', title: 'Активные пользователи', requiredRoles: [Role.Admin] },
  { id: 'admin_total_departments', title: 'Департаменты', requiredRoles: [Role.Admin] },
  { id: 'admin_active_files', title: 'Активные файлы', requiredRoles: [Role.Admin] },
  { id: 'admin_active_routes', title: 'Активные маршруты', requiredRoles: [Role.Admin] },
  { id: 'edm_avg_processing_hours', title: 'Среднее время обработки', requiredRoles: [Role.Admin] },
];
