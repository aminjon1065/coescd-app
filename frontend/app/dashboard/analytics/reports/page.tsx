'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FileText, Plus, Download, Loader2, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getReports, requestReport } from '@/lib/api/analytics-platform';
import type { IReport } from '@/interfaces/IAnalytics';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const TEMPLATES = [
  { id: 'operational_summary', name: 'Оперативная сводка по ЧС' },
  { id: 'resource_report', name: 'Ресурсный отчёт' },
  { id: 'geo_analysis', name: 'Геопространственный анализ' },
  { id: 'kpi_digest', name: 'KPI дайджест' },
];

const STATUS_ICON: Record<string, React.ReactNode> = {
  completed:  <CheckCircle2 className="w-4 h-4 text-green-500" />,
  generating: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
  pending:    <Clock className="w-4 h-4 text-amber-500" />,
  failed:     <AlertCircle className="w-4 h-4 text-red-500" />,
};

const STATUS_LABEL: Record<string, string> = {
  completed:  'Готов',
  generating: 'Генерация',
  pending:    'В очереди',
  failed:     'Ошибка',
};

export default function ReportsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [templateId, setTemplateId] = useState('operational_summary');

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: getReports,
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: () => requestReport({ template: templateId, params: {} }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      setShowCreate(false);
    },
  });

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold">Отчёты</h1>
            <p className="text-xs text-muted-foreground">PDF и Excel генерация по шаблонам</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Создать отчёт
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <FileText className="w-8 h-8 opacity-30" />
            <p className="text-sm">Нет отчётов</p>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" /> Первый отчёт
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((r: IReport) => (
              <div key={r.id} className="flex items-center justify-between border rounded-xl px-4 py-3 bg-card">
                <div className="flex items-center gap-3">
                  {STATUS_ICON[r.status] ?? <RefreshCw className="w-4 h-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium">{TEMPLATES.find(t => t.id === r.template)?.name ?? r.template}</p>
                    <p className="text-xs text-muted-foreground">
                      {STATUS_LABEL[r.status] ?? r.status} · {formatDistanceToNow(new Date(r.requestedAt), { locale: ru, addSuffix: true })}
                    </p>
                  </div>
                </div>
                {r.status === 'completed' && r.fileKey && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/api/analytics/reports/${r.id}/download`} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-1.5" /> Скачать
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Создать отчёт</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Шаблон</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Отмена</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Сгенерировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
