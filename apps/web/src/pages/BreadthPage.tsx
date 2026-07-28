import { motion } from 'framer-motion';
import { useBreadth } from '../hooks/useBreadth';
import { AdvanceDeclineCard } from '../components/breadth/AdvanceDeclineCard';
import { SectorHeatmap } from '../components/breadth/SectorHeatmap';
import { GainersLosersTable } from '../components/breadth/GainersLosersTable';
import { FiiDiiChart } from '../components/breadth/FiiDiiChart';

export default function BreadthPage() {
  const { data, isLoading, isFetching, error } = useBreadth();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Market Breadth</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Advance / decline, top movers, sector heat, FII/DII flows
          </p>
        </div>
        {isFetching && !isLoading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>

      {isLoading && <PageSkeleton />}

      {error && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Market breadth data unavailable. Please try again.</p>
        </div>
      )}

      {data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

          {/* Row 1: Advance/Decline + summary stats */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <AdvanceDeclineCard data={data.advanceDecline} />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:col-span-2">
              <StatCard
                label="Advances"
                value={data.advanceDecline.advances.toLocaleString()}
                subtext={`${((data.advanceDecline.advances / data.advanceDecline.total) * 100).toFixed(1)}% of total`}
                color="text-[hsl(142_76%_36%)]"
              />
              <StatCard
                label="Declines"
                value={data.advanceDecline.declines.toLocaleString()}
                subtext={`${((data.advanceDecline.declines / data.advanceDecline.total) * 100).toFixed(1)}% of total`}
                color="text-destructive"
              />
              <StatCard
                label="A/D Ratio"
                value={data.advanceDecline.advanceDeclineRatio.toFixed(2)}
                subtext={data.advanceDecline.advanceDeclineRatio >= 1 ? 'Broadly positive breadth' : 'Broadly negative breadth'}
                color={data.advanceDecline.advanceDeclineRatio >= 1 ? 'text-[hsl(142_76%_36%)]' : 'text-destructive'}
              />
              <StatCard
                label="Unchanged"
                value={data.advanceDecline.unchanged.toLocaleString()}
                subtext="No net price move"
                color="text-muted-foreground"
              />
            </div>
          </div>

          {/* Sector heatmap */}
          <SectorHeatmap sectors={data.sectorPerformance} />

          {/* Gainers + Losers */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <GainersLosersTable title="Top Gainers" stocks={data.topGainers} variant="gainers" />
            <GainersLosersTable title="Top Losers"  stocks={data.topLosers}  variant="losers" />
          </div>

          {/* FII/DII */}
          <FiiDiiChart data={data.fiiDii} />

          <p className="text-xs text-muted-foreground">
            Data as of{' '}
            {new Date(data.dataAsOf).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST ·
            Refreshes every 5 minutes
          </p>
        </motion.div>
      )}
    </div>
  );
}

function StatCard({
  label, value, subtext, color,
}: {
  label: string; value: string; subtext: string; color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-44 rounded-xl bg-muted" />
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted" />)}
        </div>
      </div>
      <div className="h-48 rounded-xl bg-muted" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-72 rounded-xl bg-muted" />
        <div className="h-72 rounded-xl bg-muted" />
      </div>
      <div className="h-72 rounded-xl bg-muted" />
    </div>
  );
}
