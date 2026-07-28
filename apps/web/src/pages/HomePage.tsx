import { motion } from 'framer-motion';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="text-center"
      >
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Stock<span className="text-primary">Sense</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          AI-Powered Indian Market Research &amp; Portfolio Intelligence
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.2 }}
        className="rounded-lg border border-border bg-card px-6 py-4 text-sm text-muted-foreground"
      >
        Phase 1 scaffolding complete — building step by step.
      </motion.div>
    </main>
  );
}
