import { LucideIcon, FileIcon, ClipboardListIcon, ActivityIcon, AlertTriangleIcon } from 'lucide-react';
import { Role } from '@/enums/RoleEnum';
import { can } from '@/features/authz/can';
import { DashboardResponse, DashboardWidgetId } from '@/features/dashboard/types';
import { MetricWidgetCard } from '@/features/dashboard/widgets/MetricWidgetCard';
import { dashboardByRole } from '@/lib/dashboard-config';

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
};

function buildWidgetModel(dashboard: DashboardResponse, widgetId: DashboardWidgetId): WidgetModel | null {
  switch (widgetId) {
    case 'my_tasks':
      return {
        title: 'Мои задачи',
        value: dashboard.widgets.tasks.assignedToMe,
        subtitle: `В работе: ${dashboard.widgets.tasks.inProgress}`,
        icon: ClipboardListIcon,
      };
    case 'documents_in_route':
      return {
        title: 'Документы в маршруте',
        value: dashboard.widgets.edm.documentsInRoute,
        subtitle: `Черновики: ${dashboard.widgets.edm.documentsDraft}`,
        icon: FileIcon,
      };
    case 'my_approvals':
      return {
        title: 'Мои согласования',
        value: dashboard.widgets.edm.myApprovals,
        subtitle: `Непрочитанные алерты: ${dashboard.widgets.edm.myUnreadAlerts}`,
        icon: ActivityIcon,
      };
    case 'overdue_stages':
      return {
        title: 'Просрочки',
        value: dashboard.widgets.edm.overdueStages,
        subtitle: 'Этапы с превышенным сроком',
        icon: AlertTriangleIcon,
      };
    case 'department_users':
      if (!dashboard.widgets.department) {
        return null;
      }
      return {
        title: 'Сотрудники департамента',
        value: dashboard.widgets.department.departmentUsers,
      };
    case 'department_files':
      if (!dashboard.widgets.department) {
        return null;
      }
      return {
        title: 'Файлы департамента',
        value: dashboard.widgets.department.departmentFiles,
      };
    case 'admin_total_users':
      if (!dashboard.widgets.admin) {
        return null;
      }
      return { title: 'Пользователи', value: dashboard.widgets.admin.totalUsers };
    case 'admin_active_users':
      if (!dashboard.widgets.admin) {
        return null;
      }
      return { title: 'Активные пользователи', value: dashboard.widgets.admin.activeUsers };
    case 'admin_total_departments':
      if (!dashboard.widgets.admin) {
        return null;
      }
      return { title: 'Департаменты', value: dashboard.widgets.admin.totalDepartments };
    case 'admin_active_files':
      if (!dashboard.widgets.admin) {
        return null;
      }
      return { title: 'Активные файлы', value: dashboard.widgets.admin.activeFiles };
    case 'admin_active_routes':
      if (!dashboard.widgets.admin) {
        return null;
      }
      return { title: 'Активные маршруты', value: dashboard.widgets.admin.routeActiveTotal };
    case 'analytics_total_disasters':
      if (!dashboard.widgets.analytics) {
        return null;
      }
      return { title: 'ЧС всего', value: dashboard.widgets.analytics.totalDisasters };
    case 'analytics_active_disasters':
      if (!dashboard.widgets.analytics) {
        return null;
      }
      return { title: 'ЧС активные', value: dashboard.widgets.analytics.activeDisasters };
    case 'analytics_critical_disasters':
      if (!dashboard.widgets.analytics) {
        return null;
      }
      return { title: 'Критические ЧС', value: dashboard.widgets.analytics.criticalDisasters };
    case 'analytics_monitoring_disasters':
      if (!dashboard.widgets.analytics) {
        return null;
      }
      return { title: 'Мониторинг', value: dashboard.widgets.analytics.monitoringDisasters };
    default:
      return null;
  }
}

export function DashboardRenderer({ dashboard, role, permissions }: DashboardRendererProps) {
  const preset = dashboardByRole[role];
  const widgets = preset
    .filter((widget) =>
      can(
        {
          role,
          permissions,
        },
        {
          roles: widget.requiredRoles,
          anyPermissions: widget.requiredAnyPermissions,
        },
      ),
    )
    .map((widget) => buildWidgetModel(dashboard, widget.id))
    .filter((widget): widget is WidgetModel => widget !== null);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {widgets.map((widget) => (
        <MetricWidgetCard
          key={`${widget.title}-${widget.value}`}
          title={widget.title}
          value={widget.value}
          subtitle={widget.subtitle}
          icon={widget.icon}
        />
      ))}
    </div>
  );
}
