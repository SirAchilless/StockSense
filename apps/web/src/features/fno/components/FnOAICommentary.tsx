import { AIDisclaimer } from '../../../components/ui/AIDisclaimer';
import type { FnoAnalysisResult } from '../types/fno.types';

interface Props {
  result?: FnoAnalysisResult;
  symbol: string;
  isLoading?: boolean;
  error?: Error | null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h4>
      <p className="text-sm text-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const cls =
    pct >= 70
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : pct >= 40
        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        : 'bg-red-500/10 text-red-600 dark:text-red-400';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {pct}% confidence
    </span>
  );
}

export function FnOAICommentary({ result, symbol, isLoading, error }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Generating F&O intelligence interpretation…
        </div>
        {/* Disclaimer must always render — even during loading */}
        <div className="mt-3 pt-3 border-t border-border">
          <AIDisclaimer />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 space-y-3">
        <p className="text-sm text-destructive">
          Failed to generate AI interpretation. Please try again.
        </p>
        <AIDisclaimer />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          No AI interpretation available for {symbol}.
        </p>
        <AIDisclaimer />
      </div>
    );
  }

  if (!result.interpretation.dataAvailable) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Data unavailable: insufficient F&O data to generate interpretation for {symbol}.
        </p>
        <AIDisclaimer />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">AI F&O Interpretation — {symbol}</h3>
        <ConfidenceBadge value={result.interpretation.confidence} />
      </div>

      <Section title="Overall Scenario">{result.interpretation.overallNote}</Section>
      <Section title="Rollover Analysis">{result.interpretation.rolloverNote}</Section>
      <Section title="FII Positioning">{result.interpretation.fiiPositioningNote}</Section>
      <Section title="DII Positioning">{result.interpretation.diiPositioningNote}</Section>
      <Section title="Cost of Carry">{result.interpretation.costOfCarryNote}</Section>

      {/* AIDisclaimer must always be visible on every render */}
      <div className="pt-3 border-t border-border">
        <AIDisclaimer />
      </div>
    </div>
  );
}
