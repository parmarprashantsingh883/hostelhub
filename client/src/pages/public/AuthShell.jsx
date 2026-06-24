import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogoMark, LogoMono } from '../../components/brand/Logo';

/**
 * Two-pane auth shell: a clean white form on the left, a full-bleed branded
 * image with a frosted-glass logo on the right.
 */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
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
            <span className="text-xl font-extrabold tracking-tight text-slate-900">Quarters</span>
          </Link>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
        </motion.div>
      </div>

      {/* ───────────────── IMAGE (right) ───────────────── */}
      <div className="relative hidden overflow-hidden lg:block">
        <img src="/auth-bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        {/* Ink-navy duotone so the monochrome scene reads as the brand */}
        <div className="absolute inset-0 bg-brand-800/45 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/85 via-brand-900/10 to-brand-900/25" />
        {/* faint dot grid */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '26px 26px' }}
        />

        {/* centered frosted-glass logo */}
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-3.5 rounded-2xl bg-white/10 px-7 py-5 shadow-[0_18px_60px_-20px_rgba(0,0,0,0.65)] ring-1 ring-white/25 backdrop-blur-md"
          >
            <LogoMono size={42} className="text-white" />
            <span className="text-[28px] font-extrabold tracking-tight text-white">Quarters</span>
          </motion.div>
        </div>

        {/* tagline */}
        <div className="absolute inset-x-0 bottom-0 p-10">
          <p className="font-display text-2xl font-semibold leading-snug text-white">
            Run your property,<br />not the paperwork.
          </p>
          <p className="mt-2 text-sm text-white/65">The operating system for modern PGs &amp; hostels.</p>
        </div>
      </div>
    </div>
  );
}
