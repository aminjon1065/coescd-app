import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminMetricCard } from '@/features/zones/admin/dashboard/components/AdminMetricCard';

export function AccessHealthSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Матрица доступа и безопасность</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard title="Обновлений матрицы ролей" value={null} />
        <AdminMetricCard title="С расширенными правами" value={null} />
        <AdminMetricCard title="Неудачных входов (24ч)" value={null} />
        <AdminMetricCard title="Блокировок аккаунтов" value={null} />
      </CardContent>
    </Card>
  );
}

