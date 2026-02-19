import Link from 'next/link';
import { ShieldAlertIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getRouteTitle } from '@/features/navigation/route-metadata';

export const metadata = {
  title: getRouteTitle('forbidden'),
};

export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlertIcon className="h-5 w-5 text-red-600" />
            Доступ запрещен
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            У вашей учетной записи недостаточно прав для открытия этой страницы.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard">На дашборд</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-in">Сменить учетную запись</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

