import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui';

/** Gate: must be logged in; optionally must match one of `roles`. */
export function Protected({ roles }) {
  const { user, booting } = useAuth();
  if (booting) return <div className="min-h-screen flex items-center justify-center"><Spinner label="Checking session…" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  return <Outlet />;
}

/** Redirect logged-in users away from public auth pages. */
export function GuestOnly() {
  const { user, booting } = useAuth();
  if (booting) return <div className="min-h-screen flex items-center justify-center"><Spinner label="Loading…" /></div>;
  if (user) return <Navigate to={`/${user.role}`} replace />;
  return <Outlet />;
}
