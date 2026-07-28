import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { FiiDerPositionSummary } from '../../types/fno';

interface Props {
  data: FiiDerPositionSummary;
}

function fmt(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '+';
  if (abs >= 10_000) return `${sign}₹${(abs / 1_000).toFixed(0)}K cr`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K cr`;
  return `${sign}₹${abs.toFixed(0)} cr`;
}

function fmtOI(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_00_000) return `${n < 0 ? '-' : ''}${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `${n < 0 ? '-' : ''}${(abs / 1_000).toFixed(0)}K`;
  return String(n);
}

function NetBuyTile({ label, value }: { label: string; value: number }) {
  const color = value > 0 ? 'text-emerald-500' : 'text-red-500';
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${color}`}>{fmt(value)}</div>
      <div className="text-xs text-muted-foreground">{value > 0 ? 'Net buyer' : 'Net seller'} (5d)</div>
    </div>
  );
}

export function FiiDiiDerPanel({ data }: Props) {
  const chartData = data.series.slice(-7).map((d) => ({
    date: d.date.slice(5), // MM-DD
    fiiIndexFut: d.fiiIndexFutNetBuy,
    fiiStockFut: d.fiiStockFutNetBuy,
    fiiOpts: d.fiiIndexOptNetBuy + d.fiiStockOptNetBuy,
    diiIndexFut: d.diiIndexFutNetBuy,
  }));

  const fiiNetOI = data.latestFiiIndexFutNetOI;
  const pcrColor = data.latestFiiIndexPCR > 1.2 ? 'text-red-500'
    : data.latestFiiIndexPCR < 0.9 ? 'text-emerald-500'
    : 'text-foreground';

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">FII / DII Derivatives Positioning</h3>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NetBuyTile label="FII Futures (5d)" value={data.fiiNetFuturesBuy5d} />
        <NetBuyTile label="FII Options (5d)" value={data.fiiNetOptionsBuy5d} />
        <NetBuyTile label="DII Futures (5d)" value={data.diiNetFuturesBuy5d} />
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">FII Index Fut Net OI</div>
          <div className={`text-lg font-semibold tabular-nums ${fiiNetOI > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {fmtOI(fiiNetOI)}
          </div>
          <div className="text-xs text-muted-foreground">{fiiNetOI > 0 ? 'Net long' : 'Net short'} (contracts)</div>
        </div>
      </div>

      {/* FII Index PCR + latest date */}
      <div className="flex gap-4 text-sm items-center">
        <span>FII Index Options PCR:
          <span className={`ml-1 font-semibold ${pcrColor}`}>{data.latestFiiIndexPCR.toFixed(2)}</span>
        </span>
        <span className="text-xs text-muted-foreground">Latest: {data.latestDate}</span>
      </div>

      {/* Daily net buy/sell chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Daily Net Buy/Sell (₹ Cr) — Last 7 Sessions
        </h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }} barCategoryGap="20%">
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={52}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
            <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
            <Tooltip
              formatter={(v: number, name: string) => [
                fmt(v),
                name === 'fiiIndexFut' ? 'FII Index Fut' :
                name === 'fiiStockFut' ? 'FII Stock Fut' :
                name === 'fiiOpts' ? 'FII Options' : 'DII Index Fut',
              ]}
              contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px' }}
            />
            <Bar dataKey="fiiIndexFut" fill="#10b981" opacity={0.85} radius={[3, 3, 0, 0]} />
            <Bar dataKey="fiiStockFut" fill="#6366f1" opacity={0.85} radius={[3, 3, 0, 0]} />
            <Bar dataKey="fiiOpts" fill="#f59e0b" opacity={0.85} radius={[3, 3, 0, 0]} />
            <Bar dataKey="diiIndexFut" fill="#94a3b8" opacity={0.8} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground justify-center">
          <span><span className="inline-block w-2 h-2 rounded-sm bg-emerald-500 mr-1" />FII Index Fut</span>
          <span><span className="inline-block w-2 h-2 rounded-sm bg-indigo-500 mr-1" />FII Stock Fut</span>
          <span><span className="inline-block w-2 h-2 rounded-sm bg-amber-500 mr-1" />FII Options</span>
          <span><span className="inline-block w-2 h-2 rounded-sm bg-slate-400 mr-1" />DII Index Fut</span>
        </div>
      </div>
    </div>
  );
}
