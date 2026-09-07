import { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

const ARC = { brand: 'var(--ring-brand)', green: '#10b981', amber: '#f59e0b', blue: '#3b82f6' };

/**
 * Multi-segment donut — the "status breakdown" ring. `segments` is
 * [{ label, value, color }]; renders each as an arc, with a big total + label
 * in the centre. Pair it with a <SegmentLegend> for the count/percent list.
 */
export function SegmentDonut({ segments = [], size = 168, stroke = 16, centerLabel = 'TOTAL' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const sum = segments.reduce((s, seg) => s + (seg.value || 0), 0);

  const [grow, setGrow] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setGrow(1)); return () => cancelAnimationFrame(id); }, [sum]);

  // Chain each non-empty segment clockwise from the top (svg is -rotate-90).
  let acc = 0;
  const arcs = segments.filter((s) => s.value > 0).map((seg) => {
    const len = sum ? (seg.value / sum) * c : 0;
    const arc = { color: seg.color, len: len * grow, off: -acc * grow };
    acc += len;
    return arc;
  });

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        {arcs.map((a, i) => (
          <circle
            key={i}
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={a.color} strokeWidth={stroke}
            strokeDasharray={`${a.len} ${c - a.len}`} strokeDashoffset={a.off}
            style={{ transition: 'stroke-dasharray .9s cubic-bezier(.16,1,.3,1), stroke-dashoffset .9s cubic-bezier(.16,1,.3,1)' }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[36px] font-semibold leading-none tabular-nums text-slate-900 dark:text-white">{sum}</span>
        <span className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">{centerLabel}</span>
      </div>
    </div>
  );
}

/** The legend rows beside a SegmentDonut: colored dot · label · count · percent. */
export function SegmentLegend({ segments = [] }) {
  const sum = segments.reduce((s, seg) => s + (seg.value || 0), 0) || 1;
  return (
    <div className="flex-1 divide-y divide-slate-100 dark:divide-white/10">
      {segments.map((seg) => (
        <div key={seg.label} className="flex items-center gap-3 py-2.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: seg.color }} />
          <span className="flex-1 text-sm text-slate-600 dark:text-slate-300">{seg.label}</span>
          <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{seg.value}</span>
          <span className="w-12 text-right text-xs tabular-nums text-slate-400">{Math.round((seg.value / sum) * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

/**
 * SVG progress donut with a centered value. `color` overrides the tone palette
 * with an explicit stroke (e.g. a semantic health color) and adds a soft glow.
 */
export function StatDonut({ value = 0, unit = '%', size = 140, stroke = 13, tone = 'brand', color, track = 'var(--ring-track)', centerClass = 'text-slate-900 dark:text-white', subClass = 'text-slate-400', label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const arcColor = color || ARC[tone];
  // Draw the arc in on mount for a premium feel.
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  const dash = (drawn / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={arcColor} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.16, 1, 0.3, 1)', filter: `drop-shadow(0 0 5px ${arcColor}55)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display text-[32px] font-semibold leading-none tabular-nums ${centerClass}`}>
          {Math.round(value)}<span className="text-base align-top">{unit}</span>
        </span>
        {label && <span className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${subClass}`}>{label}</span>}
      </div>
    </div>
  );
}

/** Tiny filled area chart — for "trend at a glance" cards. */
export function Sparkline({ data, dataKey = 'revenue', color = 'var(--chart-line)', height = 56, id = 'spark' }) {
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
