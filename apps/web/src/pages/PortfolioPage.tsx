import { useState } from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import { PortfolioSummary } from '../components/portfolio/PortfolioSummary';
import { HoldingsTable } from '../components/portfolio/HoldingsTable';
import { AddHoldingForm } from '../components/portfolio/AddHoldingForm';
import { ImportHoldingsForm } from '../components/portfolio/ImportHoldingsForm';

export default function PortfolioPage() {
  const { data, isLoading, isError, error } = usePortfolio();
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Track your holdings and P&amp;L in real time.</p>
        </div>
        {!showForm && !showImport && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Import CSV
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              + Add Holding
            </button>
          </div>
        )}
      </div>

      {/* Add holding form */}
      {showForm && (
        <AddHoldingForm onClose={() => setShowForm(false)} />
      )}

      {/* Import CSV form */}
      {showImport && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <ImportHoldingsForm onClose={() => setShowImport(false)} />
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {(error as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Failed to load portfolio. Please try again.'}
        </div>
      )}

      {/* Content */}
      {data && (
        <>
          <PortfolioSummary summary={data} />
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Holdings</h2>
            <HoldingsTable holdings={data.holdings} />
          </div>
        </>
      )}
    </div>
  );
}
