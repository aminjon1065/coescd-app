import {
  ActivityIcon,
  AlertTriangleIcon,
  ClipboardListIcon,
  FileIcon,
  LucideIcon,
  TimerIcon,
} from 'lucide-react';
import { Role } from '@/enums/RoleEnum';
import { can } from '@/features/authz/can';
import { DashboardResponse, DashboardWidgetId } from '@/features/dashboard/types';
import { MetricWidgetCard } from '@/features/dashboard/widgets/MetricWidgetCard';
import { dashboardByRole } from '@/lib/dashboard-config';
import { KpiVariant } from '@/components/ui/kpi-card';

interface DashboardRendererProps {
  dashboard: DashboardResponse;
  role: Role;
  permissions: string[];
}

type WidgetModel = {
  title: string;
  value: number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: KpiVariant;
  href?: string;
};

function buildWidgetModel(
  dashboard: DashboardResponse,
  widgetId: DashboardWidgetId,
): WidgetModel | null {
  switch (widgetId) {
    case 'my_tasks':
      return {
        title: 'Мои задачи',
        value: dashboard.widgets.tasks.assignedToMe,
        subtitle: `В работе: ${dashboard.widgets.tasks.inProgress}`,
        icon: ClipboardListIcon,
        href: '/dashboard/tasks',
      };

    case 'documents_in_route':
      return {
        title: 'Документы в маршруте',
        value: dashboard.widgets.edm.documentsInRoute,
        subtitle: `Черновики: ${dashboard.widgets.edm.documentsDraft}`,
        icon: FileIcon,
        href: '/dashboard/documentation',
      };

    case 'my_approvals':
      return {
        title: 'Мои согласования',
        value: dashboard.widgets.edm.myApprovals,
        subtitle: dashboard.widgets.edm.myUnreadAlerts > 0
          ? `⚠ ${dashboard.widgets.edm.myUnreadAlerts} непрочитанных алертов`
          : undefined,
        icon: ActivityIcon,
        variant: dashboard.widgets.edm.myApprovals > 0 ? 'warning' : 'default',
        href: '/dashboard/documentation/approvals',
      };

    case 'overdue_stages':
      return {
        title: 'Просрочки',
        value: dashboard.widgets.edm.overdueStages,
        subtitle: 'Этапы с превышенным сроком',
        icon: AlertTriangleIcon,
        variant: dashboard.widgets.edm.overdueStages > 0 ? 'danger' : 'default',
        href: '/dashboard/documentation',
      };

    case 'department_users':
      if (!dashboard.widgets.department) return null;
      return {
        title: 'Сотрудники департамента',
        value: dashboard.widgets.department.departmentUsers,
      };

    case 'department_files':
      if (!dashboard.widgets.department) return null;
      return {
        title: 'Файлы департамента',
        value: dashboard.widgets.department.departmentFiles,
        href: '/dashboard/files',
      };

    case 'admin_total_users':
      if (!dashboard.widgets.admin) return null;
      return {
        title: 'Пользователи',
        value: dashboard.widgets.admin.totalUsers,
        href: '/dashboard/users',
      };

    case 'admin_active_users':
      if (!dashboard.widgets.admin) return null;
      return {
        title: 'Активные пользователи',
        value: dashboard.widgets.admin.activeUsers,
      };

    case 'admin_total_departments':
      if (!dashboard.widgets.admin) return null;
      return {
        title: 'Департаменты',
        value: dashboard.widgets.admin.totalDepartments,
        href: '/dashboard/departments',
      };

    case 'admin_active_files':
      if (!dashboard.widgets.admin) return null;
      return {
        title: 'Активные файлы',
        value: dashboard.widgets.admin.activeFiles,
        href: '/dashboard/files',
      };

    case 'admin_active_routes':
      if (!dashboard.widgets.admin) return null;
      return {
        title: 'Активные маршруты',
        value: dashboard.widgets.admin.routeActiveTotal,
        href: '/dashboard/documentation',
      };

    case 'edm_avg_processing_hours':
      return {
        title: 'Среднее время обработки',
        value: dashboard.widgets.edm.avgProcessingHours,
        subtitle: 'Часов на маршрут (30 дн.)',
        icon: TimerIcon,
        variant:
          dashboard.widgets.edm.avgProcessingHours > 72
            ? 'warning'
            : 'default',
      };

    case 'analytics_total_disasters':
      if (!dashboard.widgets.analytics) return null;
      return {
        title: 'ЧС всего',
        value: dashboard.widgets.analytics.totalDisasters,
      };

    case 'analytics_active_disasters':
      if (!dashboard.widgets.analytics) return null;
      return {
        title: 'ЧС активные',
        value: dashboard.widgets.analytics.activeDisasters,
        variant: dashboard.widgets.analytics.activeDisasters > 0 ? 'warning' : 'default',
      };

    case 'analytics_critical_disasters':
      if (!dashboard.widgets.analytics) return null;
      return {
        title: 'Критические ЧС',
        value: dashboard.widgets.analytics.criticalDisasters,
        variant: dashboard.widgets.analytics.criticalDisasters > 0 ? 'danger' : 'default',
      };

    case 'analytics_monitoring_disasters':
      if (!dashboard.widgets.analytics) return null;
      return {
        title: 'Мониторинг',
        value: dashboard.widgets.analytics.monitoringDisasters,
      };

    default:
      return null;
  }
}

export function DashboardRenderer({ dashboard, role, permissions }: DashboardRendererProps) {
  const preset = dashboardByRole[role] ?? [];
  const widgets = preset
    .filter((widget) =>
      can({ role, permissions }, {
        roles: widget.requiredRoles,
        anyPermissions: widget.requiredAnyPermissions,
      }),
    )
    .map((widget) => buildWidgetModel(dashboard, widget.id))
    .filter((widget): widget is WidgetModel => widget !== null);

  if (!widgets.length) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {widgets.map((widget) => (
        <MetricWidgetCard
          key={`${widget.title}-${widget.value}`}
          title={widget.title}
          value={widget.value}
          subtitle={widget.subtitle}
          icon={widget.icon}
          variant={widget.variant}
          href={widget.href}
        />
      ))}
    </div>
  );
}
