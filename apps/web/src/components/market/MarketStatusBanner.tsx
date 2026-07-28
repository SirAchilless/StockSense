import { useEffect, useState } from 'react';
import type { MarketStatusInfo } from '../../types/market';

interface MarketStatusBannerProps {
  status: MarketStatusInfo;
}

function formatCountdown(nextOpenAt: string): string {
  const diff = Math.max(0, new Date(nextOpenAt).getTime() - Date.now());
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

export function MarketStatusBanner({ status }: MarketStatusBannerProps) {
  const [countdown, setCountdown] = useState<string>(() =>
    status.nextOpenAt ? formatCountdown(status.nextOpenAt) : '00:00:00',
  );

  useEffect(() => {
    if (status.status === 'open' || !status.nextOpenAt) return;

    const interval = setInterval(() => {
      setCountdown(formatCountdown(status.nextOpenAt!));
    }, 1_000);

    return () => clearInterval(interval);
  }, [status.status, status.nextOpenAt]);

  const isOpen = status.status === 'open';

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm ${
        isOpen
          ? 'border-gain-muted bg-gain-muted text-gain'
          : 'border-border bg-muted/40 text-muted-foreground'
      }`}
    >
      {/* Status dot */}
      <span
        className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${
          isOpen ? 'bg-gain animate-pulse' : 'bg-muted-foreground/50'
        }`}
      />

      {isOpen ? (
        <span className="font-medium text-gain">Market Open</span>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="font-medium">Market Closed</span>
          {status.nextOpenAt && (
            <span>
              Opens in{' '}
              <span className="font-mono tabular-nums font-semibold text-foreground">
                {countdown}
              </span>
            </span>
          )}
          {status.previousClose && (
            <span className="text-xs text-muted-foreground/70">
              Previous close: {formatTime(status.previousClose)} IST
            </span>
          )}
        </div>
      )}
    </div>
  );
}
