import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BedDouble, IndianRupee, QrCode, Check } from 'lucide-react';
import { LogoMark, LogoMono } from '../../components/brand/Logo';

const PROOF = [
  { icon: BedDouble, label: 'Live occupancy' },
  { icon: IndianRupee, label: 'UPI rent & receipts' },
  { icon: QrCode, label: 'Visitor QR passes' },
];

// Mini 6-month revenue bars for the product snapshot (height %, last = current).
const BARS = [38, 50, 46, 64, 78, 95];

/**
 * Two-pane auth shell: a clean white form on the left, and a branded product
 * panel on the right — the blue brand gradient with a live-occupancy snapshot
 * (the product's signature) and the Quarters motto.
 */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2 dark:bg-sidebar">
      {/* ───────────────── FORM (left) ───────────────── */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          <Link to="/" className="group mb-10 inline-flex items-center gap-2.5">
            <LogoMark size={40} className="transition-transform group-hover:scale-105" />
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Quarters</span>
          </Link>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
        </motion.div>
      </div>

      {/* ───────────────── BRAND PANEL (right) ───────────────── */}
      <div className="surface-hero relative hidden flex-col overflow-hidden p-10 lg:flex">
        {/* soft ambient glows */}
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-8 h-72 w-72 rounded-full bg-brand-400/25 blur-3xl" />

        {/* wordmark */}
        <div className="relative flex items-center gap-2.5">
          <LogoMono size={30} className="text-white" />
          <span className="text-lg font-extrabold tracking-tight text-white">Quarters</span>
        </div>

        {/* signature — a polished product snapshot (occupancy ring + revenue) */}
        <div className="relative flex flex-1 items-center justify-center py-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="animate-float-soft relative w-full max-w-sm"
          >
            {/* main product card — solid white so it reads as a real app screen */}
            <div className="rounded-2xl bg-white p-5 shadow-[0_34px_90px_-26px_rgba(0,0,0,0.6)] ring-1 ring-black/5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">This month</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live
                </span>
              </div>

              <div className="mt-4 flex items-center gap-5">
                {/* occupancy ring */}
                <div className="relative h-[88px] w-[88px] shrink-0">
                  <svg viewBox="0 0 100 100" className="h-[88px] w-[88px] -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#eef1f5" strokeWidth="11" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#2563eb" strokeWidth="11" strokeLinecap="round" strokeDasharray="264" strokeDashoffset="21" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-extrabold tracking-tight text-slate-900">92%</span>
                    <span className="text-[10px] font-medium text-slate-400">occupied</span>
                  </div>
                </div>
                {/* revenue + mini bars */}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Collected</p>
                  <p className="text-2xl font-extrabold tracking-tight text-slate-900">₹1.24L</p>
                  <div className="mt-2 flex h-9 items-end gap-1.5">
                    {BARS.map((h, i) => (
                      <span key={i} style={{ height: `${h}%` }} className={`w-2.5 rounded-sm ${i === BARS.length - 1 ? 'bg-brand-600' : 'bg-brand-200'}`} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="text-slate-400">Sunrise PG · 22 beds</span>
                <span className="font-semibold text-emerald-600">+8% vs last month</span>
              </div>
            </div>

            {/* floating receipt toast — echoes the in-app payment flow */}
            <div className="absolute -right-3 -top-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-[0_16px_36px_-12px_rgba(0,0,0,0.4)] ring-1 ring-black/5">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <span className="text-xs font-semibold text-slate-700">Rent received · ₹6,200</span>
            </div>
          </motion.div>
        </div>

        {/* motto + proof */}
        <div className="relative">
          <p className="font-display text-[30px] font-semibold leading-[1.1] text-white">
            Run your property,<br />not the paperwork.
          </p>
          <p className="mt-2.5 text-sm text-white/70">The operating system for modern PGs &amp; hostels.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {PROOF.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85 ring-1 ring-white/15">
                <Icon className="h-3.5 w-3.5" /> {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
