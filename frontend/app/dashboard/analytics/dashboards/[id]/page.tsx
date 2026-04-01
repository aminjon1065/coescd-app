'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Loader2, Pencil, Eye, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardGrid } from '@/components/analytics/dashboard/DashboardGrid';
import { getDashboard } from '@/lib/api/analytics-platform';
import Link from 'next/link';

export default function DashboardViewerPage() {
  const { id } = useParams<{ id: string }>();
  const [editable, setEditable] = useState(false);

  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['dashboard', id],
    queryFn: () => getDashboard(id),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <p className="text-sm text-muted-foreground">Дашборд не найден</p>
        <Link href="/dashboard/analytics/dashboards">
          <Button variant="outline" size="sm">Назад к списку</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/analytics/dashboards">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">{dashboard.name}</h1>
            {dashboard.description && (
              <p className="text-xs text-muted-foreground">{dashboard.description}</p>
            )}
          </div>
        </div>
        <Button
          variant={editable ? 'default' : 'outline'}
          size="sm"
          onClick={() => setEditable(e => !e)}
        >
          {editable ? (
            <><Eye className="w-4 h-4 mr-1.5" /> Просмотр</>
          ) : (
            <><Pencil className="w-4 h-4 mr-1.5" /> Редактировать</>
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <DashboardGrid dashboard={dashboard} editable={editable} />
      </div>
    </div>
  );
}
