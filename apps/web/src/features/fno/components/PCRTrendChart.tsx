import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { PCRData } from '../types/fno.types';

interface Props {
  data?: PCRData[];
  isLoading?: boolean;
  error?: Error | null;
}

function Skeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-pulse">
      <div className="h-4 w-40 bg-muted rounded mb-4" />
      <div className="h-56 bg-muted rounded" />
    </div>
  );
}

export function PCRTrendChart({ data, isLoading, error }: Props) {
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
        Market-wide PCR data not available right now.
      </div>
    );
  }

  // We treat the array as current snapshots per symbol — no time-series provided
  // here, but the spec asks for OI vs volume PCR; render a categorical chart
  // comparing the two per index for a useful visual.
  const chartData = data.map(d => ({
    symbol: d.symbol,
    pcrOI: d.pcrOI,
    pcrVolume: d.pcrVolume,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <h3 className="text-sm font-semibold">Index PCR Snapshot — OI vs Volume</h3>
      <p className="text-[11px] text-muted-foreground mb-3">
        Delayed data. &lt;0.7 overbought (red), &gt;1.0 oversold (green).
      </p>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="symbol" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 'auto']} width={36} />
            <ReferenceLine y={0.7} stroke="hsl(var(--loss))" strokeDasharray="3 3" />
            <ReferenceLine y={1.0} stroke="hsl(var(--gain))" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(v: number, name: string) => [v.toFixed(2), name === 'pcrOI' ? 'PCR (OI)' : 'PCR (Volume)']}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line name="PCR (OI)" type="monotone" dataKey="pcrOI" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
            <Line name="PCR (Volume)" type="monotone" dataKey="pcrVolume" stroke="hsl(var(--warning))" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
