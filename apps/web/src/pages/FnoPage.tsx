import { useState } from 'react';
import { useRollover, useFiiDerPositions, useParticipantOI, useFnoAnalysis } from '../hooks/useFno';
import { RolloverPanel } from '../components/fno/RolloverPanel';
import { FiiDiiDerPanel } from '../components/fno/FiiDiiDerPanel';
import { ParticipantOITable } from '../components/fno/ParticipantOITable';
import { FnoAIPanel } from '../components/fno/FnoAIPanel';

const INDEX_SYMBOLS = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'];
const STOCK_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'SBIN', 'WIPRO', 'LT', 'AXISBANK', 'KOTAKBANK',
  'BAJFINANCE', 'MARUTI', 'TATAMOTORS', 'SUNPHARMA', 'HINDUNILVR',
];

type Tab = 'rollover' | 'fii-dii' | 'participant';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export default function FnoPage() {
  const [symbol, setSymbol] = useState('NIFTY');
  const [activeTab, setActiveTab] = useState<Tab>('rollover');
  const [showAI, setShowAI] = useState(false);

  const { data: rollover, isLoading: rolloverLoading } = useRollover(symbol);
  const { data: fiiPositions, isLoading: fiiLoading } = useFiiDerPositions();
  const { data: participantOI, isLoading: partLoading } = useParticipantOI();
  const { data: analysis, isLoading: aiLoading, error: aiError } = useFnoAnalysis(symbol, showAI);

  const isLoading = rolloverLoading || fiiLoading || partLoading;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">F&O Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Futures rollover, FII/DII positioning, cost of carry, and participant-wise OI.
        </p>
      </div>

      {/* Symbol selector */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {INDEX_SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => { setSymbol(s); setShowAI(false); }}
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
              onClick={() => { setSymbol(s); setShowAI(false); }}
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

      {isLoading && <Spinner />}

      {!isLoading && (
        <>
          {/* Tab selector */}
          <div className="flex gap-1 border-b border-border">
            {[
              { key: 'rollover' as Tab, label: 'Rollovers & CoC' },
              { key: 'fii-dii' as Tab, label: 'FII / DII Positioning' },
              { key: 'participant' as Tab, label: 'Participant OI' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
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
          <div className="rounded-lg border border-border bg-card p-4">
            {activeTab === 'rollover' && rollover && <RolloverPanel data={rollover} />}
            {activeTab === 'fii-dii' && fiiPositions && <FiiDiiDerPanel data={fiiPositions} />}
            {activeTab === 'participant' && participantOI && <ParticipantOITable data={participantOI} />}
          </div>

          {/* AI Interpretation */}
          <div>
            {!showAI ? (
              <button
                onClick={() => setShowAI(true)}
                className="w-full rounded-lg border-2 border-dashed border-border py-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              >
                ✦ Load AI F&O Interpretation for {symbol}
              </button>
            ) : aiLoading ? (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Generating F&O intelligence interpretation…
                </div>
              </div>
            ) : aiError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                Failed to generate AI interpretation. Please try again.
              </div>
            ) : analysis ? (
              <FnoAIPanel result={analysis} symbol={symbol} />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
