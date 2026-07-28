import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';

const HomePage = lazy(() => import('./pages/HomePage'));

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
