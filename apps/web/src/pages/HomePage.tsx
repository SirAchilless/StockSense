import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { clearCredentials } from '../store/authSlice';

export default function HomePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors — clear session regardless
    }
    dispatch(clearCredentials());
    navigate('/login', { replace: true });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <button
        onClick={handleLogout}
        className="absolute right-4 top-4 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        Sign out
      </button>

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
