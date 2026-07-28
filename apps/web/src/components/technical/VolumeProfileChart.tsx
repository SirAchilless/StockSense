import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  type TooltipProps,
} from 'recharts';
import type { VolumeProfileBin } from '../../types/technical';

interface Props {
  bins: VolumeProfileBin[];
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function VPTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as VolumeProfileBin;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground">
        ₹{d.priceFrom.toFixed(2)} – ₹{d.priceTo.toFixed(2)}
      </p>
      <p className="font-medium">Vol: {fmt(d.volume)}</p>
      {d.isPOC && <p className="text-amber-400 font-semibold">POC</p>}
    </div>
  );
}

export function VolumeProfileChart({ bins }: Props) {
  if (!bins.length) return null;

  // Sort high to low for display (highest price at top)
  const sorted = [...bins].sort((a, b) => b.priceMid - a.priceMid);
  const data = sorted.map((b) => ({ ...b, price: `${b.priceMid.toFixed(0)}` }));

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">Volume Profile</p>
        <span className="flex items-center gap-1 text-xs text-amber-400">
          <span className="inline-block h-2 w-2 rounded-sm bg-amber-400" />
          POC (Point of Control)
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 8, bottom: 0, left: 8 }}
          barCategoryGap="2%"
        >
          <XAxis
            type="number"
            hide
            domain={[0, 'dataMax']}
          />
          <YAxis
            type="category"
            dataKey="price"
            width={52}
            tick={{ fontSize: 9, fill: 'hsl(215 20% 55%)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <Tooltip content={<VPTooltip />} />
          <Bar dataKey="volume" radius={[0, 2, 2, 0]} isAnimationActive={false}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.isPOC ? 'hsl(38 92% 50%)' : 'hsl(215 30% 40%)'}
                fillOpacity={entry.isPOC ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
