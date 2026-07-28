import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../../lib/api';
import { clearCredentials } from '../../store/authSlice';
import type { RootState } from '../../store';

export function AppLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Clear session regardless of API error
    }
    dispatch(clearCredentials());
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          {/* Logo */}
          <span className="text-lg font-semibold tracking-tight">
            Stock<span className="text-primary">Sense</span>
          </span>

          {/* Nav links */}
          <nav className="hidden items-center gap-1 sm:flex">
            {[
              { to: '/dashboard', label: 'Dashboard' },
              { to: '/portfolio', label: 'Portfolio' },
              { to: '/research', label: 'Research' },
              { to: '/technical', label: 'Technical' },
              { to: '/global', label: 'Global' },
              { to: '/breadth', label: 'Breadth' },
              { to: '/chat', label: 'AI Chat' },
            ].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right side: user + logout */}
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-muted-foreground sm:block">
                {user.name ?? user.email}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
