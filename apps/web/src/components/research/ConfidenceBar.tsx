export function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    confidence >= 0.7
      ? 'bg-[hsl(142_76%_36%)]'
      : confidence >= 0.4
        ? 'bg-amber-500'
        : 'bg-destructive';

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground">Data confidence</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-foreground">{pct}%</span>
    </div>
  );
}
