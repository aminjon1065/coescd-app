import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminMetricCardProps {
  title: string;
  value?: number | string | null;
  subtitle?: string;
  unavailableLabel?: string;
}

export function AdminMetricCard({
  title,
  value,
  subtitle,
  unavailableLabel = 'Not available',
}: AdminMetricCardProps) {
  const isUnavailable = value === null || value === undefined;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isUnavailable ? <span className="text-muted-foreground">-</span> : value}
        </div>
        <p className="text-xs text-muted-foreground">
          {isUnavailable ? unavailableLabel : (subtitle ?? '\u00A0')}
        </p>
      </CardContent>
    </Card>
  );
}

