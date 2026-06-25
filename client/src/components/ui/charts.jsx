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
  occupancy: { Occupied: '#243047', Partial: '#f59e0b', Vacant: '#cbd5e1', Maintenance: '#9ca3af' },
};

export const axisTick = { fontSize: 12, fill: 'var(--chart-axis)' };
export const gridProps = { strokeDasharray: '3 3', stroke: 'var(--chart-grid)', vertical: false };

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
