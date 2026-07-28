import type { HoldingPnL } from '../../types/portfolio';
import { useDeleteHolding } from '../../hooks/usePortfolio';
import { formatCurrency, formatPct, pnlClass } from '../../lib/utils';

interface Props {
  holdings: HoldingPnL[];
}

export function HoldingsTable({ holdings }: Props) {
  const { mutate: deleteHolding, isPending: isDeleting } = useDeleteHolding();

  if (holdings.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No holdings yet. Add your first holding above.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Symbol</th>
            <th className="px-4 py-3 text-right">Qty</th>
            <th className="px-4 py-3 text-right">Avg Buy</th>
            <th className="px-4 py-3 text-right">Current</th>
            <th className="px-4 py-3 text-right">Invested</th>
            <th className="px-4 py-3 text-right">Current Value</th>
            <th className="px-4 py-3 text-right">P&amp;L</th>
            <th className="px-4 py-3 text-right">Daily</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {holdings.map((h) => (
            <tr key={h.id ?? h.symbol} className="transition-colors hover:bg-muted/20">
              <td className="px-4 py-3 font-mono font-semibold">{h.symbol}</td>
              <td className="px-4 py-3 text-right font-mono">{h.quantity.toLocaleString('en-IN')}</td>
              <td className="px-4 py-3 text-right font-mono">{formatCurrency(h.buyPrice)}</td>
              <td className="px-4 py-3 text-right font-mono">{formatCurrency(h.currentPrice)}</td>
              <td className="px-4 py-3 text-right font-mono">{formatCurrency(h.invested, true)}</td>
              <td className="px-4 py-3 text-right font-mono">{formatCurrency(h.currentValue, true)}</td>
              <td className={`px-4 py-3 text-right font-mono ${pnlClass(h.unrealizedPnL)}`}>
                <div>{formatCurrency(h.unrealizedPnL, true)}</div>
                <div className="text-xs">{formatPct(h.unrealizedPnLPct)}</div>
              </td>
              <td className={`px-4 py-3 text-right font-mono text-xs ${pnlClass(h.dailyChange)}`}>
                {formatCurrency(h.dailyChange, true)}
              </td>
              <td className="px-4 py-3 text-right">
                {h.id && (
                  <button
                    onClick={() => deleteHolding(h.id!)}
                    disabled={isDeleting}
                    className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    aria-label={`Remove ${h.symbol}`}
                  >
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
