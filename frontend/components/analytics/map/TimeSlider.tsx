'use client';

import { Play, Pause, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useMapStore } from '@/lib/stores/map-store';
import { cn } from '@/lib/utils';

interface TimeSliderProps {
  from: Date;
  to: Date;
  className?: string;
}

export function TimeSlider({ from, to, className }: TimeSliderProps) {
  const { playbackTime, playbackPlaying, setPlaybackTime, setPlaybackPlaying } = useMapStore();

  const totalMs = to.getTime() - from.getTime();
  const current = playbackTime ?? from;
  const currentMs = current.getTime() - from.getTime();
  const sliderPct = totalMs > 0 ? (currentMs / totalMs) * 100 : 0;

  const handleSliderChange = ([pct]: number[]) => {
    const newTime = new Date(from.getTime() + (pct / 100) * totalMs);
    setPlaybackTime(newTime);
  };

  const togglePlay = () => setPlaybackPlaying(!playbackPlaying);
  const reset = () => { setPlaybackTime(from); setPlaybackPlaying(false); };

  return (
    <div className={cn('bg-card/95 backdrop-blur-sm border rounded-xl px-4 py-2 flex items-center gap-3 shadow-lg', className)}>
      <Button variant="ghost" size="sm" onClick={reset} className="h-7 w-7 p-0 shrink-0">
        <RotateCcw className="w-3.5 h-3.5" />
      </Button>

      <Button variant="ghost" size="sm" onClick={togglePlay} className="h-7 w-7 p-0 shrink-0">
        {playbackPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </Button>

      <div className="flex-1 min-w-0">
        <Slider
          min={0} max={100} step={0.5}
          value={[sliderPct]}
          onValueChange={handleSliderChange}
        />
      </div>

      <span className="text-xs text-muted-foreground shrink-0 tabular-nums w-24 text-right">
        {format(current, 'd MMM yyyy', { locale: ru })}
      </span>
    </div>
  );
}
