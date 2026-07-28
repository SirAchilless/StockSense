import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTechnical } from '../hooks/useTechnical';
import { CandlestickChart } from '../components/technical/CandlestickChart';
import { RSIPanel, MACDPanel } from '../components/technical/IndicatorPanel';
import { TimeframeSelector } from '../components/technical/TimeframeSelector';
import type { Timeframe } from '../types/technical';

export default function TechnicalPage() {
  const [input, setInput] = useState('');
  const [symbol, setSymbol] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');

  // Overlay toggles
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(true);
  const [showEMA20, setShowEMA20] = useState(false);
  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(true);

  const { data, isLoading, isFetching, error } = useTechnical(symbol, timeframe);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = input.trim().toUpperCase();
    if (sym) setSymbol(sym);
  };

  const loading = isLoading || isFetching;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
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
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{data.symbol}</h2>
              {isFetching && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </div>
            <TimeframeSelector value={timeframe} onChange={setTimeframe} />
          </div>

          {/* Overlay toggles */}
          <div className="flex flex-wrap gap-2">
            <OverlayToggle label="SMA 20" active={showSMA20} color="hsl(210 100% 56%)" onClick={() => setShowSMA20((v) => !v)} />
            <OverlayToggle label="SMA 50" active={showSMA50} color="hsl(38 92% 50%)" onClick={() => setShowSMA50((v) => !v)} />
            <OverlayToggle label="EMA 20" active={showEMA20} color="hsl(280 85% 65%)" onClick={() => setShowEMA20((v) => !v)} />
            <OverlayToggle label="RSI" active={showRSI} color="hsl(215 20% 65%)" onClick={() => setShowRSI((v) => !v)} />
            <OverlayToggle label="MACD" active={showMACD} color="hsl(215 20% 65%)" onClick={() => setShowMACD((v) => !v)} />
          </div>

          {/* Candlestick chart */}
          <CandlestickChart
            key={`${data.symbol}-${data.timeframe}`}
            bars={data.bars}
            indicators={data.indicators}
            showSMA20={showSMA20}
            showSMA50={showSMA50}
            showEMA20={showEMA20}
          />

          {/* Sub-panels */}
          {showRSI && <RSIPanel indicators={data.indicators} />}
          {showMACD && <MACDPanel indicators={data.indicators} />}

          {/* Footer */}
          <p className="text-xs text-muted-foreground">
            {data.bars.length} bars · SMA/EMA/RSI/MACD computed server-side from OHLC data
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
