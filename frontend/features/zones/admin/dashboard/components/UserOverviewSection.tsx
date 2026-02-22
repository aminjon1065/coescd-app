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
        <CardTitle>User & Access Overview</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard title="Total users" value={admin?.totalUsers} />
        <AdminMetricCard title="Active users" value={admin?.activeUsers} />
        <AdminMetricCard title="Disabled users" value={null} unavailableLabel="Backend metric not provided" />
        <AdminMetricCard title="Users without department" value={null} unavailableLabel="Backend metric not provided" />
        <AdminMetricCard title="Users with custom permissions" value={null} unavailableLabel="Backend metric not provided" />
      </CardContent>
    </Card>
  );
}

