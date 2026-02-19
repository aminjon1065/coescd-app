import { ShieldAlertIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AccessDeniedCardProps {
  title?: string;
  description?: string;
}

export function AccessDeniedCard({
  title = 'Доступ ограничен',
  description = 'У вас недостаточно прав для просмотра этой страницы.',
}: AccessDeniedCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlertIcon className="h-5 w-5 text-red-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

