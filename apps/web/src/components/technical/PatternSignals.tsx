import type { CandlePattern } from '../../types/technical';

interface Props {
  patterns: CandlePattern[];
}

const SIGNAL_STYLES: Record<string, string> = {
  bullish: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  bearish: 'border-red-500/40 bg-red-500/10 text-red-400',
  neutral: 'border-border bg-muted/50 text-muted-foreground',
};

const SIGNAL_DOT: Record<string, string> = {
  bullish: 'bg-emerald-500',
  bearish: 'bg-red-500',
  neutral: 'bg-muted-foreground',
};

function formatPatternName(name: string) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PatternSignals({ patterns }: Props) {
  if (!patterns.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Pattern Recognition</p>
        <p className="text-sm text-muted-foreground">No classic candlestick patterns detected in this timeframe.</p>
      </div>
    );
  }

  // Show only the most recent 12 patterns (last in time)
  const visible = [...patterns].slice(-12).reverse();

  const bullCount = patterns.filter((p) => p.signal === 'bullish').length;
  const bearCount = patterns.filter((p) => p.signal === 'bearish').length;
  const neutral   = patterns.filter((p) => p.signal === 'neutral').length;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Pattern Recognition</p>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-400">{bullCount} bullish</span>
          <span className="text-red-400">{bearCount} bearish</span>
          {neutral > 0 && <span className="text-muted-foreground">{neutral} neutral</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {visible.map((p, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${SIGNAL_STYLES[p.signal]}`}
            title={p.description}
          >
            <span className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${SIGNAL_DOT[p.signal]}`} />
            <div>
              <p className="font-medium leading-tight">{formatPatternName(p.name)}</p>
              {p.time && (
                <p className="text-[10px] opacity-60 mt-0.5">{p.time}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Showing latest {visible.length} of {patterns.length} detected patterns. Patterns are informational only — not buy/sell signals.
      </p>
    </div>
  );
}
