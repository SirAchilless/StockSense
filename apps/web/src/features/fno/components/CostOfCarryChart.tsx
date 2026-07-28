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
import type { CostOfCarryItemFrontend } from '../types/fno.types';

interface Props {
  data?: CostOfCarryItemFrontend[];
  isLoading?: boolean;
  error?: Error | null;
}

function LoadingSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
      <div className="h-4 bg-muted rounded w-48 mb-3" />
      <div className="h-40 bg-muted rounded" />
    </div>
  );
}

export function CostOfCarryChart({ data, isLoading, error }: Props) {
  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        Cost of carry data unavailable. Please try again.
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        No cost of carry data to display.
      </div>
    );
  }

  // One data point per expiry — show across time
  const chartData = data.map((d) => ({
    expiry: d.expiry,
    coc: +d.costOfCarryPct.toFixed(3),
    daysToExpiry: d.daysToExpiry,
  }));

  const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444'];

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold mb-1">Cost of Carry (% annualised)</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Positive = contango (bullish) · Negative = backwardation (bearish) · Delayed data
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
          <XAxis
            dataKey="expiry"
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v: number) => `${v}%`}
          />
          <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1.5} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '11px',
            }}
            formatter={(v: number) => [`${v.toFixed(3)}%`, 'Cost of Carry']}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="coc"
            name="CoC %"
            stroke={COLORS[0]}
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
              const color = payload.coc >= 0 ? '#10b981' : '#ef4444';
              return <circle key={`dot-${payload.expiry}`} cx={cx} cy={cy} r={5} fill={color} />;
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
