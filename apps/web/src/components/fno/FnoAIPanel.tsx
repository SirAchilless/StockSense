import type { FnoAnalysisResult } from '../../types/fno';

interface Props {
  result: FnoAnalysisResult;
  symbol: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</h4>
      <p className="text-sm text-foreground leading-relaxed">{children}</p>
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

export function FnoAIPanel({ result, symbol }: Props) {
  const { interpretation, disclaimer } = result;

  if (!interpretation.dataAvailable) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Insufficient data to generate F&O interpretation for {symbol}.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">AI F&O Interpretation — {symbol}</h3>
        <ConfidenceBadge value={interpretation.confidence} />
      </div>

      <Section title="Overall Scenario">{interpretation.overallNote}</Section>
      <Section title="Rollover Analysis">{interpretation.rolloverNote}</Section>
      <Section title="FII Positioning">{interpretation.fiiPositioningNote}</Section>
      <Section title="DII Positioning">{interpretation.diiPositioningNote}</Section>
      <Section title="Cost of Carry">{interpretation.costOfCarryNote}</Section>

      <p className="text-xs text-muted-foreground border-t border-border pt-3 leading-relaxed">
        ⚠ {disclaimer}
      </p>
    </div>
  );
}
