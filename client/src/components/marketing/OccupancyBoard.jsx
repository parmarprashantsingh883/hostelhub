import { motion, useReducedMotion } from 'framer-motion';

/**
 * The product's thesis, as a visual: a front-desk room board.
 * Each cell is a numbered room; fill encodes status (occupied / vacant /
 * cleaning), a few rooms "settled today" pulse. This is what HostelHub runs.
 */
const ROOMS = [
  { n: 201, s: 'occ' }, { n: 202, s: 'hot' }, { n: 203, s: 'occ' }, { n: 204, s: 'vac' }, { n: 205, s: 'occ' },
  { n: 206, s: 'occ' }, { n: 207, s: 'mnt' }, { n: 208, s: 'occ' }, { n: 209, s: 'hot' }, { n: 210, s: 'occ' },
  { n: 211, s: 'occ' }, { n: 212, s: 'vac' }, { n: 213, s: 'occ' }, { n: 214, s: 'occ' }, { n: 215, s: 'hot' },
  { n: 216, s: 'occ' }, { n: 217, s: 'occ' }, { n: 218, s: 'occ' }, { n: 219, s: 'vac' }, { n: 220, s: 'occ' },
];

const CELL = {
  occ: 'bg-brand-50 text-brand-700 ring-1 ring-brand-100',
  hot: 'bg-brand-600 text-white ring-1 ring-brand-600 shadow-[0_8px_18px_-8px_rgba(36,48,71,0.7)]',
  vac: 'bg-white text-slate-300 border border-dashed border-slate-300',
  mnt: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.025, delayChildren: 0.1 } } };
const cell = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 420, damping: 24 } },
};

function Swatch({ className, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-[4px] ${className}`} />
      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">{label}</span>
    </span>
  );
}

export default function OccupancyBoard() {
  const reduce = useReducedMotion();
  const occupied = ROOMS.filter((r) => r.s === 'occ' || r.s === 'hot').length;
  const capacity = ROOMS.filter((r) => r.s !== 'mnt').length;
  const pct = Math.round((occupied / capacity) * 100);

  return (
    <div className="rounded-[1.75rem] bg-white p-5 sm:p-6 shadow-pop ring-1 ring-night-900/5">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">Live occupancy</p>
          <p className="mt-1 text-[15px] font-semibold text-slate-900">Floor 2 · West wing</p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-semibold leading-none text-brand-600 tabular-nums">{pct}%</p>
          <p className="mt-1 flex items-center justify-end gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
            <span className="relative flex h-1.5 w-1.5">
              {!reduce && <span className="absolute inset-0 animate-ping rounded-full bg-brand-400 opacity-75" />}
              <span className="relative h-1.5 w-1.5 rounded-full bg-brand-500" />
            </span>
            full
          </p>
        </div>
      </div>

      <motion.div
        className="mt-5 grid grid-cols-5 gap-2.5"
        variants={reduce ? undefined : container}
        initial={reduce ? false : 'hidden'}
        whileInView="show"
        viewport={{ once: true }}
      >
        {ROOMS.map((r) => (
          <motion.div
            key={r.n}
            variants={reduce ? undefined : cell}
            className={`relative flex h-14 items-center justify-center rounded-xl font-mono text-[12px] font-medium ${CELL[r.s]}`}
          >
            {r.n}
            {r.s === 'hot' && (
              <span className="absolute right-1.5 top-1.5 flex h-1.5 w-1.5">
                {!reduce && <span className="absolute inset-0 animate-ping rounded-full bg-amber-300 opacity-80" />}
                <span className="relative h-1.5 w-1.5 rounded-full bg-amber-300" />
              </span>
            )}
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4">
        <Swatch className="bg-brand-100 ring-1 ring-brand-200" label="Occupied" />
        <Swatch className="bg-white border border-dashed border-slate-300" label="Vacant" />
        <Swatch className="bg-amber-100 ring-1 ring-amber-200" label="Cleaning" />
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-slate-400">{occupied}/{capacity} beds</span>
      </div>
    </div>
  );
}
