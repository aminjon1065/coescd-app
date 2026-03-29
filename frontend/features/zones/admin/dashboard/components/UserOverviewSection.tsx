import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardResponse } from '@/features/dashboard/types';
import { AdminMetricCard } from '@/features/zones/admin/dashboard/components/AdminMetricCard';

interface UserOverviewSectionProps {
  dashboard: DashboardResponse | null;
}

export function UserOverviewSection({ dashboard }: UserOverviewSectionProps) {
  const admin = dashboard?.widgets.admin;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Пользователи и доступ</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard title="Всего пользователей" value={admin?.totalUsers} />
        <AdminMetricCard title="Активных пользователей" value={admin?.activeUsers} />
        <AdminMetricCard title="Отключённых пользователей" value={null} />
        <AdminMetricCard title="Без подразделения" value={null} />
        <AdminMetricCard title="С индивидуальными правами" value={null} />
      </CardContent>
    </Card>
  );
}

