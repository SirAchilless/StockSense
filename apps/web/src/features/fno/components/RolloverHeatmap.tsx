import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { formatPct } from '../utils/format-rollover';
import type { RolloverData } from '../types/fno.types';

interface Props {
  data?: RolloverData[];
  isLoading?: boolean;
  error?: Error | null;
}

function Skeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-pulse space-y-4">
      <div className="h-4 w-48 bg-muted rounded" />
      <div className="h-64 bg-muted rounded" />
    </div>
  );
}

export function RolloverHeatmap({ data, isLoading, error }: Props) {
  const chartData = useMemo(() => {
    if (!data) return [];
    return [...data]
      .sort((a, b) => b.rolloverPct - a.rolloverPct)
      .map((r) => ({
        symbol: r.symbol,
        rollover: r.rolloverPct,
        delta: r.rolloverPct - r.historicalAvgRolloverPct,
      }));
  }, [data]);

  if (isLoading) return <Skeleton />;
  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
        Data unavailable: {error.message}
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Market-wide rollover data is not available right now.
      </div>
    );
  }

  const colorFor = (delta: number) => {
    if (delta > 3) return 'hsl(var(--gain))';
    if (delta < -3) return 'hsl(var(--loss))';
    return 'hsl(var(--warning))';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.05 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Market-wide Rollover Heatmap</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            EOD data · {data.length} symbols · bars colored by delta vs 3M avg
          </p>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
            <XAxis
              dataKey="symbol"
              angle={-60}
              textAnchor="end"
              interval={0}
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              height={60}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={36}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, _name, item) => {
                const d = item.payload as { delta: number };
                return [`${formatPct(value, 1)}  (Δ ${d.delta > 0 ? '+' : ''}${d.delta.toFixed(1)} pp)`, 'Rollover'];
              }}
            />
            <Bar dataKey="rollover" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={colorFor(entry.delta)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-4 justify-center text-[11px] text-muted-foreground mt-2">
        <span><span className="inline-block w-2 h-2 rounded-sm bg-gain mr-1" />Above avg (bullish rollover)</span>
        <span><span className="inline-block w-2 h-2 rounded-sm bg-warning mr-1" />In line with avg</span>
        <span><span className="inline-block w-2 h-2 rounded-sm bg-loss mr-1" />Below avg (bearish rollover)</span>
      </div>
    </motion.div>
  );
}
