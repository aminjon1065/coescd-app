'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { IWidget, WidgetType } from '@/interfaces/IAnalytics';
import { randomUUID } from 'crypto';

interface AddWidgetDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (widget: IWidget) => void;
}

const WIDGET_TYPES: { value: WidgetType; label: string }[] = [
  { value: 'kpi', label: 'KPI карточка' },
  { value: 'chart', label: 'График' },
  { value: 'text', label: 'Текстовый блок' },
];

const KPI_CODES = [
  { value: 'INC_TOTAL_30D', label: 'ЧС за 30 дней' },
  { value: 'INC_AVG_RESPONSE_7D', label: 'Ср. время реагирования' },
  { value: 'RES_UTILIZATION_RATE', label: 'Использование ресурсов' },
  { value: 'EDM_PENDING_APPROVALS', label: 'Документы на согласовании' },
  { value: 'INC_SEVERITY_AVG_7D', label: 'Средняя степень ЧС' },
];

export function AddWidgetDialog({ open, onClose, onAdd }: AddWidgetDialogProps) {
  const [type, setType] = useState<WidgetType>('kpi');
  const [title, setTitle] = useState('');
  const [kpiCode, setKpiCode] = useState('INC_TOTAL_30D');

  const handleAdd = () => {
    const widget: IWidget = {
      id: crypto.randomUUID(),
      type,
      title: title || (type === 'kpi' ? KPI_CODES.find(k => k.value === kpiCode)?.label ?? '' : 'Виджет'),
      config: type === 'kpi' ? { kpiCode } : {},
      layout: { x: 0, y: Infinity, w: 4, h: 3 },
    };
    onAdd(widget);
    setTitle('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Добавить виджет</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Тип виджета</Label>
            <Select value={type} onValueChange={(v) => setType(v as WidgetType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WIDGET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {type === 'kpi' && (
            <div className="space-y-1.5">
              <Label>Показатель KPI</Label>
              <Select value={kpiCode} onValueChange={setKpiCode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KPI_CODES.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Заголовок (необязательно)</Label>
            <Input placeholder="Оставьте пустым для авто" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleAdd}>Добавить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
