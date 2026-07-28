import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface ImportResult {
  imported: number;
  skipped: number;
  errors: { rowIndex: number; error: string }[];
}

export function ImportHoldingsForm({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await api.post<{ data: ImportResult }>('/portfolio/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { error: string } } }).response?.data?.error
          : 'Import failed';
      setError(msg ?? 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadSample = () => {
    const csv = `Symbol,Quantity,Buy Price,Buy Date,Notes\nRELIANCE,10,2456.75,15/06/2024,Long term\nTCS,5,3890.00,10/01/2024,\nINFY,20,1567.50,10/03/2024,`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_holdings.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Import from CSV / Excel</h3>
        <button onClick={downloadSample} className="text-xs text-primary hover:underline">
          Download sample CSV
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <p className="text-sm text-foreground">{file.name}</p>
          ) : (
            <>
              <p className="text-sm font-medium text-muted-foreground">Click to select file</p>
              <p className="mt-1 text-xs text-muted-foreground">CSV, XLSX or XLS — max 5 MB</p>
            </>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        {result && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <p className="font-medium text-foreground">
              {result.imported} imported{result.skipped > 0 ? `, ${result.skipped} skipped` : ''}
            </p>
            {result.errors.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                {result.errors.map((e) => (
                  <p key={e.rowIndex} className="text-xs text-destructive">
                    Row {e.rowIndex}: {e.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!file || loading}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? 'Importing…' : 'Import'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            {result ? 'Done' : 'Cancel'}
          </button>
        </div>
      </form>
    </div>
  );
}
