import { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type CandlestickSeriesOptions,
  type LineSeriesOptions,
  type CandlestickData,
  type LineData,
  type Time,
} from 'lightweight-charts';
import type { OHLCBar, IndicatorBar, FibonacciLevels } from '../../types/technical';

interface Props {
  bars: OHLCBar[];
  indicators: IndicatorBar[];
  fibonacci: FibonacciLevels | null;
  showSMA20: boolean;
  showSMA50: boolean;
  showEMA20: boolean;
  showIchimoku: boolean;
  showSuperTrend: boolean;
  showFibonacci: boolean;
}

function toTime(s: string): Time { return s as Time; }

function nonNull<T>(arr: Array<{ time: Time; value: T | null }>): Array<{ time: Time; value: T }> {
  return arr.filter((p): p is { time: Time; value: T } => p.value !== null);
}

const COLORS = {
  sma20:        'hsl(210 100% 56%)',
  sma50:        'hsl(38 92% 50%)',
  ema20:        'hsl(280 85% 65%)',
  tenkan:       'hsl(0 84% 65%)',
  kijun:        'hsl(210 100% 65%)',
  senkouA:      'hsl(142 60% 50%)',
  senkouB:      'hsl(0 70% 55%)',
  chikou:       'hsl(38 70% 55%)',
  superTrendUp: 'hsl(142 76% 36%)',
  superTrendDn: 'hsl(0 84% 60%)',
};

export function CandlestickChart({
  bars,
  indicators,
  fibonacci,
  showSMA20,
  showSMA50,
  showEMA20,
  showIchimoku,
  showSuperTrend,
  showFibonacci,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);

  const candleRef       = useRef<ISeriesApi<'Candlestick', Time> | null>(null);
  const sma20Ref        = useRef<ISeriesApi<'Line', Time> | null>(null);
  const sma50Ref        = useRef<ISeriesApi<'Line', Time> | null>(null);
  const ema20Ref        = useRef<ISeriesApi<'Line', Time> | null>(null);
  const tenkanRef       = useRef<ISeriesApi<'Line', Time> | null>(null);
  const kijunRef        = useRef<ISeriesApi<'Line', Time> | null>(null);
  const senkouARef      = useRef<ISeriesApi<'Line', Time> | null>(null);
  const senkouBRef      = useRef<ISeriesApi<'Line', Time> | null>(null);
  const chikouRef       = useRef<ISeriesApi<'Line', Time> | null>(null);
  const superTrendUpRef = useRef<ISeriesApi<'Line', Time> | null>(null);
  const superTrendDnRef = useRef<ISeriesApi<'Line', Time> | null>(null);
  // Fibonacci level series (up to 7)
  const fibRefs = useRef<Array<ISeriesApi<'Line', Time>>>([]);

  const addLine = (chart: IChartApi, opts: Partial<LineSeriesOptions>): ISeriesApi<'Line', Time> =>
    chart.addSeries(LineSeries, {
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      ...opts,
    } as Partial<LineSeriesOptions>);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'hsl(215 20% 65%)',
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: 'hsl(217 33% 17%)' },
        horzLines: { color: 'hsl(217 33% 17%)' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: 'hsl(217 33% 17%)' },
      timeScale: {
        borderColor: 'hsl(217 33% 17%)',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: 380,
    });

    candleRef.current = chart.addSeries(CandlestickSeries, {
      upColor: 'hsl(142 76% 36%)',
      downColor: 'hsl(0 84% 60%)',
      borderUpColor: 'hsl(142 76% 36%)',
      borderDownColor: 'hsl(0 84% 60%)',
      wickUpColor: 'hsl(142 76% 36%)',
      wickDownColor: 'hsl(0 84% 60%)',
    } as Partial<CandlestickSeriesOptions>);

    sma20Ref.current  = addLine(chart, { color: COLORS.sma20,  lineWidth: 1 });
    sma50Ref.current  = addLine(chart, { color: COLORS.sma50,  lineWidth: 1 });
    ema20Ref.current  = addLine(chart, { color: COLORS.ema20,  lineWidth: 1 });

    // Ichimoku lines
    tenkanRef.current  = addLine(chart, { color: COLORS.tenkan,  lineWidth: 1 });
    kijunRef.current   = addLine(chart, { color: COLORS.kijun,   lineWidth: 1 });
    senkouARef.current = addLine(chart, { color: COLORS.senkouA, lineWidth: 1, lineStyle: 2 });
    senkouBRef.current = addLine(chart, { color: COLORS.senkouB, lineWidth: 1, lineStyle: 2 });
    chikouRef.current  = addLine(chart, { color: COLORS.chikou,  lineWidth: 1, lineStyle: 1 });

    // SuperTrend split into up (bullish) and down (bearish) segments
    superTrendUpRef.current = addLine(chart, { color: COLORS.superTrendUp, lineWidth: 2 });
    superTrendDnRef.current = addLine(chart, { color: COLORS.superTrendDn, lineWidth: 2 });

    // Fibonacci: 7 price-level lines
    fibRefs.current = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0].map(() =>
      addLine(chart, { color: 'hsl(38 80% 55%)', lineWidth: 1, lineStyle: 3 })
    );

    chartRef.current = chart;

    const observer = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(containerRef.current);

    return () => { observer.disconnect(); chart.remove(); chartRef.current = null; };
  }, []);

  // Update data when bars/indicators change
  useEffect(() => {
    if (!candleRef.current || !bars.length) return;

    candleRef.current.setData(
      bars.map((b) => ({
        time: toTime(b.time),
        open: b.open, high: b.high, low: b.low, close: b.close,
      })) as CandlestickData<Time>[]
    );
    chartRef.current?.timeScale().fitContent();

    // Phase 1 overlays
    sma20Ref.current?.setData(nonNull(indicators.map((d) => ({ time: toTime(d.time), value: d.sma20 }))) as LineData<Time>[]);
    sma50Ref.current?.setData(nonNull(indicators.map((d) => ({ time: toTime(d.time), value: d.sma50 }))) as LineData<Time>[]);
    ema20Ref.current?.setData(nonNull(indicators.map((d) => ({ time: toTime(d.time), value: d.ema20 }))) as LineData<Time>[]);

    // Ichimoku
    tenkanRef.current?.setData(nonNull(indicators.map((d) => ({ time: toTime(d.time), value: d.ichimokuTenkan }))) as LineData<Time>[]);
    kijunRef.current?.setData(nonNull(indicators.map((d) => ({ time: toTime(d.time), value: d.ichimokuKijun }))) as LineData<Time>[]);
    senkouARef.current?.setData(nonNull(indicators.map((d) => ({ time: toTime(d.time), value: d.ichimokuSenkouA }))) as LineData<Time>[]);
    senkouBRef.current?.setData(nonNull(indicators.map((d) => ({ time: toTime(d.time), value: d.ichimokuSenkouB }))) as LineData<Time>[]);
    chikouRef.current?.setData(nonNull(indicators.map((d) => ({ time: toTime(d.time), value: d.ichimokuChikou }))) as LineData<Time>[]);

    // SuperTrend — split by direction so color encodes trend
    const stUp: LineData<Time>[] = [];
    const stDn: LineData<Time>[] = [];
    for (const d of indicators) {
      if (d.superTrendValue === null) continue;
      const pt = { time: toTime(d.time), value: d.superTrendValue as number };
      if (d.superTrendDir === 'up') stUp.push(pt);
      else if (d.superTrendDir === 'down') stDn.push(pt);
    }
    superTrendUpRef.current?.setData(stUp);
    superTrendDnRef.current?.setData(stDn);

    // Fibonacci horizontal levels — draw as flat lines spanning the full time range
    if (fibonacci && bars.length > 0) {
      const firstTime = toTime(bars[0].time);
      const lastTime  = toTime(bars[bars.length - 1].time);
      fibonacci.levels.forEach((lvl, idx) => {
        fibRefs.current[idx]?.setData([
          { time: firstTime, value: lvl.price },
          { time: lastTime,  value: lvl.price },
        ] as LineData<Time>[]);
      });
    } else {
      fibRefs.current.forEach((s) => s.setData([]));
    }
  }, [bars, indicators, fibonacci]);

  const applyVisibility = useCallback(() => {
    sma20Ref.current?.applyOptions({ visible: showSMA20 });
    sma50Ref.current?.applyOptions({ visible: showSMA50 });
    ema20Ref.current?.applyOptions({ visible: showEMA20 });

    tenkanRef.current?.applyOptions({ visible: showIchimoku });
    kijunRef.current?.applyOptions({ visible: showIchimoku });
    senkouARef.current?.applyOptions({ visible: showIchimoku });
    senkouBRef.current?.applyOptions({ visible: showIchimoku });
    chikouRef.current?.applyOptions({ visible: showIchimoku });

    superTrendUpRef.current?.applyOptions({ visible: showSuperTrend });
    superTrendDnRef.current?.applyOptions({ visible: showSuperTrend });

    fibRefs.current.forEach((s) => s.applyOptions({ visible: showFibonacci }));
  }, [showSMA20, showSMA50, showEMA20, showIchimoku, showSuperTrend, showFibonacci]);

  useEffect(() => { applyVisibility(); }, [applyVisibility]);

  const activeLegend = [
    showSMA20       && { color: COLORS.sma20,        label: 'SMA 20' },
    showSMA50       && { color: COLORS.sma50,        label: 'SMA 50' },
    showEMA20       && { color: COLORS.ema20,        label: 'EMA 20' },
    showIchimoku    && { color: COLORS.tenkan,       label: 'Tenkan' },
    showIchimoku    && { color: COLORS.kijun,        label: 'Kijun' },
    showIchimoku    && { color: COLORS.senkouA,      label: 'Span A' },
    showIchimoku    && { color: COLORS.senkouB,      label: 'Span B' },
    showSuperTrend  && { color: COLORS.superTrendUp, label: 'ST ↑' },
    showSuperTrend  && { color: COLORS.superTrendDn, label: 'ST ↓' },
    showFibonacci   && { color: 'hsl(38 80% 55%)',   label: 'Fib' },
  ].filter(Boolean) as Array<{ color: string; label: string }>;

  return (
    <div className="relative rounded-xl border border-border bg-card overflow-hidden">
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
        {activeLegend.map((item) => (
          <LegendItem key={item.label} color={item.color} label={item.label} />
        ))}
      </div>
      <div ref={containerRef} />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 rounded bg-background/70 px-1.5 py-0.5 text-xs backdrop-blur-sm">
      <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
