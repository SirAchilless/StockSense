import type { SentimentLabel, ImpactLevel } from '../../types/news';

const SENTIMENT_STYLES: Record<SentimentLabel, string> = {
  bullish: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  bearish: 'border-red-500/40 bg-red-500/10 text-red-400',
  neutral: 'border-border bg-muted/50 text-muted-foreground',
};

const IMPACT_STYLES: Record<ImpactLevel, string> = {
  high:   'bg-amber-500/20 text-amber-400',
  medium: 'bg-blue-500/20 text-blue-400',
  low:    'bg-muted text-muted-foreground',
};

const SENTIMENT_LABEL: Record<SentimentLabel, string> = {
  bullish: '↑ Bullish',
  bearish: '↓ Bearish',
  neutral: '→ Neutral',
};

interface SentimentBadgeProps {
  sentiment: SentimentLabel;
  score?: number | null;
}

interface ImpactBadgeProps {
  impact: ImpactLevel;
}

export function SentimentBadge({ sentiment, score }: SentimentBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${SENTIMENT_STYLES[sentiment]}`}
      title={score != null ? `Score: ${score.toFixed(2)}` : undefined}
    >
      {SENTIMENT_LABEL[sentiment]}
      {score != null && (
        <span className="opacity-60">({score > 0 ? '+' : ''}{score.toFixed(2)})</span>
      )}
    </span>
  );
}

export function ImpactBadge({ impact }: ImpactBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${IMPACT_STYLES[impact]}`}>
      {impact}
    </span>
  );
}
