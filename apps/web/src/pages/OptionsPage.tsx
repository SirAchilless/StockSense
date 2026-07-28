import { useState } from 'react';
import { useOptionChain, useOptionAnalysis } from '../hooks/useOptions';
import { OptionChainTable } from '../components/options/OptionChainTable';
import { GreeksPanel } from '../components/options/GreeksPanel';
import { OIChart } from '../components/options/OIChart';
import { MaxPainChart } from '../components/options/MaxPainChart';
import { OptionAIPanel } from '../components/options/OptionAIPanel';

const INDEX_SYMBOLS = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'];
const STOCK_SYMBOLS = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'WIPRO', 'LT', 'AXISBANK', 'KOTAKBANK', 'BAJFINANCE', 'MARUTI', 'TATAMOTORS', 'SUNPHARMA', 'HINDUNILVR'];

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export default function OptionsPage() {
  const [symbol, setSymbol] = useState('NIFTY');
  const [selectedExpiry, setSelectedExpiry] = useState<string | undefined>();
  const [showAI, setShowAI] = useState(false);
  const [activeTab, setActiveTab] = useState<'chain' | 'oi' | 'maxpain'>('chain');

  const { data: chain, isLoading, error } = useOptionChain(symbol, selectedExpiry);
  const { data: analysis, isLoading: aiLoading, error: aiError } = useOptionAnalysis(symbol, selectedExpiry, showAI);

  const expiries = chain?.availableExpiries ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Option Chain</h1>
        <p className="text-sm text-muted-foreground mt-1">
          NSE option chain with live Greeks, OI distribution, and max pain analysis.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Symbol selector */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wide">Symbol</label>
          <div className="flex flex-wrap gap-1.5">
            {INDEX_SYMBOLS.map((s) => (
              <button
                key={s}
                onClick={() => { setSymbol(s); setSelectedExpiry(undefined); setShowAI(false); }}
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
          <div className="flex flex-wrap gap-1.5 mt-1">
            {STOCK_SYMBOLS.map((s) => (
              <button
                key={s}
                onClick={() => { setSymbol(s); setSelectedExpiry(undefined); setShowAI(false); }}
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

        {/* Expiry selector */}
        {expiries.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Expiry</label>
            <div className="flex flex-wrap gap-1.5">
              {expiries.slice(0, 6).map((e) => (
                <button
                  key={e}
                  onClick={() => setSelectedExpiry(e)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors border ${
                    (selectedExpiry ?? expiries[0]) === e
                      ? 'bg-secondary text-secondary-foreground border-secondary'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isLoading && <Spinner />}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load option chain for {symbol}. Please try again.
        </div>
      )}

      {chain && (
        <>
          {/* Spot + expiry badge */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold text-lg">
              {symbol}{' '}
              <span className="text-muted-foreground font-normal">
                {chain.underlyingPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </span>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
              {chain.expiry} · {chain.daysToExpiry}d to expiry
            </span>
            <span className="text-xs text-muted-foreground">
              Updated: {new Date(chain.dataAsOf).toLocaleTimeString('en-IN')}
            </span>
          </div>

          {/* Greeks Summary */}
          <GreeksPanel chain={chain} />

          {/* Tab selector */}
          <div className="flex gap-1 border-b border-border">
            {[
              { key: 'chain', label: 'Option Chain' },
              { key: 'oi', label: 'OI Distribution' },
              { key: 'maxpain', label: 'Max Pain' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
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
            {activeTab === 'chain' && (
              <OptionChainTable strikes={chain.strikes} underlyingPrice={chain.underlyingPrice} />
            )}
            {activeTab === 'oi' && <OIChart chain={chain} />}
            {activeTab === 'maxpain' && <MaxPainChart chain={chain} />}
          </div>

          {/* AI Interpretation */}
          <div>
            {!showAI ? (
              <button
                onClick={() => setShowAI(true)}
                className="w-full rounded-lg border-2 border-dashed border-border py-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              >
                ✦ Load AI Option Chain Interpretation
              </button>
            ) : aiLoading ? (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Generating AI interpretation…
                </div>
              </div>
            ) : aiError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                Failed to generate AI interpretation. Please try again.
              </div>
            ) : analysis ? (
              <OptionAIPanel result={analysis} symbol={symbol} />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
