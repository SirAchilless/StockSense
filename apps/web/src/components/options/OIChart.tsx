import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { OptionChain } from '../../types/options';

interface Props {
  chain: OptionChain;
}

function fmtOI(n: number) {
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function OIChart({ chain }: Props) {
  // Show only strikes close to ATM (±8 strikes) to keep chart readable
  const atmIndex = chain.strikes.findIndex((s) => s.isATM);
  const start = Math.max(0, atmIndex - 8);
  const end = Math.min(chain.strikes.length, atmIndex + 9);
  const visible = chain.strikes.slice(start, end);

  const data = visible.map((row) => ({
    strike: row.strikePrice.toLocaleString('en-IN'),
    callOI: row.call.oi,
    putOI: row.put.oi,
    isATM: row.isATM,
  }));

  const maxPainLabel = chain.maxPainStrike.toLocaleString('en-IN');

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Open Interest Distribution</h3>
        <span className="text-xs text-muted-foreground">
          Max Pain: <span className="text-foreground font-medium">{maxPainLabel}</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barCategoryGap="15%" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <XAxis
            dataKey="strike"
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={fmtOI}
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              value.toLocaleString('en-IN'),
              name === 'callOI' ? 'Call OI' : 'Put OI',
            ]}
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend
            formatter={(value) => (value === 'callOI' ? 'Call OI' : 'Put OI')}
            wrapperStyle={{ fontSize: '12px' }}
          />
          <ReferenceLine
            x={chain.atmStrike.toLocaleString('en-IN')}
            stroke="var(--primary)"
            strokeDasharray="4 2"
            label={{ value: 'ATM', position: 'insideTopRight', fontSize: 10, fill: 'var(--primary)' }}
          />
          <Bar dataKey="callOI" fill="#10b981" opacity={0.8} radius={[3, 3, 0, 0]} />
          <Bar dataKey="putOI" fill="#ef4444" opacity={0.8} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground text-center mt-1">
        Showing ±8 strikes from ATM · Lot size: {chain.lotSize}
      </p>
    </div>
  );
}
