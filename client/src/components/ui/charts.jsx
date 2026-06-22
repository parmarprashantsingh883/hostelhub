/**
 * Shared chart theme — every recharts visual in the app pulls colours, axis and
 * tooltip styling from here so the data-viz reads as one crimson system.
 */
import { inr } from './index.jsx';

export const CHART = {
  primary: '#ea5e3c',      // brand-600 (crimson)
  primarySoft: '#ef6f4f',  // brand-500
  primaryFaint: '#fdccbf', // brand-200
  grid: '#efe9e3',
  axis: '#94a3b8',
  // Categorical series — crimson-anchored, cohesive.
  series: ['#ea5e3c', '#f4805f', '#f59e0b', '#0ea5e9', '#64748b', '#14b8a6'],
  // Occupancy semantics
  occupancy: { Occupied: '#ea5e3c', Partial: '#f59e0b', Vacant: '#cbd5e1', Maintenance: '#9ca3af' },
};

export const axisTick = { fontSize: 12, fill: CHART.axis };
export const gridProps = { strokeDasharray: '3 3', stroke: CHART.grid, vertical: false };

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
