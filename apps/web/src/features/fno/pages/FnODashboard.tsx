import { useState } from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import {
  useRollover, useMarketWideRollover, useParticipantOI,
  useCostOfCarry, useOITrends, usePCR, useMarketWidePCR,
} from '../hooks/useFnOData';
import { RolloverCard } from '../components/RolloverCard';
import { RolloverHeatmap } from '../components/RolloverHeatmap';
import { ParticipantOITable } from '../components/ParticipantOITable';
import { CostOfCarryChart } from '../components/CostOfCarryChart';
import { OITrendTable } from '../components/OITrendTable';
import { PCRGauge } from '../components/PCRGauge';
import { PCRTrendChart } from '../components/PCRTrendChart';
import { FnOAICommentary } from '../components/FnOAICommentary';

const INDEX_SYMBOLS = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'];
const STOCK_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'WIPRO', 'LT', 'AXISBANK',
  'KOTAKBANK', 'BAJFINANCE', 'MARUTI', 'TATAMOTORS', 'SUNPHARMA', 'HINDUNILVR',
];

export default function FnODashboard() {
  const [symbol, setSymbol] = useState('NIFTY');

  const rollover = useRollover(symbol);
  const marketRollover = useMarketWideRollover();
  const poi = useParticipantOI();
  const coc = useCostOfCarry(symbol);
  const oi = useOITrends(symbol);
  const pcr = usePCR(symbol);
  const marketPcr = useMarketWidePCR();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-7xl px-4 py-6 space-y-6"
    >
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">F&O Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rollovers, cost of carry, participant OI, OI trends & PCR — NSE delayed/EOD data.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg border border-border bg-card/60 backdrop-blur-sm px-3 py-2">
          <Info className="h-3.5 w-3.5" />
          <span>Data is delayed / EOD. Not real-time.</span>
        </div>
      </header>

      {/* Symbol selector */}
      <section className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {INDEX_SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                symbol === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STOCK_SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                symbol === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* Top row */}
      <section className="grid gap-4 md:grid-cols-3">
        <RolloverCard data={rollover.data} isLoading={rollover.isLoading} error={rollover.error as Error | null} />
        <PCRGauge data={pcr.data} isLoading={pcr.isLoading} error={pcr.error as Error | null} />
        <CostOfCarryChart
          data={coc.data}
          symbol={symbol}
          isLoading={coc.isLoading}
          error={coc.error as Error | null}
        />
      </section>

      {/* OI Trends */}
      <section>
        <OITrendTable data={oi.data} isLoading={oi.isLoading} error={oi.error as Error | null} />
      </section>

      {/* Market-wide */}
      <section className="grid gap-4 lg:grid-cols-2">
        <RolloverHeatmap data={marketRollover.data} isLoading={marketRollover.isLoading} error={marketRollover.error as Error | null} />
        <PCRTrendChart data={marketPcr.data} isLoading={marketPcr.isLoading} error={marketPcr.error as Error | null} />
      </section>

      {/* Participant-wise OI table */}
      <section>
        <ParticipantOITable data={poi.data} isLoading={poi.isLoading} error={poi.error as Error | null} />
      </section>

      {/* AI Commentary */}
      <section>
        <FnOAICommentary symbol={symbol} />
      </section>
    </motion.div>
  );
}
