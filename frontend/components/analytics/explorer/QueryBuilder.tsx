'use client';

import { useState } from 'react';
import { Plus, Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { IQueryBuilderConfig } from '@/interfaces/IAnalytics';

const OPERATORS = ['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'ILIKE', 'IS NULL', 'IS NOT NULL'];

interface QueryBuilderProps {
  tables: string[];
  onExecute: (config: IQueryBuilderConfig) => void;
  loading?: boolean;
}

export function QueryBuilder({ tables, onExecute, loading }: QueryBuilderProps) {
  const [table, setTable] = useState('');
  const [filters, setFilters] = useState<Array<{ column: string; op: string; value: string }>>([]);
  const [orderBy, setOrderBy] = useState('');
  const [orderDir, setOrderDir] = useState<'ASC' | 'DESC'>('DESC');
  const [limit, setLimit] = useState(100);

  const addFilter = () => setFilters(f => [...f, { column: '', op: '=', value: '' }]);
  const removeFilter = (i: number) => setFilters(f => f.filter((_, idx) => idx !== i));
  const updateFilter = (i: number, key: string, val: string) =>
    setFilters(f => f.map((fi, idx) => idx === i ? { ...fi, [key]: val } : fi));

  const handleExecute = () => {
    if (!table) return;
    onExecute({
      table,
      filters: filters.filter(f => f.column).map(f => ({ column: f.column, op: f.op, value: f.value })),
      orderBy: orderBy || undefined,
      orderDir,
      limit,
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded-xl bg-card">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Таблица</label>
          <Select value={table} onValueChange={setTable}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите таблицу..." />
            </SelectTrigger>
            <SelectContent>
              {tables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-24">
          <label className="text-xs text-muted-foreground mb-1 block">Лимит</label>
          <Input
            type="number" min={1} max={1000} value={limit}
            onChange={e => setLimit(parseInt(e.target.value) || 100)}
          />
        </div>
      </div>

      {/* Filters */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-muted-foreground">Фильтры</label>
          <Button variant="ghost" size="sm" onClick={addFilter} className="h-6 px-2 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Добавить
          </Button>
        </div>
        {filters.map((f, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <Input placeholder="столбец" value={f.column} onChange={e => updateFilter(i, 'column', e.target.value)} className="flex-1 h-8 text-xs" />
            <Select value={f.op} onValueChange={v => updateFilter(i, 'op', v)}>
              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{OPERATORS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="значение" value={f.value} onChange={e => updateFilter(i, 'value', e.target.value)} className="flex-1 h-8 text-xs" />
            <Button variant="ghost" size="sm" onClick={() => removeFilter(i)} className="h-8 w-8 p-0">
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {/* Sorting */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Сортировка по</label>
          <Input placeholder="имя столбца" value={orderBy} onChange={e => setOrderBy(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="w-28">
          <label className="text-xs text-muted-foreground mb-1 block">Направление</label>
          <Select value={orderDir} onValueChange={v => setOrderDir(v as 'ASC' | 'DESC')}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DESC">DESC ↓</SelectItem>
              <SelectItem value="ASC">ASC ↑</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleExecute} disabled={!table || loading} className="w-full">
        <Play className="w-4 h-4 mr-2" />
        {loading ? 'Выполняется...' : 'Выполнить запрос'}
      </Button>
    </div>
  );
}
