import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DoorOpen, Banknote, Wrench, Megaphone, ClipboardList, UtensilsCrossed,
  ShieldCheck, BarChart3, ArrowRight, Check, Star, Menu, X, House,
  Users, UserCog, Building2, Sparkles, Plus, Minus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const EASE = [0.16, 1, 0.3, 1];
const fadeUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.55, ease: EASE },
};

const FEATURES = [
  { icon: DoorOpen, title: 'Rooms & beds', desc: 'Track every room, bed and occupancy live — single, double, triple or dorm — with one-click assignment.' },
  { icon: Banknote, title: 'Rent & online payments', desc: 'Auto-generate monthly rent, collect online via Razorpay, and issue GST-ready PDF receipts instantly.' },
  { icon: Wrench, title: 'Complaint tracking', desc: 'Residents raise issues, staff resolve them, and everyone follows the status in real time.' },
  { icon: Megaphone, title: 'Notice board', desc: 'Pin important notices and blast urgent alerts to every resident — on screen and by email.' },
  { icon: ClipboardList, title: 'Visitor management', desc: 'Pre-registered guests, gate check-in/out, and a complete, searchable audit log.' },
  { icon: UtensilsCrossed, title: 'Food menu & feedback', desc: 'Publish the weekly mess menu and learn exactly what your residents love.' },
  { icon: BarChart3, title: 'Reports & analytics', desc: 'Revenue, occupancy, pending rent and complaint trends — visual and exportable to CSV.' },
  { icon: ShieldCheck, title: 'Role-based access', desc: 'Separate owner, resident and staff portals with strict, secure permission boundaries.' },
];

const ROLES = [
  {
    icon: Building2, label: 'Owners & admins', tone: 'from-brand-500 to-brand-700',
    points: ['Live occupancy & revenue dashboard', 'One-click monthly rent generation', 'Staff, complaints & visitor oversight', 'Exportable financial reports'],
  },
  {
    icon: Users, label: 'Residents', tone: 'from-blue-500 to-blue-600',
    points: ['Pay rent online & download receipts', 'Raise & track complaints', 'Pre-register visitors', 'View notices, room & food menu'],
  },
  {
    icon: UserCog, label: 'Staff', tone: 'from-amber-400 to-amber-500',
    points: ['A clear queue of assigned tasks', 'Update complaint status on the go', 'Check visitors in and out', 'Stay aligned via notices'],
  },
];

const STEPS = [
  { n: '01', title: 'Add your rooms', desc: 'Set up floors, rooms, beds and rent in minutes — or import your existing list.' },
  { n: '02', title: 'Invite residents & staff', desc: 'Each person gets their own secure portal. No training required.' },
  { n: '03', title: 'Run on autopilot', desc: 'Rent, complaints, visitors and reports flow through one clean system.' },
];

const STATS = [
  { value: '500+', label: 'Beds managed' },
  { value: '₹40L+', label: 'Rent processed' },
  { value: '12 hrs', label: 'Saved every week' },
  { value: '99.9%', label: 'Uptime' },
];

const TESTIMONIALS = [
  { quote: 'We replaced three registers and a WhatsApp group with HostelHub. Rent collection that used to take a week now closes in a day.', name: 'Rahul Mehta', org: 'Sunrise PG, Pune', initials: 'RM' },
  { quote: 'The resident app alone is worth it — complaints and visitors are no longer my problem to chase. Everything is tracked.', name: 'Anjali Verma', org: 'Nest Co-living, Bengaluru', initials: 'AV' },
  { quote: 'Occupancy and pending-rent reports give me numbers I never had before. It feels like a real business now.', name: 'Suresh Iyer', org: 'Comfort Stay, Chennai', initials: 'SI' },
];

const FAQS = [
  { q: 'Is HostelHub suitable for a single PG or a large hostel?', a: 'Both. Whether you run one 20-bed PG or a multi-floor hostel, HostelHub scales with your rooms, residents and staff — you only set up what you use.' },
  { q: 'How do online rent payments work?', a: 'Rent is auto-generated each month. Residents pay securely via Razorpay (UPI, cards, net-banking) and get an instant PDF receipt. You can also record cash or bank transfers manually.' },
  { q: 'Can residents and staff have their own logins?', a: 'Yes. Owners, residents and staff each get a dedicated, permission-scoped portal — everyone sees exactly what they should and nothing more.' },
  { q: 'Do I need technical knowledge to set it up?', a: 'No. Add your rooms, invite people, and you are live. The interface is designed to be as familiar as any consumer app.' },
  { q: 'Is my data secure?', a: 'Authentication uses industry-standard JWT with secure, http-only sessions, role-based access control and rate-limited APIs. Your data is yours.' },
  { q: 'Can I try it before buying?', a: 'Absolutely — use the live demo with the credentials on this page to explore every role, no signup required.' },
];

function Section({ id, className = '', children }) {
  return <section id={id} className={`mx-auto max-w-6xl px-5 ${className}`}>{children}</section>;
}

function PriceTier({ name, price, period, blurb, features, popular, cta }) {
  return (
    <motion.div
      {...fadeUp}
      className={`relative flex flex-col rounded-3xl border p-7 ${popular ? 'border-brand-300 bg-white shadow-pop ring-1 ring-brand-200' : 'border-slate-200/80 bg-white shadow-card'}`}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-soft">
          <Sparkles className="w-3 h-3" /> Most popular
        </span>
      )}
      <h3 className="text-lg font-bold text-slate-900">{name}</h3>
      <p className="mt-1 text-sm text-slate-500">{blurb}</p>
      <div className="mt-5 flex items-end gap-1">
        <span className="text-4xl font-extrabold tracking-tight text-slate-900 tabular-nums">{price}</span>
        <span className="mb-1 text-sm text-slate-400">{period}</span>
      </div>
      <Link
        to="/register"
        className={`mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all ${popular ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-soft' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
      >
        {cta} <ArrowRight className="w-4 h-4" />
      </Link>
      <ul className="mt-7 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Check className="w-3.5 h-3.5" />
            </span>
            {f}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-5 shadow-card">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-4 py-5 text-left">
        <span className="font-semibold text-slate-900">{q}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          {open ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </span>
      </button>
      {open && <p className="-mt-1 pb-5 text-sm leading-relaxed text-slate-500">{a}</p>}
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const [mobileNav, setMobileNav] = useState(false);
  const [yearly, setYearly] = useState(false);
  const year = new Date().getFullYear();

  const navLinks = [
    ['Features', '#features'],
    ['Portals', '#portals'],
    ['Pricing', '#pricing'],
    ['FAQ', '#faq'],
  ];

  const price = (m) => (yearly ? `₹${Math.round(m * 0.8).toLocaleString('en-IN')}` : `₹${m.toLocaleString('en-IN')}`);

  return (
    <div className="min-h-screen bg-[#faf9f6] text-slate-900">
      {/* ── Nav ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-[#faf9f6]/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-[0_6px_16px_-4px_rgba(5,150,105,0.55)]">
              <House className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <span className="text-[17px] font-extrabold tracking-tight">HostelHub</span>
          </a>
          <nav className="hidden items-center gap-7 md:flex">
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} className="text-sm font-medium text-slate-600 transition-colors hover:text-brand-700">{label}</a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <Link to={`/${user.role}`} className="inline-flex h-10 items-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700">Open dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-slate-600 hover:text-slate-900">Log in</Link>
                <Link to="/register" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_-6px_rgba(5,150,105,0.6)] transition-colors hover:bg-brand-700">Get started <ArrowRight className="h-4 w-4" /></Link>
              </>
            )}
          </div>
          <button className="md:hidden text-slate-700" onClick={() => setMobileNav((o) => !o)} aria-label="Menu">
            {mobileNav ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileNav && (
          <div className="border-t border-slate-200/70 bg-[#faf9f6] px-5 py-4 md:hidden">
            <div className="flex flex-col gap-1">
              {navLinks.map(([label, href]) => (
                <a key={href} href={href} onClick={() => setMobileNav(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-brand-50">{label}</a>
              ))}
              <Link to={user ? `/${user.role}` : '/register'} className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white">{user ? 'Open dashboard' : 'Get started'}</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ──────────────────────────────────────────── */}
      <div id="top" className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-br from-brand-200/50 via-emerald-100/40 to-transparent blur-3xl" />
        <Section className="relative pt-16 pb-10 text-center sm:pt-24">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700">
              <Sparkles className="h-3.5 w-3.5" /> The all-in-one PG &amp; hostel platform
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Run your entire hostel from <span className="bg-gradient-to-r from-brand-600 to-emerald-500 bg-clip-text text-transparent">one dashboard</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-500">
              Rooms, residents, rent collection, complaints, visitors, food menus and analytics — HostelHub replaces your registers, spreadsheets and WhatsApp groups with one clean, modern system.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-600 px-7 font-semibold text-white shadow-[0_12px_28px_-8px_rgba(5,150,105,0.65)] transition-all hover:bg-brand-700 hover:-translate-y-0.5">Start free <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/login" className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-7 font-semibold text-slate-700 transition-colors hover:bg-slate-50">View live demo</Link>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Live demo — admin@hostelhub.com · tenant@hostelhub.com · staff@hostelhub.com <span className="text-slate-300">/</span> passwords on the login page
            </p>
          </motion.div>

          {/* Product screenshot */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15, ease: EASE }} className="relative mx-auto mt-14 max-w-5xl">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-pop">
              <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-red-300" />
                <span className="h-3 w-3 rounded-full bg-amber-300" />
                <span className="h-3 w-3 rounded-full bg-emerald-300" />
                <span className="ml-3 hidden rounded-md bg-white px-3 py-1 text-[11px] text-slate-400 ring-1 ring-slate-200 sm:block">app.hostelhub.com/admin</span>
              </div>
              <img src="/preview-admin.png" alt="HostelHub admin dashboard" className="block w-full" loading="lazy" />
            </div>
            <div className="pointer-events-none absolute -bottom-8 -right-4 hidden w-56 rotate-2 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-pop lg:block">
              <img src="/preview-tenant.png" alt="HostelHub resident dashboard" className="block w-full" loading="lazy" />
            </div>
          </motion.div>
        </Section>
      </div>

      {/* ── Stats ─────────────────────────────────────────── */}
      <Section className="py-14">
        <motion.div {...fadeUp} className="grid grid-cols-2 gap-6 rounded-3xl border border-slate-200/70 bg-white px-6 py-8 shadow-card sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-extrabold tracking-tight text-brand-600 tabular-nums">{s.value}</p>
              <p className="mt-1 text-sm text-slate-500">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </Section>

      {/* ── Features ──────────────────────────────────────── */}
      <Section id="features" className="py-16">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything a PG owner needs</h2>
          <p className="mt-3 text-slate-500">One subscription. Every module. No per-feature pricing games.</p>
        </motion.div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: (i % 4) * 0.06, ease: EASE }}
              className="group rounded-2xl border border-slate-200/70 bg-white p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-soft"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-transform group-hover:scale-105">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── Portals ───────────────────────────────────────── */}
      <div id="portals" className="border-y border-slate-200/70 bg-white">
        <Section className="py-16">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">A purpose-built portal for everyone</h2>
            <p className="mt-3 text-slate-500">Owners, residents and staff each get their own focused experience.</p>
          </motion.div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {ROLES.map(({ icon: Icon, label, tone, points }) => (
              <motion.div {...fadeUp} key={label} className="rounded-3xl border border-slate-200/70 bg-[#faf9f6] p-7 shadow-card">
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-soft`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{label}</h3>
                <ul className="mt-4 space-y-2.5">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </Section>
      </div>

      {/* ── How it works ──────────────────────────────────── */}
      <Section className="py-16">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Live in an afternoon</h2>
          <p className="mt-3 text-slate-500">No migrations, no consultants, no training.</p>
        </motion.div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <motion.div {...fadeUp} key={s.n} className="rounded-2xl border border-slate-200/70 bg-white p-7 shadow-card">
              <span className="text-sm font-extrabold text-brand-300">{s.n}</span>
              <h3 className="mt-2 text-lg font-bold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── Pricing ───────────────────────────────────────── */}
      <div id="pricing" className="border-y border-slate-200/70 bg-white">
        <Section className="py-16">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, honest pricing</h2>
            <p className="mt-3 text-slate-500">Start free. Upgrade when you grow. Cancel anytime.</p>
            <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-[#faf9f6] p-1 text-sm">
              <button onClick={() => setYearly(false)} className={`rounded-full px-4 py-1.5 font-semibold transition-colors ${!yearly ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>Monthly</button>
              <button onClick={() => setYearly(true)} className={`rounded-full px-4 py-1.5 font-semibold transition-colors ${yearly ? 'bg-brand-600 text-white' : 'text-slate-500'}`}>Yearly <span className={yearly ? 'text-brand-100' : 'text-brand-600'}>−20%</span></button>
            </div>
          </motion.div>
          <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
            <PriceTier name="Starter" price="₹0" period="/forever" blurb="For a single small PG getting started." cta="Start free"
              features={['Up to 15 beds', 'Rooms, residents & rent', 'Complaints & notices', 'Email support']} />
            <PriceTier name="Growth" price={price(1499)} period={yearly ? '/mo, billed yearly' : '/month'} blurb="For growing hostels that want it all." popular cta="Start 14-day trial"
              features={['Unlimited beds', 'Online payments + GST receipts', 'Visitors, food menu & analytics', 'Staff portal & roles', 'Priority support']} />
            <PriceTier name="Enterprise" price="Custom" period="" blurb="For chains and multi-property operators." cta="Talk to us"
              features={['Everything in Growth', 'Multiple properties', 'Custom onboarding & training', 'Dedicated success manager', 'SLA & SSO']} />
          </div>
        </Section>
      </div>

      {/* ── Testimonials ──────────────────────────────────── */}
      <Section className="py-16">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Loved by hostel owners</h2>
          <p className="mt-3 text-slate-500">From single PGs to multi-city co-living brands.</p>
        </motion.div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <motion.div {...fadeUp} key={t.name} className="flex flex-col rounded-2xl border border-slate-200/70 bg-white p-7 shadow-card">
              <div className="mb-3 flex gap-0.5 text-amber-400">
                {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-4 w-4 fill-amber-400" />)}
              </div>
              <p className="flex-1 text-[15px] leading-relaxed text-slate-700">“{t.quote}”</p>
              <div className="mt-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white">{t.initials}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.org}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <div id="faq" className="border-t border-slate-200/70 bg-white">
        <Section className="py-16">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Questions, answered</h2>
            <p className="mt-3 text-slate-500">Everything you need to know before you start.</p>
          </motion.div>
          <div className="mx-auto mt-10 max-w-3xl space-y-3">
            {FAQS.map((f) => <Faq key={f.q} {...f} />)}
          </div>
        </Section>
      </div>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <Section className="py-16">
        <motion.div {...fadeUp} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 px-6 py-14 text-center text-white shadow-pop">
          <div className="pointer-events-none absolute -top-16 -right-10 h-64 w-64 rounded-full bg-sun-400/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/4 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="relative">
            <h2 className="mx-auto max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">Stop managing your hostel on paper</h2>
            <p className="mx-auto mt-3 max-w-lg text-brand-50">Set up your rooms in 10 minutes. Your residents will thank you.</p>
            <Link to="/register" className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-8 font-semibold text-brand-700 shadow-soft transition-transform hover:-translate-y-0.5">
              Create your account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </Section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-slate-200/70 bg-white">
        <Section className="py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white"><House className="h-5 w-5" strokeWidth={2.4} /></span>
                <span className="text-[17px] font-extrabold tracking-tight">HostelHub</span>
              </div>
              <p className="mt-3 max-w-xs text-sm text-slate-500">Smart PG &amp; hostel management — rooms, rent, complaints, visitors and more, in one place.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Product</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li><a href="#features" className="hover:text-brand-700">Features</a></li>
                <li><a href="#portals" className="hover:text-brand-700">Portals</a></li>
                <li><a href="#pricing" className="hover:text-brand-700">Pricing</a></li>
                <li><Link to="/login" className="hover:text-brand-700">Live demo</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Company</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li><a href="#faq" className="hover:text-brand-700">FAQ</a></li>
                <li><a href="#top" className="hover:text-brand-700">About</a></li>
                <li><a href="mailto:hello@hostelhub.com" className="hover:text-brand-700">Contact</a></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Legal</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li><a href="#" className="hover:text-brand-700">Privacy</a></li>
                <li><a href="#" className="hover:text-brand-700">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-slate-100 pt-6 text-center text-sm text-slate-400">
            © {year} HostelHub · Smart PG &amp; Hostel Management
          </div>
        </Section>
      </footer>
    </div>
  );
}
