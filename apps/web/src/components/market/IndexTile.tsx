import { motion } from 'framer-motion';
import type { IndexQuote } from '../../types/market';

interface IndexTileProps {
  quote: IndexQuote;
  index: number;
}

function formatPrice(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

export function IndexTile({ quote, index }: IndexTileProps) {
  const isGain = quote.change >= 0;
  const colorClass = isGain ? 'text-gain' : 'text-loss';
  const bgMutedClass = isGain ? 'bg-gain-muted' : 'bg-loss-muted';

  // Day high/low range bar: position of current price within the day range
  const range = quote.dayHigh - quote.dayLow;
  const rangePercent = range > 0 ? ((quote.price - quote.dayLow) / range) * 100 : 50;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay: index * 0.05 }}
      className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 backdrop-blur-sm"
    >
      {/* Header: name + change badge */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
          {quote.name}
        </span>
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${bgMutedClass} ${colorClass}`}
        >
          {isGain ? '+' : ''}
          {quote.changePercent.toFixed(2)}%
        </span>
      </div>

      {/* Price */}
      <span
        key={quote.price}
        className={`font-mono tabular-nums text-3xl font-semibold tracking-tight text-foreground animate-number-tick`}
      >
        {formatPrice(quote.price)}
      </span>

      {/* Change */}
      <div className={`flex items-center gap-1 text-sm font-mono tabular-nums ${colorClass}`}>
        <span>{isGain ? '▲' : '▼'}</span>
        <span>
          {isGain ? '+' : ''}
          {formatPrice(Math.abs(quote.change))}
        </span>
        <span className="text-muted-foreground ml-1">
          ({isGain ? '+' : ''}
          {quote.changePercent.toFixed(2)}%)
        </span>
      </div>

      {/* Day high / low range bar */}
      <div className="flex flex-col gap-1">
        <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-primary/40"
            style={{ width: `${rangePercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs font-mono tabular-nums text-muted-foreground">
          <span>L {formatPrice(quote.dayLow)}</span>
          <span>H {formatPrice(quote.dayHigh)}</span>
        </div>
      </div>

      {/* Last updated */}
      <p className="text-xs text-muted-foreground/60 mt-auto">
        Updated {formatTime(quote.lastUpdated)} IST
      </p>
    </motion.div>
  );
}

export function IndexTileSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-5 w-14 rounded-md bg-muted" />
      </div>
      <div className="h-9 w-40 rounded bg-muted" />
      <div className="h-4 w-28 rounded bg-muted" />
      <div className="flex flex-col gap-1">
        <div className="h-1.5 w-full rounded-full bg-muted" />
        <div className="flex justify-between">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
      </div>
      <div className="h-3 w-32 rounded bg-muted mt-auto" />
    </div>
  );
}
