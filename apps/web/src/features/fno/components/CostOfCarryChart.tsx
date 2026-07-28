import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { CostOfCarry } from '../types/fno.types';
import { formatPct } from '../utils/format-rollover';

interface Props {
  data?: CostOfCarry[];
  symbol?: string;
  isLoading?: boolean;
  error?: Error | null;
}

const LINE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

function Skeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-pulse">
      <div className="h-4 w-40 bg-muted rounded mb-4" />
      <div className="h-72 bg-muted rounded" />
    </div>
  );
}

export function CostOfCarryChart({ data, symbol, isLoading, error }: Props) {
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
        No cost-of-carry data available.
      </div>
    );
  }

  // Transform: x-axis = daysToExpiry (0..max); one line per expiry is the point,
  // but Recharts needs series = objects with numeric keys. We'll do a simple bar/line
  // where each expiry is a labeled point at its own (daysToExpiry, costOfCarryPct) —
  // a clean "term structure" chart.
  const termData = data.map(d => ({
    expiry: d.expiry,
    label: d.expiry.slice(5),
    days: d.daysToExpiry,
    coc: d.costOfCarryPct,
    futuresPrice: d.futuresPrice,
    spotPrice: d.spotPrice,
  })).sort((a, b) => a.days - b.days);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <h3 className="text-sm font-semibold">Cost of Carry Term Structure{symbol ? ` — ${symbol}` : ''}</h3>
      <p className="text-[11px] text-muted-foreground mb-3">
        Annualised % per expiry. Positive = contango; negative = backwardation.
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={termData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => `${v.toFixed(1)}%`}
              width={48}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="2 2" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(v: number) => [formatPct(v, 2), 'Cost of Carry']}
              labelFormatter={(l) => `Expiry: ${l}`}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line
              name="Cost of Carry %"
              type="monotone"
              dataKey="coc"
              stroke={LINE_COLORS[0]}
              strokeWidth={2.5}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
