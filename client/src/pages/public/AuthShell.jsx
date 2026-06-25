import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BedDouble, IndianRupee, QrCode } from 'lucide-react';
import { LogoMark, LogoMono } from '../../components/brand/Logo';

// A designed 24-bed occupancy snapshot (o=filled, r=reserved, v=vacant) → 92% full.
const BEDS = [
  'o', 'o', 'o', 'o', 'o', 'r',
  'o', 'o', 'o', 'o', 'o', 'o',
  'o', 'o', 'v', 'o', 'o', 'o',
  'o', 'o', 'o', 'o', 'o', 'o',
];
const PROOF = [
  { icon: BedDouble, label: 'Live occupancy' },
  { icon: IndianRupee, label: 'UPI rent & receipts' },
  { icon: QrCode, label: 'Visitor QR passes' },
];

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

        {/* signature — live occupancy snapshot (mirrors the product's bed map) */}
        <div className="relative flex flex-1 items-center justify-center py-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="animate-float-soft w-full max-w-sm rounded-2xl bg-white/10 p-5 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.7)] ring-1 ring-white/20 backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                <BedDouble className="h-4 w-4" /> Live occupancy
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold tabular-nums text-white ring-1 ring-white/20">92% full</span>
            </div>

            <div className="mt-4 grid grid-cols-6 gap-2">
              {BEDS.map((b, i) => (
                <span
                  key={i}
                  className={`aspect-square rounded-md ${
                    b === 'o'
                      ? 'bg-white/90 shadow-sm'
                      : b === 'r'
                        ? 'bg-amber-300/85'
                        : 'border border-dashed border-white/45'
                  }`}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3 text-[11px] font-medium text-white/70">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-white/90" /> Filled</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-amber-300/85" /> Reserved</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] border border-dashed border-white/50" /> Vacant</span>
            </div>
            <p className="mt-3 border-t border-white/10 pt-3 text-xs text-white/55">Sunrise PG · 24 beds · 1 vacant · ₹0 leaking</p>
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
