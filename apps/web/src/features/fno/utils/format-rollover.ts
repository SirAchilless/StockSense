export function formatRolloverPct(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

export function formatRolloverCostBps(bps: number): string {
  return `${bps.toFixed(1)} bps`;
}

export function rolloverDeltaLabel(rolloverPct: number, avgPct: number): string {
  const diff = rolloverPct - avgPct;
  if (diff > 3) return 'Above avg';
  if (diff < -3) return 'Below avg';
  return 'In line';
}

export function rolloverDeltaHighlight(
  rolloverPct: number,
  avgPct: number
): 'positive' | 'negative' | 'neutral' {
  const diff = rolloverPct - avgPct;
  if (diff > 3) return 'positive';
  if (diff < -3) return 'negative';
  return 'neutral';
}
