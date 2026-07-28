import { motion } from 'framer-motion';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { pcrZone } from '../utils/format-rollover';
import type { PCRData } from '../types/fno.types';

interface Props {
  data?: PCRData;
  title?: string;
  isLoading?: boolean;
  error?: Error | null;
}

function Skeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-md p-5 animate-pulse">
      <div className="h-4 w-36 bg-muted rounded mb-3" />
      <div className="h-48 bg-muted rounded" />
    </div>
  );
}

export function PCRGauge({ data, title = 'Put-Call Ratio', isLoading, error }: Props) {
  if (isLoading) return <Skeleton />;
  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
        Data unavailable: {error.message}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-md p-5 text-sm text-muted-foreground">
        Select a symbol to view PCR.
      </div>
    );
  }

  const zone = pcrZone(data.pcrOI);
  const color = zone === 'bullish' ? 'hsl(var(--gain))' : zone === 'bearish' ? 'hsl(var(--loss))' : 'hsl(var(--warning))';
  const zoneLabel = zone === 'bullish' ? 'Bullish (oversold)' : zone === 'bearish' ? 'Bearish (overbought)' : 'Neutral';

  // Radial gauge — show PCR on a 0..2 scale (meaningful range).
  const pct = Math.min(1, Math.max(0, data.pcrOI / 2));
  const chartData = [{ name: 'pcr', value: pct * 100, fill: color }];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-md p-5 shadow-sm"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{data.symbol} · {data.expiry}</p>
        </div>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {zoneLabel}
        </span>
      </div>

      <div className="relative h-44">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%" cy="80%"
            innerRadius="80%" outerRadius="100%"
            barSize={14}
            startAngle={180} endAngle={0}
            data={chartData}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'hsl(var(--muted))' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2 pointer-events-none">
          <div className="font-mono tabular-nums text-3xl font-bold" style={{ color }}>
            {data.pcrOI.toFixed(2)}
          </div>
          <div className="text-[11px] text-muted-foreground">Vol PCR {data.pcrVolume.toFixed(2)}</div>
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-2">
        <span className="text-loss">0.0 bearish</span>
        <span className="text-warning">0.7</span>
        <span className="text-gain">1.0 bullish</span>
        <span>2.0</span>
      </div>
    </motion.div>
  );
}
