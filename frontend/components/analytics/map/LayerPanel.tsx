'use client';

import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapStore } from '@/lib/stores/map-store';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

const LAYER_ICONS: Record<string, string> = {
  boundary: '🗺️',
  risk_zone: '⚠️',
  incident: '🔴',
  heatmap: '🌡️',
  infrastructure: '🏥',
  weather: '🌧️',
};

interface LayerPanelProps {
  className?: string;
}

export function LayerPanel({ className }: LayerPanelProps) {
  const { layers, toggleLayer, setLayerOpacity } = useMapStore();

  return (
    <div className={cn('bg-card border rounded-xl p-3 w-64 shadow-lg', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Слои карты</span>
      </div>

      <div className="space-y-3">
        {layers.map((layer) => (
          <div key={layer.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`layer-${layer.id}`} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <span>{LAYER_ICONS[layer.type] ?? '📍'}</span>
                <span>{layer.name}</span>
              </Label>
              <Switch
                id={`layer-${layer.id}`}
                checked={layer.visible}
                onCheckedChange={() => toggleLayer(layer.id)}
              />
            </div>
            {layer.visible && (
              <div className="flex items-center gap-2 pl-5">
                <span className="text-[10px] text-muted-foreground w-12">Прозр.</span>
                <Slider
                  min={0} max={1} step={0.05}
                  value={[layer.opacity]}
                  onValueChange={([v]) => setLayerOpacity(layer.id, v)}
                  className="flex-1"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
