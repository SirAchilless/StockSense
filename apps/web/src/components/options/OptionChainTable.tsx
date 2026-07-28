import type { OptionStrikeRow, OptionLeg } from '../../types/options';

interface Props {
  strikes: OptionStrikeRow[];
  underlyingPrice: number;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtOI(n: number) {
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function ChangeCell({ value }: { value: number }) {
  const cls = value > 0 ? 'text-emerald-500' : value < 0 ? 'text-red-500' : 'text-muted-foreground';
  return <span className={cls}>{value > 0 ? '+' : ''}{fmt(value)}</span>;
}

function OIChangeCell({ value }: { value: number }) {
  const cls = value > 0 ? 'text-emerald-500' : value < 0 ? 'text-red-500' : 'text-muted-foreground';
  return <span className={cls}>{value > 0 ? '▲' : value < 0 ? '▼' : '–'} {fmtOI(Math.abs(value))}</span>;
}

function CallCells({ leg }: { leg: OptionLeg }) {
  return (
    <>
      <td className="px-2 py-1.5 text-right tabular-nums">{fmtOI(leg.oi)}</td>
      <td className="px-2 py-1.5 text-right tabular-nums"><OIChangeCell value={leg.oiChange} /></td>
      <td className="px-2 py-1.5 text-right tabular-nums">{fmt(leg.iv)}%</td>
      <td className="px-2 py-1.5 text-right tabular-nums font-medium">{fmt(leg.ltp)}</td>
      <td className="px-2 py-1.5 text-right tabular-nums text-xs"><ChangeCell value={leg.change} /></td>
      <td className="px-2 py-1.5 text-right tabular-nums text-xs text-muted-foreground">{fmt(leg.delta, 3)}</td>
    </>
  );
}

function PutCells({ leg }: { leg: OptionLeg }) {
  return (
    <>
      <td className="px-2 py-1.5 text-left tabular-nums text-xs text-muted-foreground">{fmt(leg.delta, 3)}</td>
      <td className="px-2 py-1.5 text-left tabular-nums text-xs"><ChangeCell value={leg.change} /></td>
      <td className="px-2 py-1.5 text-left tabular-nums font-medium">{fmt(leg.ltp)}</td>
      <td className="px-2 py-1.5 text-left tabular-nums">{fmt(leg.iv)}%</td>
      <td className="px-2 py-1.5 text-left tabular-nums"><OIChangeCell value={leg.oiChange} /></td>
      <td className="px-2 py-1.5 text-left tabular-nums">{fmtOI(leg.oi)}</td>
    </>
  );
}

export function OptionChainTable({ strikes, underlyingPrice }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {/* CALL headers */}
            <th colSpan={6} className="px-3 py-2 text-center text-xs font-semibold text-emerald-500 uppercase tracking-wide border-r border-border">
              CALLS
            </th>
            {/* Strike */}
            <th className="px-4 py-2 text-center text-xs font-semibold text-foreground uppercase tracking-wide w-24">
              Strike
            </th>
            {/* PUT headers */}
            <th colSpan={6} className="px-3 py-2 text-center text-xs font-semibold text-red-500 uppercase tracking-wide border-l border-border">
              PUTS
            </th>
          </tr>
          <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground">
            <th className="px-2 py-1.5 text-right">OI</th>
            <th className="px-2 py-1.5 text-right">OI Chg</th>
            <th className="px-2 py-1.5 text-right">IV</th>
            <th className="px-2 py-1.5 text-right">LTP</th>
            <th className="px-2 py-1.5 text-right">Chg</th>
            <th className="px-2 py-1.5 text-right border-r border-border">Δ</th>
            <th className="px-4 py-1.5 text-center font-medium" />
            <th className="px-2 py-1.5 text-left border-l border-border">Δ</th>
            <th className="px-2 py-1.5 text-left">Chg</th>
            <th className="px-2 py-1.5 text-left">LTP</th>
            <th className="px-2 py-1.5 text-left">IV</th>
            <th className="px-2 py-1.5 text-left">OI Chg</th>
            <th className="px-2 py-1.5 text-left">OI</th>
          </tr>
        </thead>
        <tbody>
          {strikes.map((row) => {
            const isAtm = row.isATM;
            const isItmCall = row.strikePrice < underlyingPrice;
            const isItmPut = row.strikePrice > underlyingPrice;

            return (
              <tr
                key={row.strikePrice}
                className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${isAtm ? 'bg-primary/5 font-semibold' : ''}`}
              >
                {/* Call side — ITM calls have slight highlight */}
                <td className={`px-2 py-1.5 text-right tabular-nums ${isItmCall ? 'bg-emerald-500/5' : ''}`}>
                  {fmtOI(row.call.oi)}
                </td>
                <td className={`px-2 py-1.5 text-right tabular-nums ${isItmCall ? 'bg-emerald-500/5' : ''}`}>
                  <OIChangeCell value={row.call.oiChange} />
                </td>
                <td className={`px-2 py-1.5 text-right tabular-nums ${isItmCall ? 'bg-emerald-500/5' : ''}`}>
                  {fmt(row.call.iv)}%
                </td>
                <td className={`px-2 py-1.5 text-right tabular-nums font-medium ${isItmCall ? 'bg-emerald-500/5' : ''}`}>
                  {fmt(row.call.ltp)}
                </td>
                <td className={`px-2 py-1.5 text-right tabular-nums text-xs ${isItmCall ? 'bg-emerald-500/5' : ''}`}>
                  <ChangeCell value={row.call.change} />
                </td>
                <td className={`px-2 py-1.5 text-right tabular-nums text-xs text-muted-foreground border-r border-border ${isItmCall ? 'bg-emerald-500/5' : ''}`}>
                  {fmt(row.call.delta, 3)}
                </td>

                {/* Strike price */}
                <td className={`px-4 py-1.5 text-center font-mono text-sm font-bold ${isAtm ? 'text-primary' : 'text-foreground'}`}>
                  {row.strikePrice.toLocaleString('en-IN')}
                  {isAtm && <span className="ml-1 text-xs text-primary font-normal">ATM</span>}
                </td>

                {/* Put side — ITM puts have slight highlight */}
                <td className={`px-2 py-1.5 text-left tabular-nums text-xs text-muted-foreground border-l border-border ${isItmPut ? 'bg-red-500/5' : ''}`}>
                  {fmt(row.put.delta, 3)}
                </td>
                <td className={`px-2 py-1.5 text-left tabular-nums text-xs ${isItmPut ? 'bg-red-500/5' : ''}`}>
                  <ChangeCell value={row.put.change} />
                </td>
                <td className={`px-2 py-1.5 text-left tabular-nums font-medium ${isItmPut ? 'bg-red-500/5' : ''}`}>
                  {fmt(row.put.ltp)}
                </td>
                <td className={`px-2 py-1.5 text-left tabular-nums ${isItmPut ? 'bg-red-500/5' : ''}`}>
                  {fmt(row.put.iv)}%
                </td>
                <td className={`px-2 py-1.5 text-left tabular-nums ${isItmPut ? 'bg-red-500/5' : ''}`}>
                  <OIChangeCell value={row.put.oiChange} />
                </td>
                <td className={`px-2 py-1.5 text-left tabular-nums ${isItmPut ? 'bg-red-500/5' : ''}`}>
                  {fmtOI(row.put.oi)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
