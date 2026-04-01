'use client';

import { useState, useCallback } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetRenderer } from './WidgetRenderer';
import { AddWidgetDialog } from './AddWidgetDialog';
import { updateDashboard } from '@/lib/api/analytics-platform';
import type { IDashboard, IWidget } from '@/interfaces/IAnalytics';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
  dashboard: IDashboard;
  editable?: boolean;
}

export function DashboardGrid({ dashboard, editable = false }: DashboardGridProps) {
  const [widgets, setWidgets] = useState<IWidget[]>(dashboard.layout?.widgets ?? []);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const qc = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (ws: IWidget[]) => updateDashboard(dashboard.id, { layout: { widgets: ws } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard', dashboard.id] }),
  });

  const handleLayoutChange = useCallback((layouts: any[]) => {
    if (!editable) return;
    setWidgets(prev => prev.map(w => {
      const l = layouts.find((l: any) => l.i === w.id);
      if (!l) return w;
      return { ...w, layout: { x: l.x, y: l.y, w: l.w, h: l.h } };
    }));
  }, [editable]);

  const addWidget = (widget: IWidget) => {
    setWidgets(prev => [...prev, widget]);
    setShowAddDialog(false);
  };

  const removeWidget = (id: string) => setWidgets(prev => prev.filter(w => w.id !== id));

  const layouts = {
    lg: widgets.map(w => ({ i: w.id, ...w.layout, minW: 2, minH: 2 })),
  };

  return (
    <div className="flex flex-col gap-3">
      {editable && (
        <div className="flex items-center gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-1" /> Добавить виджет
          </Button>
          <Button size="sm" onClick={() => saveMutation.mutate(widgets)} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Сохранить
          </Button>
        </div>
      )}

      {widgets.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <p className="text-sm">Дашборд пуст</p>
          {editable && (
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-1" /> Добавить виджет
            </Button>
          )}
        </div>
      ) : (
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
          rowHeight={80}
          isDraggable={editable}
          isResizable={editable}
          onLayoutChange={handleLayoutChange}
          margin={[12, 12]}
        >
          {widgets.map(w => (
            <div key={w.id} className="bg-card border rounded-xl overflow-hidden relative group">
              {editable && (
                <button
                  onClick={() => removeWidget(w.id)}
                  className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-destructive text-white text-xs items-center justify-center hidden group-hover:flex"
                >
                  ×
                </button>
              )}
              <div className="px-3 pt-2 pb-0.5">
                <p className="text-xs font-medium text-muted-foreground truncate">{w.title}</p>
              </div>
              <div className="px-2 pb-2" style={{ height: w.layout.h * 80 - 40 }}>
                <WidgetRenderer widget={w} />
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}

      <AddWidgetDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} onAdd={addWidget} />
    </div>
  );
}
