// Mandatory SEBI disclaimer — rendered on every AI output surface.
// This exact text is required by constraint 2.2 — do NOT modify it.
const SEBI_TEXT =
  'For informational purposes only. Not investment advice. AI-generated content with no human analyst review. Not SEBI-registered advisory.';

interface Props {
  className?: string;
}

export function AIDisclaimer({ className }: Props) {
  return (
    <p className={`text-xs text-muted-foreground leading-relaxed ${className ?? ''}`}>
      ⚠ {SEBI_TEXT}
    </p>
  );
}
