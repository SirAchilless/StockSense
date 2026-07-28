import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  type TooltipProps,
} from 'recharts';
import type { IndicatorBar } from '../../types/technical';

// Shared helpers


interface RSIPanelProps {
  indicators: IndicatorBar[];
}

interface MACDPanelProps {
  indicators: IndicatorBar[];
}

// Shared tick formatter — show only last date portion
function dateTick(value: string) {
  if (!value) return '';
  const parts = value.split('-');
  return parts.length >= 2 ? `${parts[1]}/${parts[2] ?? ''}` : value;
}

function PanelTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color ?? 'inherit' }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : '—'}
        </p>
      ))}
    </div>
  );
}

export function RSIPanel({ indicators }: RSIPanelProps) {
  const data = indicators
    .filter((d) => d.rsi14 !== null)
    .map((d) => ({ time: d.time, RSI: d.rsi14 as number }));

  if (!data.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">RSI (14)</p>
      <ResponsiveContainer width="100%" height={100}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="time" tickFormatter={dateTick} tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} tickLine={false} axisLine={false} width={28} />
          <Tooltip content={<PanelTooltip />} />
          <ReferenceLine y={70} stroke="hsl(0 84% 60%)" strokeDasharray="3 3" strokeWidth={1} />
          <ReferenceLine y={30} stroke="hsl(142 76% 36%)" strokeDasharray="3 3" strokeWidth={1} />
          <ReferenceLine y={50} stroke="hsl(215 20% 40%)" strokeDasharray="2 4" strokeWidth={1} />
          <Line type="monotone" dataKey="RSI" stroke="hsl(210 100% 56%)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MACDPanel({ indicators }: MACDPanelProps) {
  const data = indicators
    .filter((d) => d.macd !== null)
    .map((d) => ({
      time: d.time,
      MACD: d.macd as number,
      Signal: d.macdSignal,
      Histogram: d.macdHistogram,
    }));

  if (!data.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">MACD (12, 26, 9)</p>
      <div className="flex gap-4 mb-1 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <span className="inline-block h-0.5 w-3 rounded-full bg-[hsl(210_100%_56%)]" />MACD
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <span className="inline-block h-0.5 w-3 rounded-full bg-[hsl(38_92%_50%)]" />Signal
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-sm bg-[hsl(215_20%_50%)]" />Histogram
        </span>
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="time" tickFormatter={dateTick} tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} tickLine={false} axisLine={false} width={36} tickFormatter={(v: number) => v.toFixed(1)} />
          <Tooltip content={<PanelTooltip />} />
          <ReferenceLine y={0} stroke="hsl(215 20% 35%)" strokeWidth={1} />
          <Bar dataKey="Histogram" fill="hsl(215 20% 50%)" isAnimationActive={false} />
          <Line type="monotone" dataKey="MACD" stroke="hsl(210 100% 56%)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="Signal" stroke="hsl(38 92% 50%)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ATR panel
export function ATRPanel({ indicators }: { indicators: IndicatorBar[] }) {
  const data = indicators
    .filter((d) => d.atr14 !== null)
    .map((d) => ({ time: d.time, ATR: d.atr14 as number }));
  if (!data.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">ATR (14) — Average True Range</p>
      <ResponsiveContainer width="100%" height={80}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="time" tickFormatter={dateTick} tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} tickLine={false} axisLine={false} width={36} tickFormatter={(v: number) => v.toFixed(1)} />
          <Tooltip content={<PanelTooltip />} />
          <Line type="monotone" dataKey="ATR" stroke="hsl(280 85% 65%)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
