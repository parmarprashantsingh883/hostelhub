/**
 * HostelHub UI kit — small, composable building blocks shared by every page.
 * Production-grade: layered shadows, focus rings, subtle motion, slate palette.
 */
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Inbox, X, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

/* Motion primitives — re-exported so pages import everything from one place. */
export { Reveal, Stagger, StaggerItem, TableRow, AnimatedNumber, EASE } from './motion';
import { containerVariants } from './motion';

/* ── Button ─────────────────────────────────────────────────────────── */
const btnVariants = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-[0_2px_8px_-2px_rgba(36,48,71,0.5)] hover:shadow-[0_6px_16px_-4px_rgba(36,48,71,0.55)] focus-visible:ring-brand-500/40',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-[0_1px_2px_0_rgba(15,23,42,0.04)] focus-visible:ring-slate-400/40',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-[0_2px_8px_-2px_rgba(220,38,38,0.5)] focus-visible:ring-red-500/40',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400/40',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_2px_8px_-2px_rgba(5,150,105,0.5)] focus-visible:ring-emerald-500/40',
};
export function Button({ variant = 'primary', size = 'md', loading, className = '', children, ...rest }) {
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-11 px-6 text-[15px]' };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 outline-none focus-visible:ring-4 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${btnVariants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

/* ── Inputs ─────────────────────────────────────────────────────────── */
export function Field({ label, error, required, children, hint }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export const inputCls = (error) =>
  `w-full h-10 px-3.5 rounded-xl border text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 ${
    error ? 'border-red-400 focus:ring-red-500/10 focus:border-red-500' : 'border-slate-300 hover:border-slate-400'
  }`;

export function Input({ error, className = '', ...rest }) {
  return <input className={`${inputCls(error)} ${className}`} {...rest} />;
}

export function Select({ error, className = '', children, ...rest }) {
  return (
    <select className={`${inputCls(error)} ${className} cursor-pointer`} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ error, className = '', rows = 3, ...rest }) {
  return (
    <textarea
      rows={rows}
      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 ${
        error ? 'border-red-400' : 'border-slate-300 hover:border-slate-400'
      } ${className}`}
      {...rest}
    />
  );
}

/* ── Card ───────────────────────────────────────────────────────────── */
export function Card({ title, action, className = '', children }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/70 shadow-card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ── Badge ──────────────────────────────────────────────────────────── */
const badgeTones = {
  green: 'bg-emerald-50 text-emerald-600 ring-emerald-500/15',
  red: 'bg-rose-50 text-rose-500 ring-rose-400/15',
  yellow: 'bg-amber-50 text-amber-600 ring-amber-400/15',
  blue: 'bg-sky-50 text-sky-600 ring-sky-400/15',
  gray: 'bg-slate-100 text-slate-500 ring-slate-400/15',
  indigo: 'bg-brand-50 text-brand-600 ring-brand-500/15',
};
export function Badge({ tone = 'gray', children }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ring-1 ring-inset ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

/** Map any status string to a sensible tone. */
export function StatusBadge({ status }) {
  const tones = {
    paid: 'green', resolved: 'green', active: 'green', checked_in: 'green', occupied: 'green', success: 'green',
    pending: 'yellow', expected: 'yellow', partially_occupied: 'yellow', in_progress: 'blue', assigned: 'blue',
    overdue: 'red', rejected: 'red', failed: 'red', inactive: 'gray', moved_out: 'gray', maintenance: 'red',
    vacant: 'gray', checked_out: 'gray', urgent: 'red', high: 'red', medium: 'yellow', low: 'gray',
    important: 'yellow', normal: 'gray',
  };
  const tone = tones[status] || 'gray';
  const dot = { green: 'bg-emerald-400', red: 'bg-rose-400', yellow: 'bg-amber-400', blue: 'bg-sky-400', gray: 'bg-slate-300', indigo: 'bg-brand-400' }[tone];
  return (
    <Badge tone={tone}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {String(status || '—').replace(/_/g, ' ')}
    </Badge>
  );
}

/* ── Modal ──────────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
          <motion.div
            className={`relative bg-white rounded-3xl shadow-pop w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto scrollbar-thin`}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur rounded-t-3xl z-10">
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              <button onClick={onClose} className="w-8 h-8 -mr-1 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Confirmation dialog */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = true, loading }) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${danger ? 'bg-red-50' : 'bg-amber-50'}`}>
          <AlertTriangle className={`w-5 h-5 ${danger ? 'text-red-500' : 'text-amber-500'}`} />
        </div>
        <p className="text-sm text-slate-600 pt-2">{message}</p>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ── Drawer (slide-over quick-view) ─────────────────────────────────── */
export function Drawer({ open, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
          <motion.aside
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-pop flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900 truncate">{title}</h3>
                {subtitle && <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="w-8 h-8 -mr-1 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">{children}</div>
            {footer && <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/60">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Label/value row for use inside a Drawer. */
export function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-900 text-right min-w-0 break-words">{children}</span>
    </div>
  );
}

/* ── States ─────────────────────────────────────────────────────────── */
export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-7 h-7 animate-spin mb-3 text-brand-500" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Shimmer placeholder for loading states (feels faster than a spinner). */
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 ring-1 ring-slate-200/70 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {message && <p className="text-xs text-slate-400 mt-1 max-w-xs">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ── Stat card (dashboards) ─────────────────────────────────────────── */
export function StatCard({ icon: Icon, label, value, sub, tone = 'indigo' }) {
  // Minimal monochrome: navy-tint tiles. Colour lives only in status badges.
  const tile = 'bg-brand-50 text-brand-600';
  const tones = { indigo: tile, green: tile, red: tile, amber: tile, blue: tile };
  return (
    <motion.div
      className="group bg-white rounded-2xl border border-slate-200/70 shadow-card hover:shadow-soft p-5 flex items-start gap-4"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${tones[tone]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-[26px] leading-tight font-bold text-slate-900 mt-1 truncate tracking-tight tabular-nums">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

/* ── Table ──────────────────────────────────────────────────────────── */
/**
 * Rows passed as <TableRow> cascade in (staggered). Plain <tr> children still
 * work and simply render without animation — fully backward compatible.
 */
export function Table({ headers, children }) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
            {headers.map((h) => (
              <th key={h} className="py-3 px-3 font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <motion.tbody
          className="divide-y divide-slate-100 [&>tr]:transition-colors [&>tr:hover]:bg-slate-50/70"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {children}
        </motion.tbody>
      </table>
    </div>
  );
}

export const Td = ({ className = '', children }) => (
  <td className={`py-3 px-3 align-middle text-slate-600 ${className}`}>{children}</td>
);

/* ── Pagination ─────────────────────────────────────────────────────── */
/**
 * Client-side pagination helper. Slices `items` into pages of `pageSize` and
 * keeps the current page valid as the list grows or shrinks (e.g. filtering).
 */
export function usePagination(items, pageSize = 10) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // Clamp the page whenever the filtered list changes size.
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );
  return { page, setPage, totalPages, pageItems, total, pageSize };
}

export function Pagination({ page, totalPages, total, pageSize, onPage, className = '' }) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 pt-4 mt-1 ${className}`}>
      <p className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{from}–{to}</span> of{' '}
        <span className="font-semibold text-slate-700">{total}</span>
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <span className="px-2 text-xs font-medium text-slate-500 tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Avatar ─────────────────────────────────────────────────────────── */
export function Avatar({ name, size = 'md', className = '' }) {
  const sizes = { xs: 'w-7 h-7 text-[10px]', sm: 'w-8 h-8 text-[11px]', md: 'w-9 h-9 text-xs', lg: 'w-12 h-12 text-sm' };
  const initials = (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white font-bold flex items-center justify-center shrink-0 ${className}`}>
      {initials}
    </div>
  );
}

/* ── Progress bar (occupancy, completion, reliability …) ────────────── */
export function ProgressBar({ value = 0, max = 100, tone = 'brand', className = '' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  const tones = { brand: 'bg-brand-500', green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', slate: 'bg-slate-400', blue: 'bg-blue-500' };
  return (
    <div className={`h-1.5 w-full rounded-full bg-slate-100 overflow-hidden ${className}`}>
      <div className={`h-full rounded-full transition-all duration-500 ${tones[tone] || tones.brand}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── Page header ────────────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── Money + dates ──────────────────────────────────────────────────── */
export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
