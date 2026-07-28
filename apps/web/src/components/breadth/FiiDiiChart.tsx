import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend, type TooltipProps,
} from 'recharts';
import type { FiiDiiActivity } from '../../types/breadth';

interface Props {
  data: FiiDiiActivity[];
}

function shortDate(d: string): string {
  const parts = d.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
}

function crLabel(v: number): string {
  return `₹${Math.abs(v).toLocaleString('en-IN')} Cr`;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((entry) => {
        const val = entry.value as number;
        return (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name}: {val >= 0 ? '+' : ''}{crLabel(val)}{' '}
            <span className="text-muted-foreground">({val >= 0 ? 'Net Buy' : 'Net Sell'})</span>
          </p>
        );
      })}
    </div>
  );
}

export function FiiDiiChart({ data }: Props) {
  const chartData = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: shortDate(d.date),
      FII: d.fiiNetBuy,
      DII: d.diiNetBuy,
    }));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          FII / DII Net Activity
        </h2>
        <span className="text-xs text-muted-foreground">Last 5 trading days · ₹ Crores</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barGap={4} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }} tickLine={false} axisLine={false} />
          <YAxis
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
            tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => <span style={{ color: 'hsl(215 20% 65%)' }}>{value}</span>}
          />
          <ReferenceLine y={0} stroke="hsl(215 20% 35%)" strokeWidth={1} />
          <Bar dataKey="FII" name="FII" radius={[3, 3, 0, 0]}
            fill="hsl(210 100% 56%)"
            label={false}
          />
          <Bar dataKey="DII" name="DII" radius={[3, 3, 0, 0]}
            fill="hsl(38 92% 50%)"
            label={false}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Gross data table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs text-muted-foreground">
          <thead>
            <tr className="border-b border-border">
              <th className="py-1.5 text-left font-medium">Date</th>
              <th className="py-1.5 text-right font-medium">FII Buy</th>
              <th className="py-1.5 text-right font-medium">FII Sell</th>
              <th className="py-1.5 text-right font-medium text-[hsl(210_100%_56%)]">FII Net</th>
              <th className="py-1.5 text-right font-medium">DII Buy</th>
              <th className="py-1.5 text-right font-medium">DII Sell</th>
              <th className="py-1.5 text-right font-medium text-[hsl(38_92%_50%)]">DII Net</th>
            </tr>
          </thead>
          <tbody>
            {[...data].sort((a, b) => b.date.localeCompare(a.date)).map((d) => (
              <tr key={d.date} className="border-b border-border/40 hover:bg-muted/20">
                <td className="py-1.5 font-mono">{shortDate(d.date)}</td>
                <td className="py-1.5 text-right font-mono">{d.fiiGrossBuy.toLocaleString('en-IN')}</td>
                <td className="py-1.5 text-right font-mono">{d.fiiGrossSell.toLocaleString('en-IN')}</td>
                <td className={`py-1.5 text-right font-mono font-medium ${d.fiiNetBuy >= 0 ? 'text-[hsl(142_76%_36%)]' : 'text-destructive'}`}>
                  {d.fiiNetBuy >= 0 ? '+' : ''}{d.fiiNetBuy.toLocaleString('en-IN')}
                </td>
                <td className="py-1.5 text-right font-mono">{d.diiGrossBuy.toLocaleString('en-IN')}</td>
                <td className="py-1.5 text-right font-mono">{d.diiGrossSell.toLocaleString('en-IN')}</td>
                <td className={`py-1.5 text-right font-mono font-medium ${d.diiNetBuy >= 0 ? 'text-[hsl(142_76%_36%)]' : 'text-destructive'}`}>
                  {d.diiNetBuy >= 0 ? '+' : ''}{d.diiNetBuy.toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
