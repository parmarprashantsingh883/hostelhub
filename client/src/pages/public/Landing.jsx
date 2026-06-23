import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DoorOpen, Banknote, Wrench, Megaphone, ClipboardList, UtensilsCrossed,
  ShieldCheck, BarChart3, ArrowRight, ArrowUpRight, Check, Menu, X, Plus, Minus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LogoMark } from '../../components/brand/Logo';
import OccupancyBoard from '../../components/marketing/OccupancyBoard';

const EASE = [0.16, 1, 0.3, 1];
const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-70px' },
  transition: { duration: 0.6, ease: EASE },
};

const FEATURES = [
  { icon: DoorOpen, tag: 'Rooms', title: 'Rooms & beds', desc: 'Every floor, room and bed in one board — assign a resident in a tap, watch occupancy update live.' },
  { icon: Banknote, tag: 'Money', title: 'Rent & payments', desc: 'Auto-raise monthly rent, collect online via Razorpay, hand over a GST-ready receipt the same second.' },
  { icon: Wrench, tag: 'Upkeep', title: 'Complaints', desc: 'A leaky tap goes from resident to staff to fixed — with the whole trail visible to everyone.' },
  { icon: ClipboardList, tag: 'Gate', title: 'Visitors', desc: 'Guests pre-register, security checks them in and out, and nothing is left to a paper register.' },
  { icon: Megaphone, tag: 'Voice', title: 'Notices', desc: 'Pin a notice or fire an urgent alert — on every resident’s screen and in their inbox.' },
  { icon: UtensilsCrossed, tag: 'Mess', title: 'Food menu', desc: 'Publish the week’s menu and find out, dish by dish, what residents actually want again.' },
  { icon: BarChart3, tag: 'Numbers', title: 'Reports', desc: 'Revenue, occupancy and dues as charts you can read at a glance — and export when you need them.' },
  { icon: ShieldCheck, tag: 'Access', title: 'Roles', desc: 'Owner, resident and staff each see their own world, and nothing they shouldn’t.' },
];

const ROLES = [
  { label: 'Owners', sub: 'See the whole house', points: ['Live occupancy & revenue', 'One-tap monthly rent run', 'Staff & complaint oversight', 'Exportable reports'] },
  { label: 'Residents', sub: 'Everything in a tap', points: ['Pay rent, keep receipts', 'Raise & track complaints', 'Pre-register visitors', 'Notices, room & menu'] },
  { label: 'Staff', sub: 'A clear day’s work', points: ['A tidy task queue', 'Update status on the go', 'Check visitors in / out', 'Stay on the same page'] },
];

const STEPS = [
  { n: '01', title: 'Set up the building', desc: 'Add your floors, rooms and rent. Import an existing list if you have one — it takes a coffee.' },
  { n: '02', title: 'Invite your people', desc: 'Residents and staff each get a private portal. No training, no manual, no helpdesk.' },
  { n: '03', title: 'Let it run', desc: 'Rent raises itself, complaints route themselves, the numbers keep themselves. You just watch.' },
];

const STATS = ['₹40L+ collected', '500+ beds managed', '12 hrs saved weekly', '99.9% uptime'];

const TESTIMONIALS = [
  { quote: 'Rent collection used to eat my first week of every month. Now it closes in a day, and I never chase anyone.', name: 'Rahul Mehta', org: 'Sunrise PG · Pune', initials: 'RM', featured: true },
  { quote: 'Complaints and visitors stopped being my problem to remember. It’s all just… tracked.', name: 'Anjali Verma', org: 'Nest Co-living · Bengaluru', initials: 'AV' },
  { quote: 'For the first time I can see occupancy and dues as real numbers. It feels like a business now.', name: 'Suresh Iyer', org: 'Comfort Stay · Chennai', initials: 'SI' },
];

const FAQS = [
  { q: 'Is it for a single PG or a big hostel?', a: 'Either. One 20-bed PG or a multi-floor hostel — HostelHub scales to your rooms, residents and staff, and you only switch on what you use.' },
  { q: 'How does online rent work?', a: 'Rent auto-raises each month. Residents pay by UPI, card or net-banking through Razorpay and get an instant PDF receipt. Cash and bank transfers can be recorded by hand too.' },
  { q: 'Do residents and staff get their own logins?', a: 'Yes — owner, resident and staff each get a separate, permission-scoped portal. Everyone sees exactly their slice and nothing more.' },
  { q: 'Do I need to be technical?', a: 'No. Add rooms, invite people, done. It’s built to feel like any app you already use on your phone.' },
  { q: 'Is my data safe?', a: 'Sessions use industry-standard JWT with secure, http-only cookies, strict role-based access and rate-limited APIs. The data is yours.' },
  { q: 'Can I try before paying?', a: 'Yes — the live demo on the sign-in page opens every role with one click. No signup, no card.' },
];

/* ── Small building blocks ─────────────────────────────────────────── */
function KeyTag({ children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-brand-700 ring-1 ring-brand-100">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
      {children}
    </span>
  );
}
function Eyebrow({ children, dark }) {
  return (
    <p className={`font-mono text-[11px] uppercase tracking-[0.22em] ${dark ? 'text-brand-300' : 'text-brand-600'}`}>{children}</p>
  );
}
function Section({ id, className = '', children }) {
  return <section id={id} className={`mx-auto max-w-6xl px-5 ${className}`}>{children}</section>;
}

function PriceTier({ name, price, period, blurb, features, popular, cta }) {
  return (
    <motion.div {...reveal}
      className={`relative flex flex-col rounded-3xl p-7 ${popular ? 'bg-night-900 text-cream-50 shadow-pop' : 'bg-white text-slate-900 ring-1 ring-slate-200/80 shadow-card'}`}>
      {popular && <span className="absolute -top-3 left-7 rounded-full bg-brand-600 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-white">Most booked</span>}
      <p className={`font-mono text-[11px] uppercase tracking-[0.18em] ${popular ? 'text-brand-300' : 'text-slate-400'}`}>{name}</p>
      <div className="mt-3 flex items-end gap-1.5">
        <span className="font-display text-5xl font-semibold leading-none tracking-tight tabular-nums">{price}</span>
        <span className={`mb-1 text-sm ${popular ? 'text-cream-50/55' : 'text-slate-400'}`}>{period}</span>
      </div>
      <p className={`mt-3 text-sm ${popular ? 'text-cream-50/70' : 'text-slate-500'}`}>{blurb}</p>
      <Link to="/register"
        className={`mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all ${popular ? 'bg-brand-600 text-white hover:bg-brand-500' : 'bg-night-900 text-cream-50 hover:bg-night-800'}`}>
        {cta} <ArrowRight className="h-4 w-4" />
      </Link>
      <ul className="mt-7 space-y-3">
        {features.map((f) => (
          <li key={f} className={`flex items-start gap-2.5 text-sm ${popular ? 'text-cream-50/85' : 'text-slate-600'}`}>
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${popular ? 'text-brand-300' : 'text-brand-600'}`} /> {f}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200/80">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-6 py-5 text-left">
        <span className="font-display text-lg font-medium text-slate-900">{q}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </span>
      </button>
      {open && <p className="-mt-1 max-w-2xl pb-5 text-[15px] leading-relaxed text-slate-500">{a}</p>}
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const [mobileNav, setMobileNav] = useState(false);
  const [yearly, setYearly] = useState(false);
  const year = new Date().getFullYear();
  const navLinks = [['What it does', '#features'], ['Pricing', '#pricing'], ['Questions', '#faq']];
  const price = (m) => (yearly ? `₹${Math.round(m * 0.8).toLocaleString('en-IN')}` : `₹${m.toLocaleString('en-IN')}`);

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 selection:bg-brand-200">
      {/* Announcement strip */}
      <div className="bg-night-900 text-cream-50">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-5 py-2 font-mono text-[11px] tracking-wide">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
          Now collecting rent online with GST-ready receipts · made in India for ₹
        </div>
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-[#f6f8fa]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#top" className="flex items-center gap-2.5">
            <LogoMark size={34} />
            <span className="text-[18px] font-extrabold tracking-tight">HostelHub</span>
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map(([l, h]) => (
              <a key={h} href={h} className="font-mono text-[12px] uppercase tracking-wider text-slate-500 transition-colors hover:text-brand-700">{l}</a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <Link to={`/${user.role}`} className="inline-flex h-10 items-center rounded-full bg-night-900 px-5 text-sm font-semibold text-cream-50 hover:bg-night-800">Open dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-slate-600 hover:text-slate-900">Sign in</Link>
                <Link to="/register" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">Start free <ArrowRight className="h-4 w-4" /></Link>
              </>
            )}
          </div>
          <button className="text-slate-700 md:hidden" onClick={() => setMobileNav((o) => !o)} aria-label="Menu">
            {mobileNav ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileNav && (
          <div className="border-t border-slate-200/60 px-5 py-4 md:hidden">
            {navLinks.map(([l, h]) => (
              <a key={h} href={h} onClick={() => setMobileNav(false)} className="block rounded-lg px-3 py-2.5 font-mono text-xs uppercase tracking-wider text-slate-600 hover:bg-brand-50">{l}</a>
            ))}
            <Link to={user ? `/${user.role}` : '/register'} className="mt-2 flex h-11 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">{user ? 'Open dashboard' : 'Start free'}</Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <div id="top">
        <Section className="grid items-center gap-12 pt-14 pb-12 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20 lg:pb-16">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
            <KeyTag>For PG &amp; hostel owners</KeyTag>
            <h1 className="mt-6 font-display text-[2.9rem] font-semibold leading-[1.04] tracking-[-0.01em] sm:text-6xl">
              Run the whole building from <span className="italic text-brand-600">one calm screen.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-slate-600">
              HostelHub retires the rent register, the complaints diary and the resident WhatsApp group — rooms, rent,
              complaints, visitors and reports, finally in one place.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register" className="inline-flex h-12 items-center gap-2 rounded-full bg-brand-600 px-7 font-semibold text-white shadow-[0_14px_30px_-10px_rgba(36,48,71,0.7)] transition-all hover:-translate-y-0.5 hover:bg-brand-700">
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className="group inline-flex h-12 items-center gap-2 rounded-full border border-slate-300 px-7 font-semibold text-slate-700 transition-colors hover:border-night-900 hover:bg-white">
                View live demo <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-wider text-slate-400">No card needed · one-click demo · ₹ India-ready</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12, ease: EASE }} className="relative">
            <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand-200/50 via-rose-100/40 to-transparent blur-2xl" />
            <OccupancyBoard />
          </motion.div>
        </Section>
      </div>

      {/* Stat ribbon */}
      <div className="border-y border-slate-200/70 bg-paper">
        <Section className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-4 text-center">
          {STATS.map((s, i) => (
            <span key={s} className="flex items-center gap-8 font-mono text-[12px] uppercase tracking-wider text-slate-500">
              {i > 0 && <span className="hidden text-brand-300 sm:inline">·</span>}
              <span><span className="font-semibold text-slate-800">{s.split(' ')[0]}</span> {s.split(' ').slice(1).join(' ')}</span>
            </span>
          ))}
        </Section>
      </div>

      {/* Features */}
      <Section id="features" className="py-20">
        <motion.div {...reveal} className="max-w-2xl">
          <Eyebrow>The system</Eyebrow>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Everything a property needs, under one roof.</h2>
        </motion.div>
        <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, tag, title, desc }) => (
            <motion.div {...reveal} key={title} className="group">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <Icon className="h-5 w-5 text-brand-600" strokeWidth={2} />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{tag}</span>
              </div>
              <h3 className="mt-4 font-display text-xl font-medium">{title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-500">{desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Roles — dark band */}
      <div className="bg-night-900 text-cream-50">
        <Section className="py-20">
          <motion.div {...reveal} className="max-w-2xl">
            <Eyebrow dark>Three doors, one building</Eyebrow>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">A private portal for everyone inside.</h2>
          </motion.div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {ROLES.map((r) => (
              <motion.div {...reveal} key={r.label} className="rounded-3xl bg-white/[0.04] p-7 ring-1 ring-white/10">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-300">{r.label}</p>
                <h3 className="mt-2 font-display text-2xl font-medium">{r.sub}</h3>
                <ul className="mt-5 space-y-2.5">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-[14.5px] text-cream-50/80">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" /> {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </Section>
      </div>

      {/* How it works */}
      <Section className="py-20">
        <motion.div {...reveal} className="max-w-2xl">
          <Eyebrow>Live in an afternoon</Eyebrow>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">No migration. No consultants. No manual.</h2>
        </motion.div>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {STEPS.map((s) => (
            <motion.div {...reveal} key={s.n} className="border-t-2 border-brand-600 pt-5">
              <span className="font-display text-5xl font-semibold text-brand-600 tabular-nums">{s.n}</span>
              <h3 className="mt-3 font-display text-xl font-medium">{s.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-slate-500">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* See it in action — warm paper frame */}
      <Section className="pb-20">
        <motion.div {...reveal} className="relative rounded-[2rem] bg-paper p-3 ring-1 ring-slate-200/70 shadow-soft sm:p-4">
          <span className="absolute -top-3 left-8 z-10 rounded-full bg-night-900 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-cream-50">The owner’s view</span>
          <img src="/preview-admin.png" alt="HostelHub admin dashboard" className="w-full rounded-2xl ring-1 ring-slate-200" loading="lazy" />
        </motion.div>
      </Section>

      {/* Pricing */}
      <div className="border-y border-slate-200/70 bg-paper">
        <Section className="py-20">
          <motion.div {...reveal} className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <Eyebrow>Room-rate pricing</Eyebrow>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Pay for the beds, not the buzzwords.</h2>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white p-1 font-mono text-[12px] uppercase tracking-wider">
              <button onClick={() => setYearly(false)} className={`rounded-full px-4 py-1.5 font-semibold transition-colors ${!yearly ? 'bg-night-900 text-cream-50' : 'text-slate-500'}`}>Monthly</button>
              <button onClick={() => setYearly(true)} className={`rounded-full px-4 py-1.5 font-semibold transition-colors ${yearly ? 'bg-night-900 text-cream-50' : 'text-slate-500'}`}>Yearly −20%</button>
            </div>
          </motion.div>
          <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
            <PriceTier name="Starter" price="₹0" period="/forever" blurb="A single small PG finding its feet." cta="Start free"
              features={['Up to 15 beds', 'Rooms, residents & rent', 'Complaints & notices', 'Email support']} />
            <PriceTier name="Growth" price={price(1499)} period={yearly ? '/mo, billed yearly' : '/month'} blurb="A growing hostel that wants it all." popular cta="Start 14-day trial"
              features={['Unlimited beds', 'Online payments + GST receipts', 'Visitors, food menu & analytics', 'Staff portal & roles', 'Priority support']} />
            <PriceTier name="Estate" price="Custom" period="" blurb="Chains and multi-property operators." cta="Talk to us"
              features={['Everything in Growth', 'Multiple properties', 'Onboarding & training', 'Dedicated manager', 'SLA & SSO']} />
          </div>
        </Section>
      </div>

      {/* Testimonials — guest book */}
      <Section className="py-20">
        <motion.div {...reveal}><Eyebrow>From the guest book</Eyebrow></motion.div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <motion.figure {...reveal} key={t.name}
              className={`flex flex-col rounded-3xl p-7 ${t.featured ? 'bg-brand-600 text-white lg:row-span-1' : 'bg-white text-slate-900 ring-1 ring-slate-200/80'}`}>
              <blockquote className={`flex-1 font-display ${t.featured ? 'text-2xl leading-snug' : 'text-lg leading-snug'} font-medium`}>
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${t.featured ? 'bg-white/15 text-white' : 'bg-brand-50 text-brand-700'}`}>{t.initials}</span>
                <span>
                  <span className="block text-sm font-semibold">{t.name}</span>
                  <span className={`block font-mono text-[11px] uppercase tracking-wider ${t.featured ? 'text-white/70' : 'text-slate-400'}`}>{t.org}</span>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <div id="faq" className="bg-paper">
        <Section className="grid gap-10 py-20 lg:grid-cols-[0.8fr_1.2fr]">
          <motion.div {...reveal}>
            <Eyebrow>Good questions</Eyebrow>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight">Before you sign in.</h2>
          </motion.div>
          <motion.div {...reveal} className="border-t border-slate-200/80">
            {FAQS.map((f) => <Faq key={f.q} {...f} />)}
          </motion.div>
        </Section>
      </div>

      {/* CTA */}
      <Section className="py-20">
        <motion.div {...reveal} className="relative overflow-hidden rounded-[2.5rem] bg-night-900 px-6 py-16 text-center text-cream-50">
          <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-brand-600/30 blur-3xl" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">Put the register down.</h2>
            <p className="mx-auto mt-4 max-w-md text-cream-50/70">Set your rooms up in ten minutes. Your residents — and your weekends — will notice.</p>
            <Link to="/register" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-brand-600 px-8 font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-brand-500">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-slate-200/70">
        <Section className="flex flex-col items-center justify-between gap-6 py-10 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <LogoMark size={30} />
            <span className="font-extrabold tracking-tight">HostelHub</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-slate-400">
            <a href="#features" className="hover:text-brand-700">Features</a>
            <a href="#pricing" className="hover:text-brand-700">Pricing</a>
            <Link to="/login" className="hover:text-brand-700">Live demo</Link>
            <a href="mailto:hello@hostelhub.com" className="hover:text-brand-700">Contact</a>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400">© {year} HostelHub</p>
        </Section>
      </footer>
    </div>
  );
}
