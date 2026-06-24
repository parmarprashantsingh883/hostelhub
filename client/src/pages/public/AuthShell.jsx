import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BedDouble, Receipt, MessagesSquare, CalendarCheck, Star, TrendingUp, ShieldCheck } from 'lucide-react';
import { LogoMark } from '../../components/brand/Logo';

const FEATURES = [
  { icon: BedDouble,      text: 'Rooms, beds & occupancy at a glance' },
  { icon: Receipt,        text: 'Online rent collection with auto-receipts' },
  { icon: MessagesSquare, text: 'Complaints, visitors & notices, unified' },
  { icon: CalendarCheck,  text: 'Move-ins, dues & exits on autopilot' },
];

/** Shared two-pane shell for all auth screens. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-white">
      {/* ─────────────────  BRAND PANE  ───────────────── */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden text-white p-12 xl:p-14">
        {/* Ink-navy base */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(130%_120%_at_0%_0%,#33425e_0%,#202a3d_42%,#0d121d_100%)]" />
        {/* Subtle monochrome glow */}
        <div className="pointer-events-none absolute -top-32 -left-28 w-[30rem] h-[30rem] rounded-full bg-white/10 blur-3xl z-0" />
        <div className="pointer-events-none absolute -bottom-40 -right-24 w-[30rem] h-[30rem] rounded-full bg-white/5 blur-3xl z-0" />
        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '30px 30px' }}
        />
        {/* Top sheen + bottom vignette */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 z-0 bg-gradient-to-b from-white/8 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 z-0 bg-gradient-to-t from-black/30 to-transparent" />

        {/* Brand lockup */}
        <Link to="/" className="relative z-10 flex items-center gap-3 group w-fit">
          <LogoMark size={46} className="drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-transform group-hover:scale-105" />
          <div>
            <div className="font-extrabold text-[22px] tracking-tight leading-none">Quarters</div>
            <div className="text-[10.5px] text-white/55 font-semibold tracking-[0.18em] uppercase mt-1.5">Property OS · PGs &amp; Hostels</div>
          </div>
        </Link>

        {/* Hero */}
        <div className="relative z-10">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-white/8 ring-1 ring-white/15 backdrop-blur-md text-[11px] font-semibold text-white/85 tracking-wide"
          >
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-white/70 animate-ping opacity-60" />
              <span className="relative rounded-full w-1.5 h-1.5 bg-white/90" />
            </span>
            BUILT FOR INDIAN PG &amp; HOSTEL OWNERS
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="text-[2.75rem] xl:text-5xl font-extrabold leading-[1.05] tracking-tight"
          >
            Run your property,
            <br />
            <span className="text-white/55">not the paperwork.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mt-5 text-[15px] text-white/70 leading-relaxed max-w-md"
          >
            The operating system for modern PGs and hostels — built for owners who would
            rather grow their business than chase rent.
          </motion.p>

          {/* Feature list */}
          <ul className="mt-8 space-y-3.5">
            {FEATURES.map((f, i) => (
              <motion.li
                key={f.text}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.18 + i * 0.06 }}
                className="flex items-center gap-3.5 text-[14.5px] text-white/90"
              >
                <span className="w-9 h-9 rounded-xl bg-white/8 ring-1 ring-white/15 flex items-center justify-center shrink-0 backdrop-blur-sm">
                  <f.icon className="w-[18px] h-[18px] text-white/90" strokeWidth={2} />
                </span>
                {f.text}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Floating preview + testimonial */}
        <div className="relative z-10 space-y-5">
          {/* Live dashboard preview card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="relative rounded-2xl p-5 bg-white/[0.07] ring-1 ring-white/15 backdrop-blur-xl shadow-[0_18px_60px_-20px_rgba(0,0,0,0.55)] max-w-[420px]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-white/70 tracking-wide uppercase">
                <TrendingUp className="w-3.5 h-3.5" />
                Today's snapshot
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-white/60">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-white/70 animate-ping opacity-60" />
                  <span className="relative rounded-full w-1.5 h-1.5 bg-white/80" />
                </span>
                LIVE
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-[11px] text-white/55 font-medium">Collected this month</div>
                <div className="text-2xl font-extrabold text-white tabular-nums tracking-tight mt-0.5">₹4,82,500</div>
                <div className="text-[11px] text-white/65 font-semibold mt-0.5">▲ 18% vs last month</div>
              </div>
              <div>
                <div className="text-[11px] text-white/55 font-medium">Occupancy</div>
                <div className="text-2xl font-extrabold text-white tabular-nums tracking-tight mt-0.5">94<span className="text-base text-white/45">%</span></div>
                <div className="text-[11px] text-white/55 font-semibold mt-0.5">152 / 162 beds filled</div>
              </div>
            </div>
            {/* Sparkline-ish bar chart */}
            <div className="flex items-end gap-1 h-10">
              {[34, 48, 41, 58, 52, 67, 73, 70, 82, 78, 88, 94].map((v, i) => (
                <div
                  key={i}
                  style={{ height: `${v}%` }}
                  className="flex-1 rounded-t bg-gradient-to-t from-white/15 to-white/55"
                />
              ))}
            </div>
          </motion.div>

          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="relative rounded-2xl p-5 bg-white/[0.05] ring-1 ring-white/12 backdrop-blur-md max-w-[420px]"
          >
            <div className="flex gap-0.5 mb-2 text-white/80">
              {[1,2,3,4,5].map((i) => <Star key={i} className="w-3.5 h-3.5 fill-white/80" />)}
            </div>
            <p className="text-[14px] text-white/85 leading-relaxed">
              &ldquo;Quarters cut our admin work in half. Rent collection is on autopilot —
              I just check the dashboard.&rdquo;
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-[13px] font-extrabold text-white shadow-md">RM</div>
              <div className="text-[12px]">
                <div className="font-semibold text-white">Rohan Mehta</div>
                <div className="text-white/55">Owner · 3 properties, Pune</div>
              </div>
            </div>
          </motion.div>

          {/* Trust pills */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 ring-1 ring-white/12 backdrop-blur-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-white/70" />
              <span className="font-semibold text-white">256-bit secure</span>
            </div>
            <div className="inline-flex items-baseline gap-1.5 px-3 py-1.5 rounded-full bg-white/8 ring-1 ring-white/12 backdrop-blur-sm">
              <span className="text-white font-bold tabular-nums">500+</span>
              <span className="text-white/65">beds managed</span>
            </div>
            <div className="inline-flex items-baseline gap-1.5 px-3 py-1.5 rounded-full bg-white/8 ring-1 ring-white/12 backdrop-blur-sm">
              <span className="text-white font-bold tabular-nums">99.9%</span>
              <span className="text-white/65">uptime</span>
            </div>
          </div>

          <p className="text-[11px] text-white/40 pt-1">© {new Date().getFullYear()} Quarters · All rights reserved</p>
        </div>
      </div>

      {/* ─────────────────  FORM PANE  ───────────────── */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-gradient-to-b from-white to-cream-100">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-md"
        >
          {/* Mobile-only brand */}
          <Link to="/" className="lg:hidden flex items-center gap-3 mb-8">
            <LogoMark size={40} />
            <span className="font-extrabold text-lg tracking-tight text-slate-900">Quarters</span>
          </Link>
          <h1 className="text-[26px] font-extrabold text-slate-900 tracking-tight leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-slate-500 text-center">{footer}</div>}
        </motion.div>
      </div>
    </div>
  );
}
