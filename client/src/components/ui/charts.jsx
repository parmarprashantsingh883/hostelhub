/**
 * Shared chart theme — every recharts visual in the app pulls colours, axis and
 * tooltip styling from here so the data-viz reads as one emerald system
 * (previously a mix of indigo/amber that clashed with the brand).
 */
import { inr } from './index.jsx';

export const CHART = {
  primary: '#059669',      // brand-600
  primarySoft: '#10b981',  // brand-500
  primaryFaint: '#a7f3d0', // brand-200
  grid: '#eef2f7',
  axis: '#94a3b8',
  // Categorical series — emerald-anchored, cohesive (no stray indigo).
  series: ['#059669', '#34d399', '#0ea5e9', '#f59e0b', '#64748b', '#14b8a6'],
  // Occupancy semantics
  occupancy: { Occupied: '#059669', Partial: '#f59e0b', Vacant: '#cbd5e1', Maintenance: '#ef4444' },
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
