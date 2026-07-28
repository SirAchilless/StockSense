import type { Timeframe } from '../../types/technical';

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '1Y'];

interface Props {
  value: Timeframe;
  onChange: (tf: Timeframe) => void;
}

export function TimeframeSelector({ value, onChange }: Props) {
  return (
    <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          className={`min-w-[40px] rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            value === tf
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}
