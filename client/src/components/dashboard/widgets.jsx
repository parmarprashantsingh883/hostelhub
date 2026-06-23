import { ResponsiveContainer, AreaChart, Area } from 'recharts';

const ARC = { brand: '#ea5e3c', green: '#10b981', amber: '#f59e0b', blue: '#3b82f6' };

/** SVG progress donut with a centered value. Works on light or dark cards. */
export function StatDonut({ value = 0, unit = '%', size = 140, stroke = 13, tone = 'brand', track = '#efe9e3', centerClass = 'text-slate-900', subClass = 'text-slate-400', label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ARC[tone]} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display text-[28px] font-semibold leading-none tabular-nums ${centerClass}`}>
          {Math.round(value)}<span className="text-base align-top">{unit}</span>
        </span>
        {label && <span className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${subClass}`}>{label}</span>}
      </div>
    </div>
  );
}

/** Tiny filled area chart — for "trend at a glance" cards. */
export function Sparkline({ data, dataKey = 'revenue', color = '#ea5e3c', height = 56, id = 'spark' }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#${id})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Stacked proportion bar with a legend (occupancy, status mix…). */
export function SegmentBar({ segments }) {
  const sum = segments.reduce((a, s) => a + (s.value || 0), 0) || 1;
  return (
    <div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100">
        {segments.map((s, i) => s.value > 0 && (
          <div key={i} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(s.value / sum) * 100}%`, background: s.color }} />
        ))}
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2">
        {segments.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2.5 w-2.5 rounded-[4px]" style={{ background: s.color }} />
            {s.label}
            <span className="ml-auto font-semibold tabular-nums text-slate-700">{s.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
