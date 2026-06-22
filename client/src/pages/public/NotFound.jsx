import { Link } from 'react-router-dom';
import { House, ArrowLeft, Compass } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function NotFound() {
  const { user } = useAuth();
  const home = user ? `/${user.role}` : '/';

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#f1eeea] px-5 text-center">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-[380px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-brand-200/50 via-rose-100/40 to-transparent blur-3xl" />
      <div className="relative">
        <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-[0_10px_24px_-8px_rgba(234,94,60,0.6)]">
          <Compass className="h-7 w-7" />
        </span>
        <p className="text-7xl font-extrabold tracking-tight text-brand-600">404</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">This page checked out</h1>
        <p className="mx-auto mt-2 max-w-sm text-slate-500">
          The page you’re looking for doesn’t exist or may have moved. Let’s get you back home.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to={home} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white shadow-[0_10px_22px_-8px_rgba(234,94,60,0.6)] transition-all hover:-translate-y-0.5 hover:bg-brand-700">
            <House className="h-4 w-4" /> {user ? 'Back to dashboard' : 'Back home'}
          </Link>
          <button onClick={() => window.history.back()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" /> Go back
          </button>
        </div>
      </div>
    </div>
  );
}
