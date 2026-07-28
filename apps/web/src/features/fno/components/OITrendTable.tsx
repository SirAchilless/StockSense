import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  useReactTable, getCoreRowModel, flexRender, createColumnHelper,
  getSortedRowModel, type SortingState,
} from '@tanstack/react-table';
import type { OITrend } from '../types/fno.types';
import { formatOI } from '../utils/format-rollover';

interface Props {
  data?: OITrend[];
  isLoading?: boolean;
  error?: Error | null;
}

const columnHelper = createColumnHelper<OITrend>();

const CLASS_STYLES: Record<OITrend['classification'], { bg: string; fg: string; label: string }> = {
  LONG_BUILDUP:    { bg: 'bg-gain/muted',  fg: 'text-gain',  label: 'Long Buildup' },
  SHORT_BUILDUP:   { bg: 'bg-loss/muted',  fg: 'text-loss',  label: 'Short Buildup' },
  LONG_UNWINDING:  { bg: 'bg-loss/muted',  fg: 'text-loss',  label: 'Long Unwinding' },
  SHORT_UNWINDING: { bg: 'bg-gain/muted',  fg: 'text-gain',  label: 'Short Covering' },
};

function Skeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-pulse space-y-2">
      <div className="h-4 w-40 bg-muted rounded mb-3" />
      {[0,1,2,3].map(i => <div key={i} className="h-9 bg-muted rounded" />)}
    </div>
  );
}

export function OITrendTable({ data, isLoading, error }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'oiChange', desc: true }]);

  const columns = useMemo(() => [
    columnHelper.accessor('expiry', {
      header: 'Expiry',
      cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
    }),
    columnHelper.accessor('currentOI', {
      header: 'Current OI',
      cell: (info) => <span className="font-mono tabular-nums">{formatOI(info.getValue())}</span>,
    }),
    columnHelper.accessor('oiChange', {
      header: 'OI Change',
      cell: (info) => {
        const v = info.getValue();
        return <span className={`font-mono tabular-nums ${v > 0 ? 'text-gain' : 'text-loss'}`}>{v > 0 ? '+' : ''}{formatOI(v)}</span>;
      },
    }),
    columnHelper.accessor('priceChange', {
      header: 'Price Chg %',
      cell: (info) => {
        const v = info.getValue();
        return <span className={`font-mono tabular-nums ${v > 0 ? 'text-gain' : 'text-loss'}`}>{v > 0 ? '+' : ''}{v.toFixed(2)}%</span>;
      },
    }),
    columnHelper.accessor('classification', {
      header: 'Signal',
      cell: (info) => {
        const c = info.getValue();
        const st = CLASS_STYLES[c];
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.bg} ${st.fg}`}>
            {st.label}
          </span>
        );
      },
    }),
  ], []);

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) return <Skeleton />;
  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
        Data unavailable: {error.message}
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        No OI trend data available for the selected symbol.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <h3 className="text-sm font-semibold mb-1">OI Trends — {data[0]?.symbol}</h3>
      <p className="text-[11px] text-muted-foreground mb-3">
        OI change + price change → bullish / bearish positioning.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                {hg.headers.map(h => (
                  <th
                    key={h.id}
                    onClick={h.column.getToggleSortingHandler()}
                    className="px-3 py-2 text-left cursor-pointer select-none"
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {{ asc: ' ↑', desc: ' ↓' }[h.column.getIsSorted() as string] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
