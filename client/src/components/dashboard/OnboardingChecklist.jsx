import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, X, Rocket } from 'lucide-react';
import { api } from '../../api/client';

/**
 * First-run setup guide for a new organization. Steps tick off automatically as
 * the admin does the real work (progress comes from live counts). Hides itself
 * once every step is done or the admin dismisses it — so established orgs never
 * see it.
 */
export default function OnboardingChecklist() {
  const [data, setData] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    api.get('/dashboard/onboarding').then(({ data: d }) => setData(d.data)).catch(() => {});
  }, []);

  if (!data || hidden || data.dismissed || data.percent === 100) return null;

  const dismiss = async () => {
    setHidden(true);
    try { await api.post('/dashboard/onboarding/dismiss'); } catch { /* best-effort */ }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-200/70 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm dark:border-brand-500/20 dark:from-brand-500/10 dark:to-surface sm:p-6">
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-white/60 hover:text-slate-600 dark:hover:bg-white/10">
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.7)]">
          <Rocket className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Finish setting up your PG</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{data.completed} of {data.total} done — you’re {data.percent}% there.</p>
        </div>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-brand-100 dark:bg-white/10">
        <div className="h-full rounded-full bg-brand-600 transition-all duration-700" style={{ width: `${data.percent}%` }} />
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {data.steps.map((s) => (
          <li key={s.key}>
            {s.done ? (
              <div className="flex items-center gap-3 rounded-xl bg-white/60 px-3 py-2.5 dark:bg-white/5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
                <span className="text-sm text-slate-400 line-through">{s.title}</span>
              </div>
            ) : (
              <Link to={s.to} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:border-white/10 dark:bg-surface2 dark:hover:border-white/20">
                <span className="h-6 w-6 shrink-0 rounded-full border-2 border-dashed border-slate-300 dark:border-white/20" />
                <span className="min-w-0 flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">{s.title}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">{s.cta} <ArrowRight className="h-3.5 w-3.5" /></span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
