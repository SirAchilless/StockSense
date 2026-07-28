import type { OptionAnalysisResult } from '../../types/options';

interface Props {
  result: OptionAnalysisResult;
  symbol: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</h4>
      <div className="text-sm text-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 70 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
    pct >= 40 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
    'bg-red-500/10 text-red-600 dark:text-red-400';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {pct}% confidence
    </span>
  );
}

export function OptionAIPanel({ result, symbol }: Props) {
  const { interpretation, disclaimer } = result;

  if (!interpretation.dataAvailable) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Insufficient data to generate option chain interpretation for {symbol}.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">AI Option Chain Interpretation</h3>
        <ConfidenceBadge value={interpretation.confidence} />
      </div>

      <Section title="Market Bias (PCR · OI)">
        {interpretation.marketBiasNote}
      </Section>

      <Section title="Max Pain Analysis">
        {interpretation.maxPainNote}
      </Section>

      <Section title="Implied Volatility">
        {interpretation.ivNote}
      </Section>

      {interpretation.keyLevelNotes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Key OI Levels</h4>
          {interpretation.keyLevelNotes.map((kl) => (
            <div key={kl.strikePrice} className="rounded-md bg-muted/30 p-2.5">
              <span className="font-mono text-xs font-semibold text-primary mr-2">
                {kl.strikePrice.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-foreground">{kl.note}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground border-t border-border pt-3 leading-relaxed">
        ⚠ {disclaimer}
      </p>
    </div>
  );
}
