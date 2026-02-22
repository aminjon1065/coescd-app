import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminMetricCard } from '@/features/zones/admin/dashboard/components/AdminMetricCard';

export function AccessHealthSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Access Matrix & Security</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard title="Recent role matrix updates" value={null} unavailableLabel="Backend metric not provided" />
        <AdminMetricCard title="Users with elevated permissions" value={null} unavailableLabel="Backend metric not provided" />
        <AdminMetricCard title="Failed logins (24h)" value={null} unavailableLabel="Backend metric not provided" />
        <AdminMetricCard title="Account lockouts" value={null} unavailableLabel="Backend metric not provided" />
      </CardContent>
    </Card>
  );
}

