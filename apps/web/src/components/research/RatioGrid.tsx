import type { ResearchRatios } from '../../types/research';

const RATIO_LABELS: Record<keyof ResearchRatios, string> = {
  pe: 'P/E Ratio',
  pb: 'P/B Ratio',
  roe: 'ROE',
  roce: 'ROCE',
  eps: 'EPS',
  debtToEquity: 'Debt/Equity',
};

export function RatioGrid({ ratios }: { ratios: ResearchRatios }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {(Object.entries(ratios) as [keyof ResearchRatios, number | null][]).map(([key, value]) => (
        <div key={key} className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">{RATIO_LABELS[key]}</p>
          <p
            className={`mt-1 font-mono text-lg font-medium tabular-nums ${
              value === null ? 'text-muted-foreground' : 'text-foreground'
            }`}
          >
            {value === null
              ? '—'
              : key === 'eps'
                ? `₹${value.toFixed(2)}`
                : key === 'debtToEquity'
                  ? value.toFixed(2)
                  : `${value.toFixed(1)}${['roe', 'roce'].includes(key) ? '%' : 'x'}`}
          </p>
          {value === null && (
            <p className="text-xs text-muted-foreground">Data unavailable</p>
          )}
        </div>
      ))}
    </div>
  );
}
