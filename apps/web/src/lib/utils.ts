import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1_00_00_000) {
    return `₹${(value / 1_00_00_000).toFixed(2)}Cr`;
  }
  if (compact && Math.abs(value) >= 1_00_000) {
    return `₹${(value / 1_00_000).toFixed(2)}L`;
  }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
}

export function formatPct(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function pnlClass(value: number): string {
  if (value > 0) return 'text-[hsl(142_76%_36%)]';
  if (value < 0) return 'text-destructive';
  return 'text-muted-foreground';
}
