import { useState } from 'react';
import { motion } from 'framer-motion';
import { useResearch } from '../hooks/useResearch';
import { DisclaimerBanner } from '../components/research/DisclaimerBanner';
import { RatioGrid } from '../components/research/RatioGrid';
import { ConfidenceBar } from '../components/research/ConfidenceBar';

export default function ResearchPage() {
  const [input, setInput] = useState('');
  const [symbol, setSymbol] = useState<string | null>(null);
  const { data, isLoading, error, isFetching } = useResearch(symbol);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = input.trim().toUpperCase();
    if (sym) setSymbol(sym);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">AI Stock Research</h1>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-8 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="NSE symbol (e.g. RELIANCE, TCS, INFY)"
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm uppercase placeholder:normal-case placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading || isFetching}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {isLoading || isFetching ? 'Researching…' : 'Research'}
        </button>
      </form>

      {/* Results */}
      {isLoading && <ResearchSkeleton />}

      {error && (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Research unavailable. Please try again.</p>
        </div>
      )}

      {data && !isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{data.symbol}</h2>
            {data.cached && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Cached
              </span>
            )}
          </div>

          <ConfidenceBar confidence={data.response.confidence} />
          <DisclaimerBanner text={data.disclaimer} />

          {/* Business Summary */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Business Summary</h3>
            <p className="text-sm leading-relaxed text-foreground">
              {data.response.businessSummary}
            </p>
          </div>

          {/* Ratios */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">Key Ratios</h3>
            <RatioGrid ratios={data.response.ratios} />
          </div>

          {/* Bull / Bear */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 border-l-4 border-l-[hsl(142_76%_36%)]">
              <h3 className="mb-2 text-sm font-medium text-[hsl(142_76%_36%)]">Bull Case</h3>
              <p className="text-sm leading-relaxed text-foreground">{data.response.bullCase}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 border-l-4 border-l-destructive">
              <h3 className="mb-2 text-sm font-medium text-destructive">Bear Case</h3>
              <p className="text-sm leading-relaxed text-foreground">{data.response.bearCase}</p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground">
            Data as of{' '}
            {new Date(data.dataAsOf).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
          </p>
        </motion.div>
      )}
    </div>
  );
}

function ResearchSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-muted" />
      ))}
    </div>
  );
}
