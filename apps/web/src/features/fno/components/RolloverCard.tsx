import { motion } from 'framer-motion';
import type { RolloverData } from '../types/fno.types';
import { rolloverDeltaLabel, rolloverDeltaHighlight } from '../utils/format-rollover';

interface Props {
  data?: RolloverData;
  isLoading?: boolean;
  error?: Error | null;
}

function LoadingSkeleton() {
  return (
    <div className="rounded-xl border border-border backdrop-blur-sm bg-card/80 p-4 animate-pulse space-y-3">
      <div className="h-4 bg-muted rounded w-28" />
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg bg-muted h-16" />
        ))}
      </div>
    </div>
  );
}

export function RolloverCard({ data, isLoading, error }: Props) {
  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        Rollover data unavailable. Please try again.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        No rollover data available.
      </div>
    );
  }

  const highlight = rolloverDeltaHighlight(data.rolloverPercent, data.threeMonthAvgRollover);
  const deltaLabel = rolloverDeltaLabel(data.rolloverPercent, data.threeMonthAvgRollover);
  const diff = +(data.rolloverPercent - data.threeMonthAvgRollover).toFixed(1);

  const highlightClass =
    highlight === 'positive'
      ? 'text-emerald-500'
      : highlight === 'negative'
        ? 'text-red-500'
        : 'text-foreground';

  const arrowIcon = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-border backdrop-blur-sm bg-card/80 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Rollover — {data.symbol}</h3>
        <span className="text-xs text-muted-foreground">Delayed</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Rollover %</p>
          <p className={`text-xl font-bold tabular-nums ${highlightClass}`}>
            {data.rolloverPercent.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">
            3M avg: {data.threeMonthAvgRollover.toFixed(1)}%
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">vs Average</p>
          <p className={`text-xl font-bold tabular-nums ${highlightClass}`}>
            {arrowIcon} {diff > 0 ? '+' : ''}
            {diff}pp
          </p>
          <p className={`text-xs font-medium ${highlightClass}`}>{deltaLabel}</p>
        </div>

        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Cost of Carry
          </p>
          <p
            className={`text-xl font-bold tabular-nums ${data.costOfCarryCurrent > 0 ? 'text-emerald-500' : 'text-red-500'}`}
          >
            {data.costOfCarryCurrent.toFixed(2)}%
          </p>
          <p className="text-xs text-muted-foreground">
            {data.costOfCarryCurrent > 0 ? 'Contango' : 'Backwardation'}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Days to Expiry
          </p>
          <p className="text-xl font-bold tabular-nums text-foreground">
            {data.daysToCurrentExpiry}
          </p>
          <p className="text-xs text-muted-foreground">{data.currentExpiry}</p>
        </div>
      </div>
    </motion.div>
  );
}
