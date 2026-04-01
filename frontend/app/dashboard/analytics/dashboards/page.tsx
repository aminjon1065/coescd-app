'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, LayoutDashboard, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getDashboards, createDashboard } from '@/lib/api/analytics-platform';
import type { IDashboard } from '@/interfaces/IAnalytics';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function DashboardsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data: dashboards = [], isLoading } = useQuery({
    queryKey: ['dashboards'],
    queryFn: getDashboards,
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: () => createDashboard({ name, description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboards'] });
      setShowCreate(false);
      setName('');
      setDescription('');
    },
  });

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold">Дашборды</h1>
            <p className="text-xs text-muted-foreground">Настраиваемые аналитические панели</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Создать
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : dashboards.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <LayoutDashboard className="w-8 h-8 opacity-30" />
            <p className="text-sm">Нет дашбордов</p>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" /> Создать первый
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dashboards.map((d: IDashboard) => (
              <Link key={d.id} href={`/dashboard/analytics/dashboards/${d.id}`}>
                <div className="border rounded-xl p-5 bg-card hover:bg-muted/30 transition-colors cursor-pointer group h-full flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <LayoutDashboard className="w-5 h-5 text-blue-500" />
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="font-medium text-sm mb-1 flex-1">{d.name}</p>
                  {d.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{d.description}</p>}
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs text-muted-foreground">
                      {d.layout?.widgets?.length ?? 0} виджетов
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(d.updatedAt), { locale: ru, addSuffix: true })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новый дашборд</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Название</Label>
              <Input placeholder="Оперативный дашборд" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Описание (необязательно)</Label>
              <Input placeholder="Краткое описание..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Отмена</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
