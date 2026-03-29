import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminMetricCard } from '@/features/zones/admin/dashboard/components/AdminMetricCard';

export function SystemHealthSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Состояние системы</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard title="Статус API" value={null} />
        <AdminMetricCard title="Последняя миграция" value={null} />
        <AdminMetricCard title="Redis" value={null} />
        <AdminMetricCard title="База данных" value={null} />
      </CardContent>
    </Card>
  );
}

