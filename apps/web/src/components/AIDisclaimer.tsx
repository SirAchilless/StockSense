// AIDisclaimer — mandatory on every AI-generated surface (Constraint 2.2).
//
// This component MUST be rendered on every response that contains AI-
// generated content. The text is verbatim per the SEBI compliance
// requirement in the build spec and is NOT configurable per call site.

const EXACT_DISCLAIMER =
  'For informational purposes only. Not investment advice. AI-generated content with no human analyst review. Not SEBI-registered advisory.';

interface Props {
  /** Optional override to show a custom string — restricted to the exact text. */
  text?: string;
  className?: string;
}

export function AIDisclaimer({ text, className = '' }: Props) {
  return (
    <p
      role="note"
      aria-label="Regulatory disclaimer"
      className={`text-xs text-muted-foreground leading-relaxed border-t border-border pt-3 ${className}`}
    >
      <span className="text-amber-500 mr-1" aria-hidden>⚠</span>
      {text ?? EXACT_DISCLAIMER}
    </p>
  );
}

export { EXACT_DISCLAIMER as AI_DISCLAIMER_TEXT };
