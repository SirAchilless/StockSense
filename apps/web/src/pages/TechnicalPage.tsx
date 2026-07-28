import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTechnical } from '../hooks/useTechnical';
import { CandlestickChart } from '../components/technical/CandlestickChart';
import { RSIPanel, MACDPanel, ATRPanel } from '../components/technical/IndicatorPanel';
import { TimeframeSelector } from '../components/technical/TimeframeSelector';
import { VolumeProfileChart } from '../components/technical/VolumeProfileChart';
import { PatternSignals } from '../components/technical/PatternSignals';
import type { Timeframe } from '../types/technical';

// ── Overlay groups ─────────────────────────────────────────────────────────
// Organised so the toggle bar doesn't get too wide
type OverlayKey =
  | 'sma20' | 'sma50' | 'ema20'
  | 'ichimoku' | 'superTrend' | 'fibonacci'
  | 'rsi' | 'macd' | 'atr'
  | 'volumeProfile' | 'patterns';

const OVERLAY_CONFIG: Array<{
  key: OverlayKey;
  label: string;
  color: string;
  group: 'price' | 'panel';
}> = [
  { key: 'sma20',         label: 'SMA 20',       color: 'hsl(210 100% 56%)', group: 'price' },
  { key: 'sma50',         label: 'SMA 50',        color: 'hsl(38 92% 50%)',   group: 'price' },
  { key: 'ema20',         label: 'EMA 20',        color: 'hsl(280 85% 65%)',  group: 'price' },
  { key: 'ichimoku',      label: 'Ichimoku',       color: 'hsl(0 84% 65%)',    group: 'price' },
  { key: 'superTrend',    label: 'SuperTrend',     color: 'hsl(142 76% 50%)',  group: 'price' },
  { key: 'fibonacci',     label: 'Fibonacci',      color: 'hsl(38 80% 55%)',   group: 'price' },
  { key: 'rsi',           label: 'RSI',            color: 'hsl(215 20% 65%)',  group: 'panel' },
  { key: 'macd',          label: 'MACD',           color: 'hsl(215 20% 65%)',  group: 'panel' },
  { key: 'atr',           label: 'ATR',            color: 'hsl(280 85% 65%)',  group: 'panel' },
  { key: 'volumeProfile', label: 'Vol Profile',    color: 'hsl(38 92% 50%)',   group: 'panel' },
  { key: 'patterns',      label: 'Patterns',       color: 'hsl(210 100% 56%)', group: 'panel' },
];

type OverlayState = Record<OverlayKey, boolean>;

const DEFAULT_OVERLAYS: OverlayState = {
  sma20: true,
  sma50: true,
  ema20: false,
  ichimoku: false,
  superTrend: false,
  fibonacci: false,
  rsi: true,
  macd: true,
  atr: false,
  volumeProfile: false,
  patterns: true,
};

// ── Compare mode: second timeframe ────────────────────────────────────────
function ComparePanel({
  symbol,
  timeframe,
}: {
  symbol: string;
  timeframe: Timeframe;
}) {
  const { data, isLoading, error } = useTechnical(symbol, timeframe);

  if (isLoading) return <ChartSkeleton />;
  if (error || !data) return (
    <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
      Unable to load {timeframe} data
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium">{timeframe} view</p>
      <CandlestickChart
        key={`compare-${symbol}-${timeframe}`}
        bars={data.bars}
        indicators={data.indicators}
        fibonacci={data.fibonacci}
        showSMA20={true}
        showSMA50={true}
        showEMA20={false}
        showIchimoku={false}
        showSuperTrend={false}
        showFibonacci={false}
      />
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function TechnicalPage() {
  const [input, setInput]         = useState('');
  const [symbol, setSymbol]       = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [overlays, setOverlays]   = useState<OverlayState>(DEFAULT_OVERLAYS);
  const [compareMode, setCompareMode] = useState(false);
  const [compareTimeframe, setCompareTimeframe] = useState<Timeframe>('1W');

  const { data, isLoading, isFetching, error } = useTechnical(symbol, timeframe);

  const toggle = (key: OverlayKey) =>
    setOverlays((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = input.trim().toUpperCase();
    if (sym) setSymbol(sym);
  };

  const loading = isLoading || isFetching;

  const priceOverlays = OVERLAY_CONFIG.filter((o) => o.group === 'price');
  const panelOverlays = OVERLAY_CONFIG.filter((o) => o.group === 'panel');

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Technical Analysis</h1>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="NSE symbol (e.g. RELIANCE, TCS, INFY)"
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm uppercase placeholder:normal-case placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Analyse'}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Chart data unavailable. Please try again.</p>
        </div>
      )}

      {isLoading && !data && <ChartSkeleton />}

      {data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Toolbar row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{data.symbol}</h2>
              {isFetching && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <TimeframeSelector value={timeframe} onChange={setTimeframe} />
              <button
                onClick={() => setCompareMode((v) => !v)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  compareMode
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {compareMode ? 'Exit Compare' : 'Compare Timeframe'}
              </button>
            </div>
          </div>

          {/* Price overlay toggles */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Price overlays</p>
            <div className="flex flex-wrap gap-2">
              {priceOverlays.map(({ key, label, color }) => (
                <OverlayToggle
                  key={key}
                  label={label}
                  active={overlays[key]}
                  color={color}
                  onClick={() => toggle(key)}
                />
              ))}
            </div>
          </div>

          {/* Panel toggles */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sub-panels</p>
            <div className="flex flex-wrap gap-2">
              {panelOverlays.map(({ key, label, color }) => (
                <OverlayToggle
                  key={key}
                  label={label}
                  active={overlays[key]}
                  color={color}
                  onClick={() => toggle(key)}
                />
              ))}
            </div>
          </div>

          {/* Main candlestick chart */}
          <CandlestickChart
            key={`${data.symbol}-${data.timeframe}`}
            bars={data.bars}
            indicators={data.indicators}
            fibonacci={data.fibonacci}
            showSMA20={overlays.sma20}
            showSMA50={overlays.sma50}
            showEMA20={overlays.ema20}
            showIchimoku={overlays.ichimoku}
            showSuperTrend={overlays.superTrend}
            showFibonacci={overlays.fibonacci}
          />

          {/* Compare mode: second timeframe chart */}
          {compareMode && symbol && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Compare with:</p>
                <TimeframeSelector value={compareTimeframe} onChange={setCompareTimeframe} />
              </div>
              <ComparePanel symbol={symbol} timeframe={compareTimeframe} />
            </div>
          )}

          {/* Sub-panels */}
          {overlays.rsi        && <RSIPanel indicators={data.indicators} />}
          {overlays.macd       && <MACDPanel indicators={data.indicators} />}
          {overlays.atr        && <ATRPanel indicators={data.indicators} />}
          {overlays.volumeProfile && data.volumeProfile.length > 0 && (
            <VolumeProfileChart bins={data.volumeProfile} />
          )}
          {overlays.patterns   && <PatternSignals patterns={data.patterns} />}

          {/* Fibonacci levels table */}
          {overlays.fibonacci && data.fibonacci && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                Fibonacci Retracement —{' '}
                <span className={data.fibonacci.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}>
                  {data.fibonacci.direction === 'up' ? '↑ Uptrend' : '↓ Downtrend'}
                </span>
                {' '}(swing {data.fibonacci.direction === 'up' ? 'high' : 'low'} to {data.fibonacci.direction === 'up' ? 'low' : 'high'})
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
                {data.fibonacci.levels.map((lvl) => (
                  <div
                    key={lvl.ratio}
                    className={`rounded-lg border px-3 py-2 text-center ${
                      lvl.ratio === 0 || lvl.ratio === 1.0
                        ? 'border-amber-500/40 bg-amber-500/10'
                        : 'border-border bg-muted/30'
                    }`}
                  >
                    <p className="text-[10px] text-muted-foreground">{lvl.label}</p>
                    <p className="font-mono text-xs font-semibold">₹{lvl.price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="text-xs text-muted-foreground">
            {data.bars.length} bars ·{' '}
            {data.patterns.length} pattern{data.patterns.length !== 1 ? 's' : ''} detected ·{' '}
            All indicators computed server-side from OHLCV data
          </p>
        </motion.div>
      )}
    </div>
  );
}

function OverlayToggle({
  label, active, color, onClick,
}: {
  label: string; active: boolean; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'border-transparent bg-muted text-foreground'
          : 'border-border text-muted-foreground hover:text-foreground'
      }`}
    >
      <span
        className="inline-block h-0.5 w-3 rounded-full transition-opacity"
        style={{ backgroundColor: color, opacity: active ? 1 : 0.3 }}
      />
      {label}
    </button>
  );
}

function ChartSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-48 rounded-lg bg-muted" />
      <div className="h-96 rounded-xl bg-muted" />
      <div className="h-28 rounded-xl bg-muted" />
    </div>
  );
}
