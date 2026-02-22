import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminMetricCard } from '@/features/zones/admin/dashboard/components/AdminMetricCard';

export function SystemHealthSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Health</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard title="API status" value={null} unavailableLabel="Backend metric not provided" />
        <AdminMetricCard title="Last migration applied" value={null} unavailableLabel="Backend metric not provided" />
        <AdminMetricCard title="Redis health" value={null} unavailableLabel="Backend metric not provided" />
        <AdminMetricCard title="DB health" value={null} unavailableLabel="Backend metric not provided" />
      </CardContent>
    </Card>
  );
}

