import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardResponse } from '@/features/dashboard/types';
import { AdminMetricCard } from '@/features/zones/admin/dashboard/components/AdminMetricCard';

interface OrgHealthSectionProps {
  dashboard: DashboardResponse | null;
}

export function OrgHealthSection({ dashboard }: OrgHealthSectionProps) {
  const admin = dashboard?.widgets.admin;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Health</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard title="Total departments" value={admin?.totalDepartments} />
        <AdminMetricCard title="Departments without chief" value={null} unavailableLabel="Backend metric not provided" />
        <AdminMetricCard title="Root-level departments" value={null} unavailableLabel="Backend metric not provided" />
        <AdminMetricCard title="Invalid org structures" value={null} unavailableLabel="Backend metric not provided" />
      </CardContent>
    </Card>
  );
}

