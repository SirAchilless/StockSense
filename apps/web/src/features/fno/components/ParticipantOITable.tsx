import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  useReactTable, getCoreRowModel, flexRender, createColumnHelper,
  getSortedRowModel, type SortingState,
} from '@tanstack/react-table';
import type { ParticipantOI } from '../types/fno.types';
import { formatOI } from '../utils/format-rollover';

interface Props {
  data?: ParticipantOI[];
  isLoading?: boolean;
  error?: Error | null;
}

const columnHelper = createColumnHelper<ParticipantOI>();

const INSTRUMENT_LABEL: Record<ParticipantOI['instrumentType'], string> = {
  INDEX_FUTURES: 'Index Futures',
  STOCK_FUTURES: 'Stock Futures',
  INDEX_OPTIONS: 'Index Options',
  STOCK_OPTIONS: 'Stock Options',
};

function Skeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-pulse space-y-3">
      <div className="h-4 w-48 bg-muted rounded" />
      <div className="space-y-2">
        {[0,1,2,3,4].map(i => <div key={i} className="h-8 bg-muted rounded" />)}
      </div>
    </div>
  );
}

export function ParticipantOITable({ data, isLoading, error }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'netOI', desc: true }]);

  const columns = useMemo(() => [
    columnHelper.accessor('category', {
      header: 'Participant',
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('instrumentType', {
      header: 'Instrument',
      cell: (info) => <span className="text-muted-foreground text-xs">{INSTRUMENT_LABEL[info.getValue()]}</span>,
    }),
    columnHelper.accessor('longOI', {
      header: 'Long OI',
      cell: (info) => <span className="font-mono tabular-nums text-gain">{formatOI(info.getValue())}</span>,
    }),
    columnHelper.accessor('shortOI', {
      header: 'Short OI',
      cell: (info) => <span className="font-mono tabular-nums text-loss">{formatOI(info.getValue())}</span>,
    }),
    columnHelper.accessor('netOI', {
      header: 'Net OI',
      cell: (info) => {
        const v = info.getValue();
        const cls = v > 0 ? 'bg-gain/muted text-gain' : v < 0 ? 'bg-loss/muted text-loss' : 'text-muted-foreground';
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono tabular-nums text-xs font-semibold ${cls}`}>
            {v > 0 ? '+' : ''}{formatOI(v)}
          </span>
        );
      },
      sortDescFirst: true,
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
        No participant OI data available for the selected date.
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
      <h3 className="text-sm font-semibold mb-3">Participant-wise Positioning — {data[0]?.date}</h3>
      <p className="text-[11px] text-muted-foreground mb-3">EOD participantwise OI (NSE). Click column headers to sort.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                {hg.headers.map(h => (
                  <th
                    key={h.id}
                    colSpan={h.colSpan}
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
