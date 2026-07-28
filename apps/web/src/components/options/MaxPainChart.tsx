import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { OptionChain } from '../../types/options';

interface Props {
  chain: OptionChain;
}

function computePainAtSpot(strikes: OptionChain['strikes'], spot: number) {
  let pain = 0;
  for (const s of strikes) {
    if (spot > s.strikePrice) pain += (spot - s.strikePrice) * s.call.oi;
    if (spot < s.strikePrice) pain += (s.strikePrice - spot) * s.put.oi;
  }
  return pain;
}

export function MaxPainChart({ chain }: Props) {
  const data = chain.strikes.map((s) => ({
    strike: s.strikePrice.toLocaleString('en-IN'),
    pain: computePainAtSpot(chain.strikes, s.strikePrice),
    isATM: s.isATM,
  }));

  const maxPainLabel = chain.maxPainStrike.toLocaleString('en-IN');
  const atmLabel = chain.atmStrike.toLocaleString('en-IN');

  const minPain = Math.min(...data.map((d) => d.pain));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Max Pain Chart</h3>
        <span className="text-xs text-muted-foreground">
          Max Pain: <span className="font-medium text-amber-500">{maxPainLabel}</span>
          {' · '}
          Spot: <span className="font-medium">{chain.underlyingPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
        </span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <XAxis
            dataKey="strike"
            tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            interval={Math.ceil(data.length / 10)}
          />
          <YAxis
            tickFormatter={(v: number) => {
              if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
              if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
              return `${(v / 1000).toFixed(0)}K`;
            }}
            tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            formatter={(value: number) => [
              value >= 1e9 ? `${(value / 1e9).toFixed(2)}B` : `${(value / 1e6).toFixed(1)}M`,
              'Pain (OI × Points)',
            ]}
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <ReferenceLine
            x={maxPainLabel}
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="4 2"
            label={{ value: 'Max Pain', position: 'insideTopLeft', fontSize: 10, fill: '#f59e0b' }}
          />
          <ReferenceLine
            x={atmLabel}
            stroke="var(--primary)"
            strokeDasharray="4 2"
            label={{ value: 'Spot', position: 'insideTopRight', fontSize: 10, fill: 'var(--primary)' }}
          />
          <Line
            type="monotone"
            dataKey="pain"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-xs text-muted-foreground text-center mt-1">
        Lower values = more pain for option buyers at that spot level
      </p>

      <div className="mt-3 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2">
        <p className="text-xs text-amber-600 dark:text-amber-400">
          <span className="font-semibold">Max pain at {maxPainLabel}</span> — minimum point {Math.round((minPain / 1e6)).toLocaleString('en-IN')}M OI-weighted.
          {' '}This is a theoretical, informational calculation; actual market prices are driven by many additional factors.
        </p>
      </div>
    </div>
  );
}
