import type { OptionChain } from '../../types/options';

interface Props {
  chain: OptionChain;
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

function fmt(n: number, d = 2) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtOI(n: number) {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(2)} L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} K`;
  return String(n);
}

export function GreeksPanel({ chain }: Props) {
  const atm = chain.strikes.find((s) => s.isATM) ?? chain.strikes[Math.floor(chain.strikes.length / 2)];

  const pcrColor =
    chain.pcrOI > 1.3 ? 'text-red-500' : chain.pcrOI < 0.8 ? 'text-emerald-500' : 'text-foreground';

  const ivPctColor =
    chain.ivPercentile >= 75 ? 'text-red-500' :
    chain.ivPercentile <= 25 ? 'text-emerald-500' :
    'text-foreground';

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Option Chain Summary</h3>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="PCR (OI)"
          value={fmt(chain.pcrOI)}
          sub={chain.pcrOI > 1.2 ? 'Bearish bias' : chain.pcrOI < 0.8 ? 'Bullish bias' : 'Neutral'}
        />
        <StatTile
          label="Max Pain"
          value={chain.maxPainStrike.toLocaleString('en-IN')}
          sub={`Spot: ${chain.underlyingPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
        />
        <StatTile
          label="IV Percentile"
          value={`${chain.ivPercentile}%`}
          sub={chain.ivPercentile >= 75 ? 'Elevated' : chain.ivPercentile <= 25 ? 'Compressed' : 'Moderate'}
        />
        <StatTile
          label="Days to Expiry"
          value={String(chain.daysToExpiry)}
          sub={chain.expiry}
        />
      </div>

      {/* OI summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-emerald-500 font-semibold uppercase tracking-wide">Total Call OI</span>
          </div>
          <div className="text-lg font-semibold tabular-nums">{fmtOI(chain.totalCallOI)}</div>
          <div className="text-xs text-muted-foreground">Vol: {fmtOI(chain.totalCallVolume)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-red-500 font-semibold uppercase tracking-wide">Total Put OI</span>
          </div>
          <div className="text-lg font-semibold tabular-nums">{fmtOI(chain.totalPutOI)}</div>
          <div className="text-xs text-muted-foreground">Vol: {fmtOI(chain.totalPutVolume)}</div>
        </div>
      </div>

      {/* ATM Greeks */}
      {atm && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            ATM Greeks ({atm.strikePrice.toLocaleString('en-IN')})
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <div className="text-xs text-emerald-500 mb-1">Call Δ</div>
              <div className="font-mono font-semibold">{fmt(atm.call.delta, 3)}</div>
              <div className="text-xs text-red-500 mt-1">Put Δ</div>
              <div className="font-mono font-semibold">{fmt(atm.put.delta, 3)}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Γ Gamma</div>
              <div className="font-mono font-semibold">{atm.call.gamma.toFixed(6)}</div>
              <div className="text-xs text-muted-foreground mt-2">per ₹1 move</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Θ Theta /day</div>
              <div className="font-mono font-semibold text-red-500">{fmt(atm.call.theta, 2)}</div>
              <div className="text-xs text-muted-foreground mt-1">call</div>
              <div className="font-mono font-semibold text-red-500">{fmt(atm.put.theta, 2)}</div>
              <div className="text-xs text-muted-foreground">put</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">ν Vega /1%IV</div>
              <div className="font-mono font-semibold">{fmt(atm.call.vega, 2)}</div>
              <div className="text-xs text-muted-foreground mt-1">call</div>
              <div className="font-mono font-semibold">{fmt(atm.put.vega, 2)}</div>
              <div className="text-xs text-muted-foreground">put</div>
            </div>
          </div>
        </div>
      )}

      {/* PCR & IV detail row */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span>
          PCR OI: <span className={`font-semibold ${pcrColor}`}>{fmt(chain.pcrOI)}</span>
        </span>
        <span>
          PCR Vol: <span className="font-semibold">{fmt(chain.pcrVolume)}</span>
        </span>
        <span>
          ATM Call IV: <span className="font-semibold">{atm ? fmt(atm.call.iv) : '—'}%</span>
        </span>
        <span>
          ATM Put IV: <span className="font-semibold">{atm ? fmt(atm.put.iv) : '—'}%</span>
        </span>
        <span>
          IV %ile: <span className={`font-semibold ${ivPctColor}`}>{chain.ivPercentile}</span>
        </span>
      </div>
    </div>
  );
}
