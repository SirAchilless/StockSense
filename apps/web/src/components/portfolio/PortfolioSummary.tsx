import type { PortfolioSummary as PortfolioSummaryType } from '../../types/portfolio';
import { formatCurrency, formatPct, pnlClass } from '../../lib/utils';

interface Props {
  summary: PortfolioSummaryType;
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}

function StatCard({ label, value, sub, valueClass }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={`font-mono text-xl font-semibold tabular-nums ${valueClass ?? ''}`}>{value}</span>
      {sub && <span className={`font-mono text-sm tabular-nums ${valueClass ?? ''}`}>{sub}</span>}
    </div>
  );
}

export function PortfolioSummary({ summary }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        label="Total Invested"
        value={formatCurrency(summary.totalInvested, true)}
      />
      <StatCard
        label="Current Value"
        value={formatCurrency(summary.currentValue, true)}
      />
      <StatCard
        label="Total P&L"
        value={formatCurrency(summary.totalPnL, true)}
        sub={formatPct(summary.totalPnLPct)}
        valueClass={pnlClass(summary.totalPnL)}
      />
      <StatCard
        label="Daily Change"
        value={formatCurrency(summary.dailyChange, true)}
        sub={formatPct(summary.dailyChangePct)}
        valueClass={pnlClass(summary.dailyChange)}
      />
    </div>
  );
}
