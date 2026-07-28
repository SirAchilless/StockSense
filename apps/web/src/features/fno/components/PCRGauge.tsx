import { motion } from 'framer-motion';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import type { PCRDataFrontend } from '../types/fno.types';

interface Props {
  data?: PCRDataFrontend;
  isLoading?: boolean;
  error?: Error | null;
}

function pcrColor(pcr: number): { text: string; fill: string; label: string } {
  if (pcr < 0.7) return { text: 'text-red-500', fill: '#ef4444', label: 'Bearish' };
  if (pcr <= 1.0) return { text: 'text-amber-500', fill: '#f59e0b', label: 'Neutral' };
  return { text: 'text-emerald-500', fill: '#10b981', label: 'Bullish' };
}

function LoadingSkeleton() {
  return (
    <div className="rounded-xl border border-border backdrop-blur-sm bg-card/80 p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-muted rounded w-24" />
      <div className="h-32 bg-muted rounded" />
      <div className="h-3 bg-muted rounded w-20" />
    </div>
  );
}

export function PCRGauge({ data, isLoading, error }: Props) {
  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        PCR data unavailable. Please try again.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        No PCR data available for this symbol.
      </div>
    );
  }

  const oiColors = pcrColor(data.pcrOI);
  const volColors = pcrColor(data.pcrVolume);

  const gaugeData = [
    { name: 'OI PCR', value: Math.min(data.pcrOI * 50, 100), fill: oiColors.fill },
    { name: 'Vol PCR', value: Math.min(data.pcrVolume * 50, 100), fill: volColors.fill },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-border backdrop-blur-sm bg-card/80 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Put-Call Ratio</h3>
        <span className="text-xs text-muted-foreground">
          {data.expiry === 'ALL' ? 'All expiries' : data.expiry}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={140}>
        <RadialBarChart
          cx="50%"
          cy="70%"
          innerRadius="50%"
          outerRadius="90%"
          startAngle={180}
          endAngle={0}
          data={gaugeData}
        >
          <RadialBar dataKey="value" cornerRadius={4} />
        </RadialBarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-3 mt-2">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">OI-based</p>
          <p className={`text-xl font-bold tabular-nums ${oiColors.text}`}>
            {data.pcrOI.toFixed(2)}
          </p>
          <p className={`text-xs font-medium ${oiColors.text}`}>{oiColors.label}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Volume-based</p>
          <p className={`text-xl font-bold tabular-nums ${volColors.text}`}>
            {data.pcrVolume.toFixed(2)}
          </p>
          <p className={`text-xs font-medium ${volColors.text}`}>{volColors.label}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 justify-center text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> {'<0.7 bearish'}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> 0.7–1.0 neutral
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> {'>1.0 bullish'}
        </span>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-2">
        Delayed data · {new Date(data.timestamp).toLocaleTimeString('en-IN')}
      </p>
    </motion.div>
  );
}
