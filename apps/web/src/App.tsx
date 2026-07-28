import { Navigate, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { useOAuthCallback } from './hooks/useOAuthCallback';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const ResearchPage = lazy(() => import('./pages/ResearchPage'));
const TechnicalPage = lazy(() => import('./pages/TechnicalPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));

const Spinner = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

// Layout route that gates on auth before rendering AppLayout's Outlet
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  );
}

function App() {
  // Handle ?token= injected by Google OAuth callback redirect
  useOAuthCallback();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes wrapped in AppLayout */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/research" element={<ResearchPage />} />
            <Route path="/technical" element={<TechnicalPage />} />
          </Route>

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
