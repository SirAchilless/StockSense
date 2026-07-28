import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { formatPct, formatBps } from '../utils/format-rollover';
import type { RolloverData } from '../types/fno.types';

interface Props {
  data?: RolloverData;
  isLoading?: boolean;
  error?: Error | null;
}

function StatBlock({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: 'pos' | 'neg' | 'neutral' }) {
  const toneCls = tone === 'pos' ? 'text-gain' : tone === 'neg' ? 'text-loss' : 'text-foreground';
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className={`font-mono tabular-nums text-xl font-semibold ${toneCls}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-md p-5 animate-pulse">
      <div className="h-4 w-40 bg-muted rounded mb-4" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[0,1,2].map(i => <div key={i} className="space-y-2"><div className="h-3 w-20 bg-muted rounded" /><div className="h-6 w-24 bg-muted rounded" /></div>)}
      </div>
    </div>
  );
}

export function RolloverCard({ data, isLoading, error }: Props) {
  if (isLoading) return <Skeleton />;
  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
        Data unavailable: {error.message}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-md p-5 text-sm text-muted-foreground">
        Select a symbol to view rollover metrics.
      </div>
    );
  }

  const delta = data.rolloverPct - data.historicalAvgRolloverPct;
  const deltaTone = delta > 1 ? 'pos' : delta < -1 ? 'neg' : 'neutral';
  const Arrow = delta > 0.5 ? ArrowUp : delta < -0.5 ? ArrowDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-md p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Rollover — {data.symbol}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Near expiry {data.expiryNear} → Next {data.expiryNext}
          </p>
        </div>
        <div className={`flex items-center gap-1 text-sm font-mono tabular-nums ${
          deltaTone === 'pos' ? 'text-gain' : deltaTone === 'neg' ? 'text-loss' : 'text-muted-foreground'
        }`}>
          <Arrow className="h-4 w-4" />
          {delta > 0 ? '+' : ''}{delta.toFixed(1)} pp
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
        <StatBlock label="Rollover %" value={formatPct(data.rolloverPct, 1)} sub={`vs 3M avg ${formatPct(data.historicalAvgRolloverPct, 1)}`} tone={deltaTone} />
        <StatBlock label="Rollover Cost" value={formatBps(data.rolloverCostBps)} sub="annualised, basis points" />
        <StatBlock label="Historical Cost" value={formatBps(data.historicalAvgRolloverCostBps)} sub="avg rollover cost" />
      </div>
    </motion.div>
  );
}
