import type { BreadthStock } from '../../types/breadth';

interface Props {
  title: string;
  stocks: BreadthStock[];
  variant: 'gainers' | 'losers';
}

function formatVol(v: number): string {
  if (v >= 10_000_000) return `${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000)    return `${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000)      return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export function GainersLosersTable({ title, stocks, variant }: Props) {
  const isGainers = variant === 'gainers';
  const color = isGainers ? 'text-[hsl(142_76%_36%)]' : 'text-destructive';

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className={`text-xs font-medium ${color}`}>{stocks.length} stocks</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Symbol</th>
              <th className="px-4 py-2 text-right font-medium">Price</th>
              <th className="px-4 py-2 text-right font-medium">Chg%</th>
              <th className="px-4 py-2 text-right font-medium hidden sm:table-cell">Volume</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((s, i) => (
              <tr key={s.symbol} className={`border-b border-border/50 transition-colors hover:bg-muted/30 ${i === stocks.length - 1 ? 'border-none' : ''}`}>
                <td className="px-4 py-2.5">
                  <span className="font-medium text-foreground">{s.symbol}</span>
                  <span className="ml-1.5 hidden text-xs text-muted-foreground sm:inline truncate max-w-[120px]">{s.name}</span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums text-foreground">
                  ₹{s.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={`px-4 py-2.5 text-right font-mono tabular-nums font-medium ${color}`}>
                  {isGainers ? '+' : ''}{s.changePercent.toFixed(2)}%
                </td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums text-muted-foreground hidden sm:table-cell">
                  {formatVol(s.volume)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
