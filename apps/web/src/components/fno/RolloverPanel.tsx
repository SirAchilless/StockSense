import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import type { RolloverData } from '../../types/fno';

interface Props {
  data: RolloverData;
}

function fmt(n: number, d = 2) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtOI(n: number) {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function StatTile({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: 'positive' | 'negative' | 'neutral' }) {
  const valClass = highlight === 'positive' ? 'text-emerald-500'
    : highlight === 'negative' ? 'text-red-500'
    : 'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${valClass}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export function RolloverPanel({ data }: Props) {
  const rolloverDiff = data.rolloverVsAvgDiff;
  const diffHighlight: 'positive' | 'negative' | 'neutral' =
    rolloverDiff > 3 ? 'positive' : rolloverDiff < -3 ? 'negative' : 'neutral';

  const cocHighlight: 'positive' | 'negative' | 'neutral' =
    data.costOfCarryCurrent > 0 ? 'positive' : data.costOfCarryCurrent < 0 ? 'negative' : 'neutral';

  // Prepare bar chart data
  const chartData = data.allExpiries.map((e) => ({
    expiry: e.expiry,
    oi: e.openInterest,
    coc: e.costOfCarry,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Futures Rollover — {data.symbol}</h3>
        <span className="text-xs text-muted-foreground">
          Spot: <span className="font-medium text-foreground">
            {data.spotPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </span>
        </span>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Rollover %"
          value={`${fmt(data.rolloverPercent, 1)}%`}
          sub={`3M avg: ${fmt(data.threeMonthAvgRollover, 1)}%`}
          highlight={diffHighlight}
        />
        <StatTile
          label="vs Average"
          value={`${rolloverDiff > 0 ? '+' : ''}${fmt(rolloverDiff, 1)}pp`}
          sub={rolloverDiff > 3 ? 'Above avg' : rolloverDiff < -3 ? 'Below avg' : 'In line'}
          highlight={diffHighlight}
        />
        <StatTile
          label="Cost of Carry"
          value={`${fmt(data.costOfCarryCurrent, 2)}%`}
          sub={data.costOfCarryCurrent > 0 ? 'Contango' : 'Backwardation'}
          highlight={cocHighlight}
        />
        <StatTile
          label="Days to Expiry"
          value={String(data.daysToCurrentExpiry)}
          sub={data.currentExpiry}
        />
      </div>

      {/* OI across expiries */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Current vs Next OI */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            OI by Expiry
          </h4>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <XAxis dataKey="expiry" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={fmtOI} tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                formatter={(v: number) => [fmtOI(v), 'Open Interest']}
                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="oi" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={i === 0 ? '#ef4444' : i === 1 ? '#10b981' : '#8b5cf6'} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-3 mt-1 text-xs text-muted-foreground justify-center">
            <span><span className="inline-block w-2 h-2 rounded-sm bg-red-500 mr-1" />Current</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-emerald-500 mr-1" />Next</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-violet-500 mr-1" />Far</span>
          </div>
        </div>

        {/* Cost of carry across expiries */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Cost of Carry (% annualised)
          </h4>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <XAxis dataKey="expiry" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={40} />
              <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
              <Tooltip
                formatter={(v: number) => [`${fmt(v, 2)}%`, 'Cost of Carry']}
                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="coc" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.coc >= 0 ? '#10b981' : '#ef4444'} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Green = contango · Red = backwardation
          </p>
        </div>
      </div>

      {/* Detailed expiry table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left">Expiry</th>
              <th className="px-3 py-2 text-right">LTP</th>
              <th className="px-3 py-2 text-right">Basis</th>
              <th className="px-3 py-2 text-right">CoC %</th>
              <th className="px-3 py-2 text-right">OI</th>
              <th className="px-3 py-2 text-right">OI Chg</th>
              <th className="px-3 py-2 text-right">Volume</th>
            </tr>
          </thead>
          <tbody>
            {data.allExpiries.map((e, i) => (
              <tr key={e.expiry} className={`border-b border-border/50 hover:bg-muted/20 ${i === 0 ? 'font-medium' : ''}`}>
                <td className="px-3 py-2 font-mono text-xs">{e.expiry}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(e.ltp)}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${e.basis > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {e.basis > 0 ? '+' : ''}{fmt(e.basis)}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${e.costOfCarry > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {e.costOfCarry > 0 ? '+' : ''}{fmt(e.costOfCarry, 2)}%
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtOI(e.openInterest)}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${e.oiChange > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {e.oiChange > 0 ? '+' : ''}{fmtOI(e.oiChange)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtOI(e.volume)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
