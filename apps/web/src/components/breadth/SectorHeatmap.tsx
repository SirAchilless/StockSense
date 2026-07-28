import type { SectorPerformance } from '../../types/breadth';

interface Props {
  sectors: SectorPerformance[];
}

function heatColor(pct: number): string {
  if (pct >= 2)   return 'bg-[hsl(142_76%_28%)] text-[hsl(142_76%_90%)]';
  if (pct >= 0.5) return 'bg-[hsl(142_60%_20%)] text-[hsl(142_76%_80%)]';
  if (pct >= 0)   return 'bg-[hsl(142_30%_14%)] text-[hsl(142_40%_65%)]';
  if (pct >= -0.5)return 'bg-[hsl(0_50%_14%)]  text-[hsl(0_60%_65%)]';
  if (pct >= -2)  return 'bg-[hsl(0_60%_20%)]  text-[hsl(0_76%_80%)]';
  return                 'bg-[hsl(0_76%_28%)]  text-[hsl(0_76%_90%)]';
}

export function SectorHeatmap({ sectors }: Props) {
  const sorted = [...sectors].sort((a, b) => b.changePercent - a.changePercent);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Sector Performance
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {sorted.map((s) => (
          <div
            key={s.sector}
            className={`rounded-lg p-3 transition-opacity hover:opacity-90 ${heatColor(s.changePercent)}`}
          >
            <p className="text-xs font-medium leading-tight">{s.sector}</p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
              {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
            </p>
            <p className="mt-0.5 text-xs opacity-75">
              {s.advances}↑ {s.declines}↓
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
