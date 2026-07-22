import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LogoMark } from '../../components/brand/Logo';

/**
 * Shared reading layout for the public legal pages (Terms, Privacy).
 * Clean, centered prose column on the marketing background.
 */
export default function LegalShell({ title, updated, children }) {
  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-800">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-[#f6f8fa]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark size={30} />
            <span className="font-extrabold tracking-tight text-slate-900">Quarters</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-400 hover:text-brand-700">
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-slate-400">Last updated · {updated}</p>
        <div className="legal-prose mt-10 space-y-8 text-[15px] leading-relaxed text-slate-600">
          {children}
        </div>
        <div className="mt-14 border-t border-slate-200/70 pt-6 text-sm text-slate-400">
          Questions? <a href="mailto:hello@quarters.app" className="font-medium text-brand-600 hover:underline">hello@quarters.app</a>
          <span className="mx-2">·</span>
          <Link to="/terms" className="hover:text-brand-700">Terms</Link>
          <span className="mx-2">·</span>
          <Link to="/privacy" className="hover:text-brand-700">Privacy</Link>
        </div>
      </main>
    </div>
  );
}

/** Section heading + body helpers so the two pages read consistently. */
export function LegalSection({ n, title, children }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-slate-900">{n ? `${n}. ` : ''}{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
