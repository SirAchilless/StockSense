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
import type { OHLCBar, IndicatorBar } from '../../types/technical';

interface Props {
  bars: OHLCBar[];
  indicators: IndicatorBar[];
  showSMA20: boolean;
  showSMA50: boolean;
  showEMA20: boolean;
}

function toTime(s: string): Time {
  return s as Time;
}

export function CandlestickChart({ bars, indicators, showSMA20, showSMA50, showEMA20 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick', Time> | null>(null);
  const sma20Ref = useRef<ISeriesApi<'Line', Time> | null>(null);
  const sma50Ref = useRef<ISeriesApi<'Line', Time> | null>(null);
  const ema20Ref = useRef<ISeriesApi<'Line', Time> | null>(null);

  // Initialise chart once
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

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: 'hsl(142 76% 36%)',
      downColor: 'hsl(0 84% 60%)',
      borderUpColor: 'hsl(142 76% 36%)',
      borderDownColor: 'hsl(0 84% 60%)',
      wickUpColor: 'hsl(142 76% 36%)',
      wickDownColor: 'hsl(0 84% 60%)',
    } as Partial<CandlestickSeriesOptions>);

    const sma20Series = chart.addSeries(LineSeries, {
      color: 'hsl(210 100% 56%)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    } as Partial<LineSeriesOptions>);

    const sma50Series = chart.addSeries(LineSeries, {
      color: 'hsl(38 92% 50%)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    } as Partial<LineSeriesOptions>);

    const ema20Series = chart.addSeries(LineSeries, {
      color: 'hsl(280 85% 65%)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    } as Partial<LineSeriesOptions>);

    chartRef.current = chart;
    candleRef.current = candleSeries;
    sma20Ref.current = sma20Series;
    sma50Ref.current = sma50Series;
    ema20Ref.current = ema20Series;

    // Responsive resize
    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Update data when bars/indicators change
  useEffect(() => {
    if (!candleRef.current || !bars.length) return;

    const candleData: CandlestickData<Time>[] = bars.map((b) => ({
      time: toTime(b.time),
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));
    candleRef.current.setData(candleData);
    chartRef.current?.timeScale().fitContent();

    const nonNull = <T,>(arr: Array<{ time: Time; value: T | null }>): Array<{ time: Time; value: T }> =>
      arr.filter((p): p is { time: Time; value: T } => p.value !== null);

    sma20Ref.current?.setData(
      nonNull(indicators.map((ind) => ({ time: toTime(ind.time), value: ind.sma20 }))) as LineData<Time>[]
    );
    sma50Ref.current?.setData(
      nonNull(indicators.map((ind) => ({ time: toTime(ind.time), value: ind.sma50 }))) as LineData<Time>[]
    );
    ema20Ref.current?.setData(
      nonNull(indicators.map((ind) => ({ time: toTime(ind.time), value: ind.ema20 }))) as LineData<Time>[]
    );
  }, [bars, indicators]);

  // Show/hide overlay series
  const applyVisibility = useCallback(() => {
    sma20Ref.current?.applyOptions({ visible: showSMA20 });
    sma50Ref.current?.applyOptions({ visible: showSMA50 });
    ema20Ref.current?.applyOptions({ visible: showEMA20 });
  }, [showSMA20, showSMA50, showEMA20]);

  useEffect(() => {
    applyVisibility();
  }, [applyVisibility]);

  return (
    <div className="relative rounded-xl border border-border bg-card overflow-hidden">
      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-3 text-xs">
        {showSMA20 && <LegendItem color="hsl(210 100% 56%)" label="SMA 20" />}
        {showSMA50 && <LegendItem color="hsl(38 92% 50%)" label="SMA 50" />}
        {showEMA20 && <LegendItem color="hsl(280 85% 65%)" label="EMA 20" />}
      </div>
      <div ref={containerRef} />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 rounded bg-background/70 px-1.5 py-0.5 backdrop-blur-sm">
      <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
