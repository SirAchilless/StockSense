import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMarketNews, useSymbolNews } from '../hooks/useNews';
import { NewsCard } from '../components/news/NewsCard';
import { DisclaimerBanner } from '../components/research/DisclaimerBanner';
import type { SentimentLabel } from '../types/news';

type Tab = 'market' | 'symbol';

const DISCLAIMER_TEXT =
  'AI-generated sentiment scores are for informational purposes only. This is not investment advice. Sentiment analysis may be inaccurate. StockSense is not a SEBI-registered research analyst.';

// ── Sentiment summary bar ─────────────────────────────────────────────────
function SentimentSummary({ counts }: { counts: Record<SentimentLabel, number> }) {
  const total = counts.bullish + counts.bearish + counts.neutral;
  if (total === 0) return null;
  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Sentiment Overview</p>
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        <div className="bg-emerald-500 transition-all" style={{ width: `${pct(counts.bullish)}%` }} />
        <div className="bg-muted transition-all"   style={{ width: `${pct(counts.neutral)}%` }} />
        <div className="bg-red-500 transition-all"     style={{ width: `${pct(counts.bearish)}%` }} />
      </div>
      <div className="flex gap-4 text-xs">
        <span className="text-emerald-400">{counts.bullish} bullish ({pct(counts.bullish)}%)</span>
        <span className="text-muted-foreground">{counts.neutral} neutral ({pct(counts.neutral)}%)</span>
        <span className="text-red-400">{counts.bearish} bearish ({pct(counts.bearish)}%)</span>
      </div>
    </div>
  );
}

// ── Market News tab ───────────────────────────────────────────────────────
function MarketNewsTab({ withSentiment }: { withSentiment: boolean }) {
  const { data, isLoading, isFetching, error, refetch } = useMarketNews(withSentiment);

  const counts: Record<SentimentLabel, number> = { bullish: 0, bearish: 0, neutral: 0 };
  if (data?.articles) {
    for (const a of data.articles) {
      if (a.sentiment) counts[a.sentiment]++;
    }
  }

  return (
    <div className="space-y-4">
      {(isLoading || isFetching) && !data && <NewsSkeleton />}
      {error && (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          News unavailable.{' '}
          <button onClick={() => refetch()} className="text-primary underline underline-offset-2">
            Retry
          </button>
        </div>
      )}
      {data && (
        <>
          {withSentiment && data.sentimentScored && (
            <SentimentSummary counts={counts} />
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {data.count} articles · fetched {new Date(data.fetchedAt).toLocaleTimeString('en-IN')}
              {isFetching && ' · refreshing…'}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.articles.map((item, i) => (
              <NewsCard key={item.id} item={item} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Symbol News tab ───────────────────────────────────────────────────────
function SymbolNewsTab({ withSentiment }: { withSentiment: boolean }) {
  const [input, setInput]   = useState('');
  const [symbol, setSymbol] = useState<string | null>(null);
  const { data, isLoading, isFetching, error } = useSymbolNews(symbol, withSentiment);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = input.trim().toUpperCase();
    if (sym) setSymbol(sym);
  };

  const counts: Record<SentimentLabel, number> = { bullish: 0, bearish: 0, neutral: 0 };
  if (data?.articles) {
    for (const a of data.articles) {
      if (a.sentiment) counts[a.sentiment]++;
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="NSE symbol (e.g. RELIANCE, TCS)"
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm uppercase placeholder:normal-case placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading || isFetching}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {isLoading || isFetching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {(isLoading || isFetching) && !data && <NewsSkeleton />}

      {error && (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Could not fetch news for this symbol.
        </div>
      )}

      {data && (
        <>
          {withSentiment && data.sentimentScored && (
            <SentimentSummary counts={counts} />
          )}
          <p className="text-xs text-muted-foreground">
            {data.count} articles for <span className="font-mono font-medium text-foreground">{data.symbol}</span>
          </p>
          {data.count === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No news found for {data.symbol}. Try a different symbol.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.articles.map((item, i) => (
                <NewsCard key={item.id} item={item} index={i} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function NewsPage() {
  const [tab, setTab]                 = useState<Tab>('market');
  const [withSentiment, setWithSentiment] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Market News</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Indian equity news with AI-powered sentiment analysis
          </p>
        </div>

        {/* Sentiment toggle */}
        <button
          onClick={() => setWithSentiment((v) => !v)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            withSentiment
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${withSentiment ? 'bg-primary' : 'bg-muted-foreground'}`} />
          AI Sentiment
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {(['market', 'symbol'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'market' ? 'Market News' : 'By Symbol'}
          </button>
        ))}
      </div>

      {withSentiment && (
        <div className="mb-4">
          <DisclaimerBanner text={DISCLAIMER_TEXT} />
        </div>
      )}

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {tab === 'market'
            ? <MarketNewsTab withSentiment={withSentiment} />
            : <SymbolNewsTab withSentiment={withSentiment} />
          }
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function NewsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-44 rounded-xl bg-muted" />
      ))}
    </div>
  );
}
