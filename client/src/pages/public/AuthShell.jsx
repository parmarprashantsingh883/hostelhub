import { Link } from 'react-router-dom';
import { House, Check } from 'lucide-react';

const FEATURES = [
  'Rooms, beds & occupancy at a glance',
  'Online rent collection with receipts',
  'Complaints, visitors & notices in one place',
];

const STATS = [
  { value: '500+', label: 'beds managed' },
  { value: '40+', label: 'properties' },
  { value: '99.9%', label: 'uptime' },
];

/** Shared two-pane shell for all auth screens. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand pane — premium layered emerald gradient */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 text-white p-12">
        {/* soft glow accents */}
        <div className="pointer-events-none absolute -top-28 -left-24 w-[28rem] h-[28rem] rounded-full bg-sun-400/30 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-brand-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-36 -right-10 w-[26rem] h-[26rem] rounded-full bg-white/15 blur-3xl" />
        {/* subtle dot pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '28px 28px' }}
        />
        {/* gentle top sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/10 to-transparent" />

        <Link to="/" className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)]">
            <House className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">HostelHub</span>
        </Link>

        <div className="relative">
          <p className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-white/10 ring-1 ring-white/20 text-xs font-medium text-white/90">
            <span className="w-1.5 h-1.5 rounded-full bg-sun-400" />
            Smart PG &amp; Hostel Management
          </p>
          <h2 className="text-[2.6rem] font-bold leading-[1.12] tracking-tight">
            Run your property,
            <br />
            <span className="text-brand-100">not the paperwork.</span>
          </h2>
          <p className="mt-5 text-white/80 max-w-md leading-relaxed">
            The operating system for modern PGs and hostels — built for owners who would rather
            grow their business than chase rent.
          </p>
          <ul className="mt-9 space-y-4">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3.5 text-[0.95rem] text-white/90">
                <span className="w-7 h-7 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center shrink-0 shadow-sm">
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          {/* social-proof stat pills */}
          <div className="flex flex-wrap items-center gap-2.5 mb-7">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="inline-flex items-baseline gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur-sm"
              >
                <span className="text-sm font-semibold text-white tabular-nums">{s.value}</span>
                <span className="text-xs text-white/70">{s.label}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-white/55">© {new Date().getFullYear()} HostelHub</p>
        </div>
      </div>

      {/* Form pane */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-[0_4px_14px_-2px_rgba(79,70,229,0.6)]">
              <House className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">HostelHub</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-slate-500 text-center">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
