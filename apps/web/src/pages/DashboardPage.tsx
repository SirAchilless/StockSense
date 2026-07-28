import { useMarketIndices } from '../hooks/useMarketData';
import { IndexTile, IndexTileSkeleton } from '../components/market/IndexTile';
import { MarketStatusBanner } from '../components/market/MarketStatusBanner';

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useMarketIndices();

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Market Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live indices for NSE &amp; BSE · Auto-refreshes every 30 seconds
        </p>
      </div>

      {/* Market status banner */}
      {data && <MarketStatusBanner status={data.status} />}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card py-16 text-center">
          <p className="text-base font-medium text-foreground">Market data unavailable</p>
          <p className="text-sm text-muted-foreground">
            Could not reach the market data service. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Retry
          </button>
        </div>
      )}

      {/* Index tiles grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => <IndexTileSkeleton key={i} />)}

        {data?.quotes.map((quote, i) => (
          <IndexTile key={quote.symbol} quote={quote} index={i} />
        ))}
      </div>
    </div>
  );
}
