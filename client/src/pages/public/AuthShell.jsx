import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BedDouble, Receipt, MessagesSquare, CalendarCheck, Star, TrendingUp, ShieldCheck } from 'lucide-react';
import { LogoMark } from '../../components/brand/Logo';
import AuthBackground from '../../components/AuthBackground';

const FEATURES = [
  { icon: BedDouble,      tint: 'from-rose-300/30 to-rose-200/10',       text: 'Rooms, beds & occupancy at a glance' },
  { icon: Receipt,        tint: 'from-amber-300/30 to-amber-200/10',     text: 'Online rent collection with auto-receipts' },
  { icon: MessagesSquare, tint: 'from-sky-300/30 to-sky-200/10',         text: 'Complaints, visitors & notices, unified' },
  { icon: CalendarCheck,  tint: 'from-fuchsia-300/30 to-fuchsia-200/10', text: 'Move-ins, dues & exits on autopilot' },
];

/** Shared two-pane shell for all auth screens. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-white">
      {/* ─────────────────  BRAND PANE  ───────────────── */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden text-white p-12 xl:p-14">
        {/* Crimson gradient base */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(140%_120%_at_0%_0%,#ef6f4f_0%,#ea5e3c_45%,#823423_100%)]" />
        {/* Animated three.js layer */}
        <AuthBackground className="absolute inset-0 z-0" />
        {/* Decorative glow orbs */}
        <div className="pointer-events-none absolute -top-32 -left-28 w-[30rem] h-[30rem] rounded-full bg-rose-400/35 blur-3xl z-0" />
        <div className="pointer-events-none absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-amber-300/25 blur-3xl z-0" />
        <div className="pointer-events-none absolute -bottom-40 -right-20 w-[28rem] h-[28rem] rounded-full bg-rose-300/20 blur-3xl z-0" />
        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '28px 28px' }}
        />
        {/* Top sheen + bottom vignette */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 z-0 bg-gradient-to-b from-white/12 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 z-0 bg-gradient-to-t from-black/25 to-transparent" />

        {/* Brand lockup */}
        <Link to="/" className="relative z-10 flex items-center gap-3 group w-fit">
          <LogoMark size={48} className="drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-transform group-hover:scale-105" />
          <div>
            <div className="font-extrabold text-[22px] tracking-tight leading-none">HostelHub</div>
            <div className="text-[11px] text-rose-100/80 font-medium tracking-wider uppercase mt-1">Smart PG &amp; Hostel OS</div>
          </div>
        </Link>

        {/* Hero */}
        <div className="relative z-10">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-white/10 ring-1 ring-white/25 backdrop-blur-md text-[11px] font-semibold text-white/95 tracking-wide"
          >
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-amber-300 animate-ping opacity-75" />
              <span className="relative rounded-full w-2 h-2 bg-amber-300" />
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
            <span className="bg-gradient-to-r from-amber-200 via-rose-100 to-white bg-clip-text text-transparent">
              not the paperwork.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mt-5 text-[15px] text-white/80 leading-relaxed max-w-md"
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
                className="flex items-center gap-3.5 text-[14.5px] text-white/95"
              >
                <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${f.tint} ring-1 ring-white/25 flex items-center justify-center shrink-0 backdrop-blur-sm shadow-[0_4px_14px_rgba(0,0,0,0.18)]`}>
                  <f.icon className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
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
            className="relative rounded-2xl p-5 bg-white/12 ring-1 ring-white/25 backdrop-blur-xl shadow-[0_18px_60px_-20px_rgba(0,0,0,0.55)] max-w-[420px]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-white/80 tracking-wide uppercase">
                <TrendingUp className="w-3.5 h-3.5" />
                Today's snapshot
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-100">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-rose-200 animate-ping opacity-75" />
                  <span className="relative rounded-full w-1.5 h-1.5 bg-rose-200" />
                </span>
                LIVE
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-[11px] text-white/65 font-medium">Collected this month</div>
                <div className="text-2xl font-extrabold text-white tabular-nums tracking-tight mt-0.5">₹4,82,500</div>
                <div className="text-[11px] text-rose-100 font-semibold mt-0.5">▲ 18% vs last month</div>
              </div>
              <div>
                <div className="text-[11px] text-white/65 font-medium">Occupancy</div>
                <div className="text-2xl font-extrabold text-white tabular-nums tracking-tight mt-0.5">94<span className="text-base text-white/60">%</span></div>
                <div className="text-[11px] text-amber-200 font-semibold mt-0.5">152 / 162 beds filled</div>
              </div>
            </div>
            {/* Sparkline-ish bar chart */}
            <div className="flex items-end gap-1 h-10">
              {[34, 48, 41, 58, 52, 67, 73, 70, 82, 78, 88, 94].map((v, i) => (
                <div
                  key={i}
                  style={{ height: `${v}%` }}
                  className="flex-1 rounded-t bg-gradient-to-t from-amber-300/70 to-rose-200/90"
                />
              ))}
            </div>
          </motion.div>

          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="relative rounded-2xl p-5 bg-white/8 ring-1 ring-white/15 backdrop-blur-md max-w-[420px]"
          >
            <div className="flex gap-0.5 mb-2 text-amber-300">
              {[1,2,3,4,5].map((i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-300" />)}
            </div>
            <p className="text-[14px] text-white/90 leading-relaxed italic">
              &ldquo;HostelHub cut our admin work in half. Rent collection is on autopilot —
              I just check the dashboard.&rdquo;
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center text-[13px] font-extrabold text-white shadow-md">RM</div>
              <div className="text-[12px]">
                <div className="font-semibold text-white">Rohan Mehta</div>
                <div className="text-white/60">Owner · 3 properties, Pune</div>
              </div>
            </div>
          </motion.div>

          {/* Trust pills */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-100" />
              <span className="font-semibold text-white">256-bit secure</span>
            </div>
            <div className="inline-flex items-baseline gap-1.5 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
              <span className="text-white font-bold tabular-nums">500+</span>
              <span className="text-white/70">beds managed</span>
            </div>
            <div className="inline-flex items-baseline gap-1.5 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
              <span className="text-white font-bold tabular-nums">99.9%</span>
              <span className="text-white/70">uptime</span>
            </div>
          </div>

          <p className="text-[11px] text-white/45 pt-1">© {new Date().getFullYear()} HostelHub · All rights reserved</p>
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
            <span className="font-extrabold text-lg tracking-tight text-slate-900">HostelHub</span>
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
