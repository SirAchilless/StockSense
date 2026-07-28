import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import type { OITrendFrontend, OITrendClassification } from '../types/fno.types';

interface Props {
  data?: OITrendFrontend[];
  isLoading?: boolean;
  error?: Error | null;
}

const CLASSIFICATION_STYLES: Record<
  OITrendClassification,
  { bg: string; text: string; label: string }
> = {
  LONG_BUILDUP: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    label: 'Long Buildup',
  },
  SHORT_BUILDUP: {
    bg: 'bg-red-500/15',
    text: 'text-red-600 dark:text-red-400',
    label: 'Short Buildup',
  },
  SHORT_UNWINDING: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-600 dark:text-blue-400',
    label: 'Short Unwinding',
  },
  LONG_UNWINDING: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    label: 'Long Unwinding',
  },
};

function fmtOI(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : n > 0 ? '+' : '';
  if (abs >= 1_00_000) return `${sign}${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${abs}`;
}

function ClassificationBadge({ value }: { value: OITrendClassification }) {
  const s = CLASSIFICATION_STYLES[value];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-3 py-2">
          <div className="h-4 bg-muted rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

const col = createColumnHelper<OITrendFrontend>();

const columns = [
  col.accessor('expiry', { header: 'Expiry' }),
  col.accessor('currentOI', {
    header: 'Current OI',
    cell: (c) => <span className="tabular-nums">{fmtOI(c.getValue())}</span>,
  }),
  col.accessor('oiChange', {
    header: 'OI Chg',
    cell: (c) => {
      const v = c.getValue();
      const color = v > 0 ? 'text-emerald-500' : v < 0 ? 'text-red-500' : 'text-muted-foreground';
      return <span className={`tabular-nums ${color}`}>{fmtOI(v)}</span>;
    },
  }),
  col.accessor('priceChange', {
    header: 'Price Chg',
    cell: (c) => {
      const v = c.getValue();
      const color = v > 0 ? 'text-emerald-500' : v < 0 ? 'text-red-500' : 'text-muted-foreground';
      return (
        <span className={`tabular-nums ${color}`}>
          {v > 0 ? '+' : ''}
          {v.toFixed(2)}
        </span>
      );
    },
  }),
  col.accessor('classification', {
    header: 'Signal',
    cell: (c) => <ClassificationBadge value={c.getValue()} />,
    enableSorting: false,
  }),
];

export function OITrendTable({ data, isLoading, error }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        OI trend data unavailable. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Open Interest Trends</h3>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border bg-muted/30">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-3 py-2 text-left text-xs text-muted-foreground uppercase tracking-wide cursor-pointer select-none"
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {h.column.getIsSorted() === 'asc'
                      ? ' ↑'
                      : h.column.getIsSorted() === 'desc'
                        ? ' ↓'
                        : ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
            ) : table.getRowCount() === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-sm text-muted-foreground"
                >
                  No OI trend data available for this symbol.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-border/50 hover:bg-muted/20">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">EOD data · sorted by expiry</p>
    </div>
  );
}
