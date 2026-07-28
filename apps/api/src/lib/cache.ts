// Tiny in-memory TTL cache. Used as a Redis fallback (per C.3).
// Suitable for single-instance dev / low traffic. Swap for Redis in production
// by implementing the same `Cache` interface.

export interface Cache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs?: number): void;
  invalidate(prefix: string): void;
}

interface Entry<T> {
  value: T;
  expiresAt: number; // epoch ms
}

export class MemoryCache implements Cache {
  private store = new Map<string, Entry<unknown>>();

  get<T>(key: string): T | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (e.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return e.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? 5 * 60 * 1000;
    this.store.set(key, { value, expiresAt: Date.now() + ttl });
  }

  invalidate(prefix: string): void {
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) this.store.delete(k);
    }
  }

  /** Prune expired entries — call periodically if desired. */
  prune(): void {
    const now = Date.now();
    for (const [k, v] of this.store) {
      if (v.expiresAt <= now) this.store.delete(k);
    }
  }
}

// Singleton cache instance reused by all providers.
export const cache: Cache = new MemoryCache();

// Market-hours helpers (IST)
const IST_OFFSET_MS = 5 * 60 * 60 * 1000 + 30 * 60 * 1000;

export function nowIST(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

/**
 * Returns the epoch-ms of the next market open (09:15 IST), accounting for
 * weekends in a minimal way. Used to TTL EOD-cached data until the next open.
 */
export function nextMarketOpenMs(from: Date = nowIST()): number {
  const d = new Date(from);
  d.setUTCHours(3, 45, 0, 0); // 09:15 IST = 03:45 UTC
  if (d.getTime() <= from.getTime()) d.setUTCDate(d.getUTCDate() + 1);
  // Skip weekends (IST day-of-week: 0=Sun, 6=Sat)
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.getTime() - IST_OFFSET_MS; // convert back to epoch UTC
}

/** True when the current IST time is within NSE market hours (09:15–15:30 Mon–Fri). */
export function isMarketOpen(now: Date = nowIST()): boolean {
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}
