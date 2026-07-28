import { motion } from 'framer-motion';
import { SentimentBadge, ImpactBadge } from './SentimentBadge';
import type { NewsItem } from '../../types/news';

interface Props {
  item: NewsItem;
  index?: number;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60)  return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24)   return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

export function NewsCard({ item, index = 0 }: Props) {
  return (
    <motion.a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-card/80"
    >
      {/* Top row: source, time, impact */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium">{item.source}</span>
        <span>·</span>
        <span>{timeAgo(item.publishedAt)}</span>
        {item.impact && (
          <>
            <span>·</span>
            <ImpactBadge impact={item.impact} />
          </>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
        {item.title}
      </h3>

      {/* Summary */}
      <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
        {item.summary}
      </p>

      {/* Footer: sentiment + affected */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {item.sentiment && (
          <SentimentBadge sentiment={item.sentiment} score={item.sentimentScore} />
        )}
        {item.affectedSymbols.length > 0 && (
          <div className="flex items-center gap-1">
            {item.affectedSymbols.slice(0, 4).map((sym) => (
              <span
                key={sym}
                className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {sym}
              </span>
            ))}
            {item.affectedSymbols.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{item.affectedSymbols.length - 4}</span>
            )}
          </div>
        )}
        {item.affectedSectors.length > 0 && (
          <div className="flex items-center gap-1">
            {item.affectedSectors.slice(0, 2).map((sec) => (
              <span
                key={sec}
                className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {sec}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Rationale (shown when AI-scored) */}
      {item.sentimentRationale && (
        <p className="text-[10px] text-muted-foreground border-t border-border pt-2 italic">
          {item.sentimentRationale}
        </p>
      )}
    </motion.a>
  );
}
