import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  useRollover,
  useMarketWideRollover,
  useFiiDerPositions,
  useParticipantOI,
  useCostOfCarry,
  useOITrends,
  usePCR,
  useMarketWidePCR,
} from '../hooks/useFnOData';
import { useFnOAI } from '../hooks/useFnOAI';
import { RolloverCard } from '../components/RolloverCard';
import { RolloverHeatmap } from '../components/RolloverHeatmap';
import { PCRGauge } from '../components/PCRGauge';
import { PCRTrendChart } from '../components/PCRTrendChart';
import { OITrendTable } from '../components/OITrendTable';
import { CostOfCarryChart } from '../components/CostOfCarryChart';
import { FnOAICommentary } from '../components/FnOAICommentary';
import { RolloverPanel } from '../../../components/fno/RolloverPanel';
import { FiiDiiDerPanel } from '../../../components/fno/FiiDiiDerPanel';
import { ParticipantOITable } from '../../../components/fno/ParticipantOITable';

const INDEX_SYMBOLS = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'];
const STOCK_SYMBOLS = [
  'RELIANCE',
  'TCS',
  'HDFCBANK',
  'INFY',
  'ICICIBANK',
  'SBIN',
  'WIPRO',
  'LT',
  'AXISBANK',
  'KOTAKBANK',
  'BAJFINANCE',
  'MARUTI',
  'TATAMOTORS',
  'SUNPHARMA',
  'HINDUNILVR',
];

type Tab =
  | 'overview'
  | 'rollover-detail'
  | 'heatmap'
  | 'fii-dii'
  | 'participant'
  | 'pcr'
  | 'oi-trends'
  | 'cost-of-carry';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'rollover-detail', label: 'Rollover Detail' },
  { key: 'heatmap', label: 'Heatmap' },
  { key: 'fii-dii', label: 'FII / DII' },
  { key: 'participant', label: 'Participant OI' },
  { key: 'pcr', label: 'PCR' },
  { key: 'oi-trends', label: 'OI Trends' },
  { key: 'cost-of-carry', label: 'Cost of Carry' },
];

export default function FnODashboard() {
  const [symbol, setSymbol] = useState('NIFTY');
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showAI, setShowAI] = useState(false);

  // Data hooks
  const { data: rollover, isLoading: rolloverLoading, error: rolloverError } = useRollover(symbol);
  const {
    data: marketWideRollover,
    isLoading: heatmapLoading,
    error: heatmapError,
  } = useMarketWideRollover();
  const { data: fiiPositions, isLoading: fiiLoading, error: fiiError } = useFiiDerPositions();
  const { data: participantOI, isLoading: partLoading, error: partError } = useParticipantOI();
  const { data: coc, isLoading: cocLoading, error: cocError } = useCostOfCarry(symbol);
  const { data: oiTrends, isLoading: oiLoading, error: oiError } = useOITrends(symbol);
  const { data: pcr, isLoading: pcrLoading, error: pcrError } = usePCR(symbol);
  const { data: marketWidePCR, isLoading: widePcrLoading } = useMarketWidePCR();
  const { data: analysis, isLoading: aiLoading, error: aiError } = useFnOAI(symbol, showAI);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">F&O Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Futures rollover, FII/DII positioning, PCR, OI trends, cost of carry.{' '}
          <span className="font-medium">Delayed EOD data.</span>
        </p>
      </div>

      {/* Symbol selector */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Index</p>
        <div className="flex flex-wrap gap-1.5">
          {INDEX_SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSymbol(s);
                setShowAI(false);
              }}
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
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Stocks</p>
        <div className="flex flex-wrap gap-1.5">
          {STOCK_SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSymbol(s);
                setShowAI(false);
              }}
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
      </div>

      {/* Tab nav */}
      <div className="flex gap-0.5 border-b border-border overflow-x-auto scrollbar-thin">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              activeTab === key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="space-y-4"
      >
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <RolloverCard
              data={rollover}
              isLoading={rolloverLoading}
              error={rolloverError as Error | null}
            />
            <PCRGauge data={pcr} isLoading={pcrLoading} error={pcrError as Error | null} />
          </div>
        )}

        {activeTab === 'rollover-detail' && (
          <div className="rounded-lg border border-border bg-card p-4">
            {rolloverLoading ? (
              <div className="h-40 bg-muted rounded animate-pulse" />
            ) : rolloverError ? (
              <p className="text-sm text-destructive">Rollover data unavailable. Please retry.</p>
            ) : rollover ? (
              <RolloverPanel data={rollover} />
            ) : (
              <p className="text-sm text-muted-foreground">No rollover data for {symbol}.</p>
            )}
          </div>
        )}

        {activeTab === 'heatmap' && (
          <RolloverHeatmap
            data={marketWideRollover}
            isLoading={heatmapLoading}
            error={heatmapError as Error | null}
          />
        )}

        {activeTab === 'fii-dii' && (
          <div className="rounded-lg border border-border bg-card p-4">
            {fiiLoading ? (
              <div className="h-40 bg-muted rounded animate-pulse" />
            ) : fiiError ? (
              <p className="text-sm text-destructive">FII/DII data unavailable. Please retry.</p>
            ) : fiiPositions ? (
              <FiiDiiDerPanel data={fiiPositions} />
            ) : (
              <p className="text-sm text-muted-foreground">No FII/DII data available.</p>
            )}
          </div>
        )}

        {activeTab === 'participant' && (
          <div className="rounded-lg border border-border bg-card p-4">
            {partLoading ? (
              <div className="h-40 bg-muted rounded animate-pulse" />
            ) : partError ? (
              <p className="text-sm text-destructive">
                Participant OI data unavailable. Please retry.
              </p>
            ) : participantOI ? (
              <ParticipantOITable data={participantOI} />
            ) : (
              <p className="text-sm text-muted-foreground">No participant OI data available.</p>
            )}
          </div>
        )}

        {activeTab === 'pcr' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PCRGauge data={pcr} isLoading={pcrLoading} error={pcrError as Error | null} />
            <PCRTrendChart data={marketWidePCR} isLoading={widePcrLoading} />
          </div>
        )}

        {activeTab === 'oi-trends' && (
          <OITrendTable data={oiTrends} isLoading={oiLoading} error={oiError as Error | null} />
        )}

        {activeTab === 'cost-of-carry' && (
          <CostOfCarryChart data={coc} isLoading={cocLoading} error={cocError as Error | null} />
        )}
      </motion.div>

      {/* AI Commentary section */}
      <div>
        {!showAI ? (
          <button
            onClick={() => setShowAI(true)}
            className="w-full rounded-lg border-2 border-dashed border-border py-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
          >
            ✦ Load AI F&O Interpretation for {symbol}
          </button>
        ) : (
          <FnOAICommentary
            result={analysis}
            symbol={symbol}
            isLoading={aiLoading}
            error={aiError as Error | null}
          />
        )}
      </div>
    </div>
  );
}
