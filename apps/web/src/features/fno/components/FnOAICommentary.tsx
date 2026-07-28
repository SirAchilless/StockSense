import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { AIDisclaimer } from '../../../components/AIDisclaimer';
import { useFnOAICommentary } from '../hooks/useFnOAI';
import type { FnOMetric } from '../types/fno.types';

interface Props {
  symbol: string;
}

const METRIC_OPTIONS: { key: FnOMetric; label: string }[] = [
  { key: 'rollover', label: 'Rollover' },
  { key: 'participant_oi', label: 'Participant OI' },
  { key: 'cost_of_carry', label: 'Cost of Carry' },
  { key: 'oi_trends', label: 'OI Trends' },
  { key: 'pcr', label: 'PCR' },
  { key: 'market_wide_pcr', label: 'Market-wide PCR' },
];

function Skeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-3 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Generating AI commentary from grounded F&O data…
    </div>
  );
}

export function FnOAICommentary({ symbol }: Props) {
  const [selected, setSelected] = useState<FnOMetric[]>(['rollover', 'participant_oi', 'pcr']);
  const [expanded, setExpanded] = useState(false);
  const mutation = useFnOAICommentary();

  const toggle = (m: FnOMetric) => {
    setSelected((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  };

  const run = () => {
    setExpanded(true);
    mutation.mutate({ symbol, metrics: selected });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-border bg-card p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI F&O Commentary — {symbol}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Commentary generated solely from data fetched this request (RAG pipeline). No estimates.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {METRIC_OPTIONS.map((m) => {
          const active = selected.includes(m.key);
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => toggle(m.key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={run}
        disabled={selected.length === 0 || mutation.isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 transition-colors"
      >
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Generate Commentary
      </button>

      {expanded && mutation.isPending && <Skeleton />}

      {expanded && mutation.isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Data unavailable: {mutation.error.message}
        </div>
      )}

      {expanded && mutation.isSuccess && mutation.data && (
        <div className="space-y-3">
          {!mutation.data.dataAvailable ? (
            <div className="text-sm text-muted-foreground">
              Data unavailable: required F&O fields were not returned by the data provider.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">Confidence</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.round(mutation.data.confidence * 100)}%` }}
                  />
                </div>
                <span className="font-mono tabular-nums text-xs">
                  {Math.round(mutation.data.confidence * 100)}%
                </span>
              </div>
              <div className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                {mutation.data.commentary}
              </div>
            </>
          )}
          <AIDisclaimer />
        </div>
      )}

      {!expanded && <AIDisclaimer />}
    </motion.div>
  );
}
