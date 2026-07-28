import { motion } from 'framer-motion';
import { usePortfolioAnalysis } from '../../hooks/usePortfolio';
import { ConfidenceBar } from '../research/ConfidenceBar';
import { DisclaimerBanner } from '../research/DisclaimerBanner';
import type { HoldingFlag, RiskLevel } from '../../types/portfolio';

// ── Score meter ───────────────────────────────────────────────────────────
function ScoreMeter({
  label,
  score,
  caption,
  tone,
}: {
  label: string;
  score: number;
  caption: string;
  tone: 'risk' | 'diversification';
}) {
  // Risk: higher = worse (green→red). Diversification: higher = better (red→green).
  const good =
    tone === 'risk' ? score < 34 : score >= 67;
  const mid = score >= 34 && score < 67;
  const color = good ? 'bg-emerald-500' : mid ? 'bg-amber-500' : 'bg-red-500';
  const textColor = good ? 'text-emerald-400' : mid ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={`font-mono text-xl font-semibold tabular-nums ${textColor}`}>{score}<span className="text-xs text-muted-foreground">/100</span></span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{caption}</span>
    </div>
  );
}

// ── Flag pill ───────────────────────────────────────────────────────────────
function FlagPill({ flag }: { flag: HoldingFlag }) {
  const styles: Record<HoldingFlag, string> = {
    strong: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    weak: 'border-red-500/30 bg-red-500/10 text-red-400',
    neutral: 'border-border bg-muted text-muted-foreground',
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${styles[flag]}`}>
      {flag}
    </span>
  );
}

const RISK_CAPTION: Record<RiskLevel, string> = {
  low: 'Well spread — low composition risk',
  moderate: 'Moderate concentration',
  high: 'Highly concentrated composition',
};

const DISCLAIMER_TEXT =
  'AI-generated portfolio analysis for informational purposes only. This is not investment advice. Scores are derived from portfolio composition, not a recommendation to buy or sell. StockSense is not a SEBI-registered investment adviser.';

export function PortfolioAIPanel({ enabled }: { enabled: boolean }) {
  const { data, isLoading, isError, error, refetch, isFetching } = usePortfolioAnalysis(enabled);

  if (!enabled) return null;

  if (isLoading || (isFetching && !data)) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-xl bg-muted" />
          <div className="h-24 rounded-xl bg-muted" />
        </div>
        <div className="h-40 rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError) {
    const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to generate analysis.';
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        {msg}{' '}
        <button onClick={() => refetch()} className="text-primary underline underline-offset-2">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, analysis } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <DisclaimerBanner text={DISCLAIMER_TEXT} />

      {/* Score meters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ScoreMeter
          label="Risk Score"
          score={metrics.riskScore}
          tone="risk"
          caption={RISK_CAPTION[metrics.riskLevel]}
        />
        <ScoreMeter
          label="Diversification"
          score={metrics.diversificationScore}
          tone="diversification"
          caption={`${metrics.holdingCount} holdings · ${metrics.sectorCount} sectors · ~${metrics.effectiveHoldings.toFixed(1)} effective`}
        />
      </div>

      {/* Overall assessment + confidence */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div>
          <h3 className="mb-1 text-sm font-medium text-foreground">Overall Assessment</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{analysis.overallAssessment}</p>
        </div>
        <ConfidenceBar confidence={analysis.confidence} />
      </div>

      {/* Risk + diversification commentary */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-1 text-sm font-medium text-foreground">Risk Commentary</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{analysis.riskCommentary}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-1 text-sm font-medium text-foreground">Diversification</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{analysis.diversificationCommentary}</p>
        </div>
      </div>

      {/* Sector allocation */}
      {metrics.sectorAllocation.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-medium text-foreground">Sector Allocation</h3>
          <div className="space-y-2">
            {metrics.sectorAllocation.map((s) => (
              <div key={s.sector} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-xs text-muted-foreground">{s.sector}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${s.weightPct}%` }} />
                </div>
                <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-foreground">
                  {s.weightPct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-holding scenario notes */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-medium text-foreground">Per-Holding Notes</h3>
        <div className="space-y-3">
          {metrics.holdings.map((h) => {
            const note = analysis.holdingNotes.find((n) => n.symbol === h.symbol)?.note;
            return (
              <div key={h.symbol} className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-foreground">{h.symbol}</span>
                  <FlagPill flag={h.flag} />
                  <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                    {h.weightPct.toFixed(1)}% · {h.sector}
                  </span>
                </div>
                {note && <p className="text-xs leading-relaxed text-muted-foreground">{note}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-right text-[10px] text-muted-foreground">
        Analysis as of {new Date(data.dataAsOf).toLocaleString('en-IN')}
      </p>
    </motion.div>
  );
}
