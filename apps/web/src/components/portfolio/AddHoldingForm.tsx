import { useState, type FormEvent } from 'react';
import { useAddHolding } from '../../hooks/usePortfolio';
import { cn } from '../../lib/utils';

interface Props {
  onClose: () => void;
}

export function AddHoldingForm({ onClose }: Props) {
  const { mutate, isPending, error } = useAddHolding();

  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyDate, setBuyDate] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldError, setFieldError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFieldError('');

    const qty = parseFloat(quantity);
    const price = parseFloat(buyPrice);

    if (!symbol.trim()) { setFieldError('Symbol is required'); return; }
    if (!qty || qty <= 0) { setFieldError('Quantity must be a positive number'); return; }
    if (!price || price <= 0) { setFieldError('Buy price must be a positive number'); return; }
    if (!buyDate) { setFieldError('Buy date is required'); return; }

    mutate(
      {
        symbol: symbol.trim().toUpperCase(),
        quantity: qty,
        buyPrice: price,
        buyDate,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const apiError = error
    ? ((error as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Failed to add holding')
    : null;
  const displayError = fieldError || apiError;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Add Holding</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close form"
        >
          &#x2715;
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Symbol */}
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="symbol">
            Symbol <span className="text-destructive">*</span>
          </label>
          <input
            id="symbol"
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="e.g. RELIANCE"
            maxLength={20}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm uppercase placeholder:normal-case placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Quantity & Buy Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="quantity">
              Quantity <span className="text-destructive">*</span>
            </label>
            <input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 10"
              min="0.001"
              step="any"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm placeholder:font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="buyPrice">
              Buy Price (₹) <span className="text-destructive">*</span>
            </label>
            <input
              id="buyPrice"
              type="number"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="e.g. 2500.00"
              min="0.01"
              step="any"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm placeholder:font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Buy Date */}
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="buyDate">
            Buy Date <span className="text-destructive">*</span>
          </label>
          <input
            id="buyDate"
            type="date"
            value={buyDate}
            onChange={(e) => setBuyDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="notes">
            Notes <span className="text-muted-foreground text-xs">(optional)</span>
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Long-term hold"
            maxLength={500}
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Error */}
        {displayError && (
          <p className="text-sm text-destructive">{displayError}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className={cn(
              'rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50',
              isPending && 'cursor-wait'
            )}
          >
            {isPending ? 'Adding...' : 'Add Holding'}
          </button>
        </div>
      </form>
    </div>
  );
}
