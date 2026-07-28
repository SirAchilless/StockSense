export function DisclaimerBanner({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-400">
      ⚠ {text}
    </div>
  );
}
