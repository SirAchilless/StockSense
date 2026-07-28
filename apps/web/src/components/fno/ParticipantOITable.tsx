import type { ParticipantOIData, ParticipantCategory } from '../../types/fno';

interface Props {
  data: ParticipantOIData;
}

function fmtOI(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_00_000) return `${n < 0 ? '-' : ''}${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `${n < 0 ? '-' : ''}${(abs / 1_000).toFixed(0)}K`;
  return String(n);
}

const CATEGORY_COLOR: Record<ParticipantCategory, string> = {
  FII: 'text-emerald-500',
  DII: 'text-blue-500',
  PRO: 'text-amber-500',
  CLIENT: 'text-slate-400',
};

function NetCell({ value }: { value: number }) {
  const color = value > 0 ? 'text-emerald-500' : value < 0 ? 'text-red-500' : 'text-muted-foreground';
  return <span className={`font-semibold tabular-nums ${color}`}>{fmtOI(value)}</span>;
}

export function ParticipantOITable({ data }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Participant-wise Open Interest</h3>
        <span className="text-xs text-muted-foreground">As of {data.date}</span>
      </div>

      {/* Index Futures */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Index Futures</h4>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left">Participant</th>
                <th className="px-3 py-2 text-right">Long OI</th>
                <th className="px-3 py-2 text-right">Short OI</th>
                <th className="px-3 py-2 text-right">Net Long</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.category} className="border-b border-border/50 hover:bg-muted/20">
                  <td className={`px-3 py-2 font-semibold ${CATEGORY_COLOR[row.category]}`}>
                    {row.category}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtOI(row.indexFutLong)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtOI(row.indexFutShort)}</td>
                  <td className="px-3 py-2 text-right"><NetCell value={row.indexFutNetLong} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Futures */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Stock Futures</h4>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left">Participant</th>
                <th className="px-3 py-2 text-right">Long OI</th>
                <th className="px-3 py-2 text-right">Short OI</th>
                <th className="px-3 py-2 text-right">Net Long</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.category} className="border-b border-border/50 hover:bg-muted/20">
                  <td className={`px-3 py-2 font-semibold ${CATEGORY_COLOR[row.category]}`}>
                    {row.category}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtOI(row.stockFutLong)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtOI(row.stockFutShort)}</td>
                  <td className="px-3 py-2 text-right"><NetCell value={row.stockFutNetLong} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Options OI */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Options OI (Index)</h4>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left">Participant</th>
                <th className="px-3 py-2 text-right">Call OI</th>
                <th className="px-3 py-2 text-right">Put OI</th>
                <th className="px-3 py-2 text-right">PCR</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => {
                const pcr = row.indexCallOI > 0 ? row.indexPutOI / row.indexCallOI : 0;
                return (
                  <tr key={row.category} className="border-b border-border/50 hover:bg-muted/20">
                    <td className={`px-3 py-2 font-semibold ${CATEGORY_COLOR[row.category]}`}>
                      {row.category}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-500">{fmtOI(row.indexCallOI)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-500">{fmtOI(row.indexPutOI)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-medium ${pcr > 1.2 ? 'text-red-500' : pcr < 0.8 ? 'text-emerald-500' : ''}`}>
                      {pcr.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
