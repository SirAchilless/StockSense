import { motion } from 'framer-motion';
import { useGlobalMarkets } from '../hooks/useGlobalMarkets';
import { GlobalQuoteTile } from '../components/global/GlobalQuoteTile';
import { ConfidenceBar } from '../components/research/ConfidenceBar';
import { DisclaimerBanner } from '../components/research/DisclaimerBanner';
import type { GlobalCategory } from '../types/global-markets';

const CATEGORY_ORDER: GlobalCategory[] = ['equity', 'commodity', 'forex', 'crypto'];
const CATEGORY_LABEL: Record<GlobalCategory, string> = {
  equity: 'Global Equities',
  commodity: 'Commodities',
  forex: 'Forex',
  crypto: 'Crypto',
};

export default function GlobalMarketsPage() {
  const { data, isLoading, isFetching, error } = useGlobalMarkets();

  const grouped = data
    ? CATEGORY_ORDER.reduce<Record<GlobalCategory, typeof data.quotes>>(
        (acc, cat) => {
          acc[cat] = data.quotes.filter((q) => q.category === cat);
          return acc;
        },
        { equity: [], commodity: [], forex: [], crypto: [] }
      )
    : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Global Markets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Major indices, commodities, forex, and crypto — with AI context for Indian markets
          </p>
        </div>
        {isFetching && !isLoading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>

      {isLoading && <PageSkeleton />}

      {error && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Global market data unavailable. Please try again.</p>
        </div>
      )}

      {data && grouped && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">

          {/* AI Note — grounded, shown first */}
          {data.aiNote && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Why this matters for India</h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">AI Note</span>
              </div>
              <ConfidenceBar confidence={data.aiNote.confidence} />
              {data.aiNote.dataAvailable ? (
                <p className="text-sm leading-relaxed text-foreground">{data.aiNote.note}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{data.aiNote.note}</p>
              )}
              <DisclaimerBanner text={data.aiNote.disclaimer} />
            </div>
          )}

          {/* Quote grids by category */}
          {CATEGORY_ORDER.map((cat) => {
            const quotes = grouped[cat];
            if (!quotes.length) return null;
            return (
              <section key={cat}>
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {CATEGORY_LABEL[cat]}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {quotes.map((q) => (
                    <GlobalQuoteTile key={q.symbol} quote={q} />
                  ))}
                </div>
              </section>
            );
          })}

          <p className="text-xs text-muted-foreground">
            Last updated:{' '}
            {new Date(data.quotes[0]?.lastUpdated ?? '').toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
            })}{' '}
            IST · Refreshes every 3 minutes
          </p>
        </motion.div>
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-28 rounded-xl bg-muted" />
      {[1, 2].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="h-24 rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
