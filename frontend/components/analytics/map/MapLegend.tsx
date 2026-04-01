'use client';

const SEVERITY_COLORS = [
  { label: '1 — Минимальная', color: '#22c55e' },
  { label: '2 — Низкая', color: '#84cc16' },
  { label: '3 — Средняя', color: '#f59e0b' },
  { label: '4 — Высокая', color: '#ef4444' },
  { label: '5 — Критическая', color: '#7f1d1d' },
];

const RISK_TYPE_COLORS: Record<string, string> = {
  flood: '#3b82f6',
  earthquake: '#a855f7',
  landslide: '#f97316',
  wildfire: '#ef4444',
  avalanche: '#06b6d4',
};

export function MapLegend() {
  return (
    <div className="bg-card/95 backdrop-blur-sm border rounded-xl p-3 w-52 shadow-lg space-y-3">
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Степень ЧС</p>
        {SEVERITY_COLORS.map((s) => (
          <div key={s.label} className="flex items-center gap-2 mb-0.5">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Тип риска</p>
        {Object.entries(RISK_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2 mb-0.5">
            <div className="w-3 h-3 rounded shrink-0 opacity-60" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-muted-foreground capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
