import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { BedDouble, UserPlus, Banknote } from 'lucide-react';

/**
 * Choreographed product cluster for the dark band. On scroll-into-view the
 * cards spring in one after another, then the bed grid lights up in a
 * scattered wave to ~84% — the % is derived from the dots, so the number is
 * always true to the picture. After the wave it keeps breathing (a move-out
 * here, a move-in there). Reduced motion renders the final state instantly.
 */

const TOTAL = 30;
const TARGET = 25; // ≈ 84%
// deterministic scatter — 7 is coprime with 30, so this is a full permutation
const ORDER = Array.from({ length: TOTAL }, (_, i) => (i * 7 + 4) % TOTAL);

const glass =
  'rounded-2xl bg-white/[0.07] ring-1 ring-white/15 backdrop-blur-xl shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)]';
const spring = { type: 'spring', stiffness: 130, damping: 17 };

const cardV = {
  hidden: { opacity: 0, y: 42, scale: 0.96 },
  show: (delay) => ({ opacity: 1, y: 0, scale: 1, transition: { ...spring, delay } }),
};

/** Gentle idle float, layered inside the entrance animation. */
function Float({ dur, delay = 0, children, disabled }) {
  if (disabled) return children;
  return (
    <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }}>
      {children}
    </motion.div>
  );
}

export default function OccupancyGlass() {
  const rootRef = useRef(null);
  const inView = useInView(rootRef, { once: true, margin: '-80px' });
  const reduce = useReducedMotion();
  const [lit, setLit] = useState(() => new Set());
  const [waveDone, setWaveDone] = useState(false);

  // the wave — beds light one by one once the card has landed
  useEffect(() => {
    if (!inView) return undefined;
    if (reduce) {
      setLit(new Set(ORDER.slice(0, TARGET)));
      setWaveDone(true);
      return undefined;
    }
    const timers = ORDER.slice(0, TARGET).map((bed, i) =>
      setTimeout(() => setLit((p) => new Set(p).add(bed)), 500 + i * 55),
    );
    const done = setTimeout(() => setWaveDone(true), 500 + TARGET * 55 + 500);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, [inView, reduce]);

  // after the wave: keep it alive — the odd move-out, a move-in behind it
  useEffect(() => {
    if (!waveDone || reduce) return undefined;
    const id = setInterval(() => {
      setLit((prev) => {
        const next = new Set(prev);
        if (next.size >= TARGET && Math.random() < 0.55) {
          const on = [...next];
          next.delete(on[(Math.random() * on.length) | 0]);
        } else {
          const dim = [...Array(TOTAL).keys()].filter((i) => !next.has(i));
          if (dim.length) next.add(dim[(Math.random() * dim.length) | 0]);
        }
        return next;
      });
    }, 2400);
    return () => clearInterval(id);
  }, [waveDone, reduce]);

  const pct = Math.round((lit.size / TOTAL) * 100);

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-[440px]">
      {/* Main card — the live bed grid */}
      <motion.div variants={cardV} initial="hidden" animate={inView ? 'show' : 'hidden'} custom={0} className="relative z-10">
        <Float dur={7} disabled={reduce}>
          <div className={`p-6 ${glass}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">Live occupancy</p>
                <p className="mt-1 text-sm font-semibold text-white">Floor 2 · West wing</p>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl font-semibold leading-none text-white tabular-nums">{pct}%</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-brand-300">beds filled</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-10 gap-2">
              {Array.from({ length: TOTAL }, (_, i) => (
                <span
                  key={i}
                  className={`aspect-square rounded-md transition-all duration-500 ${
                    lit.has(i)
                      ? 'scale-100 bg-brand-400 shadow-[0_0_12px_rgba(96,165,250,0.65)]'
                      : 'scale-90 bg-white/10 ring-1 ring-inset ring-white/10'
                  }`}
                />
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="flex items-center gap-2 text-xs text-slate-300">
                <BedDouble className="h-3.5 w-3.5 text-brand-300" /> {lit.size} of {TOTAL} beds
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                live
              </span>
            </div>
          </div>
        </Float>
      </motion.div>

      {/* Move-in toast — springs in second */}
      <motion.div variants={cardV} initial="hidden" animate={inView ? 'show' : 'hidden'} custom={0.45} className="absolute -right-4 -top-8 z-20 sm:-right-10">
        <Float dur={5.5} delay={0.8} disabled={reduce}>
          <div className={`flex items-center gap-2.5 px-4 py-3 ${glass}`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-300">
              <UserPlus className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-xs font-semibold text-white">Move-in confirmed</span>
              <span className="block text-[11px] text-slate-400">Bed 204·B — deposit received</span>
            </span>
          </div>
        </Float>
      </motion.div>

      {/* Rent mini-stat — springs in third */}
      <motion.div variants={cardV} initial="hidden" animate={inView ? 'show' : 'hidden'} custom={0.7} className="absolute -bottom-9 -left-4 z-20 sm:-left-10">
        <Float dur={6.5} delay={1.6} disabled={reduce}>
          <div className={`flex items-center gap-3 px-4 py-3 ${glass}`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/25 text-brand-300">
              <Banknote className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-xs font-semibold text-white">₹86,400 collected</span>
              <span className="block text-[11px] text-slate-400">this month · on autopilot</span>
            </span>
            <svg viewBox="0 0 64 20" className="ml-1 h-5 w-16 text-brand-400" fill="none" aria-hidden="true">
              <path d="M1 16 L9 13 L17 14 L25 9 L33 11 L41 6 L49 8 L57 3 L63 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="63" cy="4" r="2" fill="currentColor" />
            </svg>
          </div>
        </Float>
      </motion.div>
    </div>
  );
}
