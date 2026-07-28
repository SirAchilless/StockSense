import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { PCRDataFrontend } from '../types/fno.types';

interface Props {
  data?: PCRDataFrontend[];
  isLoading?: boolean;
  error?: Error | null;
}

function LoadingSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
      <div className="h-4 bg-muted rounded w-32 mb-3" />
      <div className="h-40 bg-muted rounded" />
    </div>
  );
}

export function PCRTrendChart({ data, isLoading, error }: Props) {
  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        PCR trend data unavailable. Please try again.
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        No PCR trend data to display.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    symbol: d.symbol,
    pcrOI: +d.pcrOI.toFixed(3),
    pcrVolume: +d.pcrVolume.toFixed(3),
  }));

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold mb-3">PCR Comparison — OI vs Volume</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
          <XAxis
            dataKey="symbol"
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            width={40}
            domain={[0, 2]}
          />
          <ReferenceLine
            y={0.7}
            stroke="var(--destructive)"
            strokeDasharray="4 2"
            strokeWidth={1}
          />
          <ReferenceLine
            y={1.0}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 2"
            strokeWidth={1}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '11px',
            }}
            formatter={(v: number, name: string) => [
              v.toFixed(3),
              name === 'pcrOI' ? 'PCR (OI)' : 'PCR (Vol)',
            ]}
          />
          <Legend
            formatter={(v) => (v === 'pcrOI' ? 'PCR OI' : 'PCR Volume')}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Line
            type="monotone"
            dataKey="pcrOI"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4, fill: '#10b981' }}
          />
          <Line
            type="monotone"
            dataKey="pcrVolume"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 4, fill: '#6366f1' }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground text-center mt-1">EOD data</p>
    </div>
  );
}
