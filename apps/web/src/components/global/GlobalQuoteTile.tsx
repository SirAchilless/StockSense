import type { GlobalQuote } from '../../types/global-markets';

const CATEGORY_LABEL: Record<string, string> = {
  equity: 'Equity',
  commodity: 'Commodity',
  forex: 'Forex',
  crypto: 'Crypto',
};

interface Props {
  quote: GlobalQuote;
}

export function GlobalQuoteTile({ quote }: Props) {
  const isUp = quote.changePercent >= 0;
  const color = isUp ? 'text-[hsl(142_76%_36%)]' : 'text-destructive';
  const bgColor = isUp ? 'bg-[hsl(142_76%_36%)]/10' : 'bg-destructive/10';

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'JPY' || currency === 'HKD') {
      return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    if (price >= 10000) {
      return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-foreground">{quote.name}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${bgColor} ${color}`}>
          {CATEGORY_LABEL[quote.category] ?? quote.category}
        </span>
      </div>

      <p className="font-mono text-xl font-semibold tabular-nums text-foreground">
        {formatPrice(quote.price, quote.currency)}{' '}
        <span className="text-xs font-normal text-muted-foreground">{quote.currency}</span>
      </p>

      <p className={`mt-1 font-mono text-sm tabular-nums ${color}`}>
        {isUp ? '+' : ''}{quote.changePercent.toFixed(2)}%
        <span className="ml-1 text-xs text-muted-foreground">
          ({isUp ? '+' : ''}{quote.change.toFixed(2)})
        </span>
      </p>
    </div>
  );
}
