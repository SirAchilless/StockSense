// Display helpers for rollover and F&O numbers. Pure functions, no IO.

export function formatPct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

export function formatBps(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)} bp`;
}

export function formatOI(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 10_000_000) return `${(n / 10_000_000).toFixed(2)}Cr`;
  if (abs >= 100_000) return `${(n / 100_000).toFixed(2)}L`;
  if (abs >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n));
}

export function formatINR(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function pcrZone(pcr: number): 'bearish' | 'neutral' | 'bullish' {
  if (pcr < 0.7) return 'bearish';
  if (pcr > 1.0) return 'bullish';
  return 'neutral';
}
