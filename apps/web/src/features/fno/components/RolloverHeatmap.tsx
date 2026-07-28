import type { RolloverData } from '../types/fno.types';

interface Props {
  data?: RolloverData[];
  isLoading?: boolean;
  error?: Error | null;
}

function heatColor(rolloverPct: number, avgPct: number): string {
  const diff = rolloverPct - avgPct;
  if (diff > 5) return 'bg-emerald-500 text-white';
  if (diff > 0)
    return 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300';
  if (diff > -5) return 'bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-300';
  return 'bg-red-500 text-white';
}

function LoadingSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
      <div className="h-4 bg-muted rounded w-40 mb-3" />
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded" />
        ))}
      </div>
    </div>
  );
}

export function RolloverHeatmap({ data, isLoading, error }: Props) {
  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        Market-wide rollover data unavailable. Please try again.
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        No market-wide rollover data available.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Market-wide Rollover Heatmap</h3>
        <span className="text-xs text-muted-foreground">{data.length} symbols · EOD</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
        {data.map((r) => (
          <div
            key={r.symbol}
            className={`rounded-lg p-1.5 text-center cursor-default transition-opacity hover:opacity-80 ${heatColor(r.rolloverPercent, r.threeMonthAvgRollover)}`}
            title={`${r.symbol}: ${r.rolloverPercent.toFixed(1)}% (avg ${r.threeMonthAvgRollover.toFixed(1)}%)`}
          >
            <p className="text-xs font-bold leading-tight truncate">{r.symbol}</p>
            <p className="text-xs tabular-nums font-semibold">{r.rolloverPercent.toFixed(0)}%</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-500" /> {'>'}avg+5%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-200 dark:bg-emerald-900" /> above avg
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-200 dark:bg-red-900" /> below avg
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500" /> {'<'}avg-5%
        </span>
      </div>
    </div>
  );
}
