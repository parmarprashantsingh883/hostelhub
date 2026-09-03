/**
 * Shared chart theme — every recharts visual in the app pulls colours, axis and
 * tooltip styling from here so the data-viz reads as one crimson system.
 */
import { inr } from './index.jsx';

// Colours are CSS variables (defined in index.css with .dark overrides) so the
// SVG charts re-theme instantly when dark mode toggles — no re-render needed.
export const CHART = {
  primary: 'var(--chart-line)',
  primarySoft: 'var(--chart-fill)',
  primaryFaint: 'var(--chart-faint)',
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  // Categorical series — navy-anchored, cohesive.
  series: ['var(--chart-line)', '#6e8099', '#f59e0b', '#0ea5e9', '#64748b', '#14b8a6'],
  // Occupancy semantics
  occupancy: { Occupied: '#2563eb', Partial: '#f59e0b', Vacant: '#cbd5e1', Maintenance: '#9ca3af' },
};

export const axisTick = { fontSize: 12, fill: 'var(--chart-axis)' };
export const gridProps = { strokeDasharray: '3 3', stroke: 'var(--chart-grid)', vertical: false };

/**
 * Sparkbars — the KPI mini bar-chart (the MSBC-dashboard signature). Pure CSS
 * bars, no recharts weight. Normalizes `data` to the tallest value; recent bars
 * render at full opacity, earlier ones fade back so the row reads as a trend.
 * Pass an explicit `color` (a real CSS color, e.g. '#f97316'); it drives both.
 */
export function Sparkbars({ data = [], color = '#f97316', bars = 22, className = '' }) {
  // Right-align to `bars` slots; pad short series with leading zeros.
  const series = data.length >= bars ? data.slice(-bars) : [...Array(bars - data.length).fill(0), ...data];
  const max = Math.max(1, ...series);
  return (
    <div className={`flex items-end gap-[2px] h-8 ${className}`} aria-hidden="true">
      {series.map((v, i) => {
        const h = Math.max(8, Math.round((v / max) * 100)); // floor so empty bars still read as a baseline
        const recent = i >= bars - 5;
        return (
          <span
            key={i}
            className="flex-1 rounded-[2px]"
            style={{ height: `${h}%`, backgroundColor: color, opacity: v === 0 ? 0.14 : recent ? 1 : 0.4 }}
          />
        );
      })}
    </div>
  );
}

/** Delta pill — the small +/- % change badge next to a KPI. */
export function Delta({ value, className = '' }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums ${
        up
          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'
          : 'bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300'
      } ${className}`}
    >
      {up ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  );
}

/** Dark emerald tooltip used across charts. `money` formats values as ₹. */
export function BrandTooltip({ active, payload, label, money = false }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-brand-900 text-white text-xs px-3 py-2 shadow-pop">
      {label != null && <p className="font-semibold">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-slate-200">
          {p.name ? `${p.name}: ` : ''}{money ? inr(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}
