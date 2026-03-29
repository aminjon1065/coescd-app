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
        <CardTitle>Здоровье организации</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard title="Всего подразделений" value={admin?.totalDepartments} />
        <AdminMetricCard title="Без руководителя" value={null} />
        <AdminMetricCard title="Корневых подразделений" value={null} />
        <AdminMetricCard title="Нарушения структуры" value={null} />
      </CardContent>
    </Card>
  );
}

