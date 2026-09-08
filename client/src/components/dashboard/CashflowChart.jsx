import { useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { inr } from '../ui/index.jsx';

/**
 * The "Money in, money out." movement chart — modeled on the Signet dashboard.
 * A single smooth ember line = rent collected per period, with a soft gradient
 * fill and hollow dots; the dark tooltip reveals the in/out/net split on hover.
 * Daily / Weekly / Monthly re-bucket the same real events client-side.
 */
const MODES = [
  { key: 'daily', label: 'Daily', unit: 'LAST 30 DAYS' },
  { key: 'weekly', label: 'Weekly', unit: 'LAST 12 WEEKS' },
  { key: 'monthly', label: 'Monthly', unit: 'LAST 12 MONTHS' },
];

const IN = '#f97316';   // ember — money in (collected)
const OUT = '#1e293b';  // slate ink — money out (expenses)

function buildBuckets(mode) {
  const now = new Date();
  const b = [];
  if (mode === 'monthly') {
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      b.push({ start, end, label: start.toLocaleDateString('en-IN', { month: 'short' }) });
    }
  } else if (mode === 'weekly') {
    const anchor = new Date(now); anchor.setHours(23, 59, 59, 999);
    for (let i = 11; i >= 0; i--) {
      const end = new Date(anchor); end.setDate(anchor.getDate() - i * 7);
      const start = new Date(end); start.setDate(end.getDate() - 6); start.setHours(0, 0, 0, 0);
      b.push({ start, end, label: `${start.getDate()}/${start.getMonth() + 1}` });
    }
  } else {
    for (let i = 29; i >= 0; i--) {
      const start = new Date(now); start.setDate(now.getDate() - i); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setHours(23, 59, 59, 999);
      b.push({ start, end, label: `${start.getDate()}/${start.getMonth() + 1}` });
    }
  }
  return b;
}

function bucketFlow(inEvents = [], outEvents = [], mode) {
  const buckets = buildBuckets(mode);
  const rows = buckets.map((bk) => ({ label: bk.label, in: 0, out: 0 }));
  const place = (events, key) => {
    for (const ev of events) {
      const t = new Date(ev.d).getTime();
      for (let i = 0; i < buckets.length; i++) {
        if (t >= buckets[i].start.getTime() && t <= buckets[i].end.getTime()) { rows[i][key] += ev.a || 0; break; }
      }
    }
  };
  place(inEvents, 'in');
  place(outEvents, 'out');
  return rows.map((r) => ({ ...r, in: Math.round(r.in), out: Math.round(r.out), net: Math.round(r.in - r.out) }));
}

function FlowTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl bg-slate-900 px-3.5 py-2.5 text-white shadow-xl ring-1 ring-white/10">
      <p className="text-[11px] font-semibold text-white/60">{label}</p>
      <div className="mt-1.5 space-y-1 text-[12.5px]">
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: IN }} /> Collected</span>
          <span className="font-semibold tabular-nums">{inr(d.in)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400" /> Expenses</span>
          <span className="font-semibold tabular-nums">{inr(d.out)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-6 border-t border-white/10 pt-1">
          <span className="text-white/70">Net</span>
          <span className={`font-bold tabular-nums ${d.net >= 0 ? 'text-brand-300' : 'text-rose-300'}`}>{inr(d.net)}</span>
        </div>
      </div>
    </div>
  );
}

export default function CashflowChart({ inEvents = [], outEvents = [] }) {
  const [mode, setMode] = useState('monthly');
  const rows = useMemo(() => bucketFlow(inEvents, outEvents, mode), [inEvents, outEvents, mode]);
  const unit = MODES.find((m) => m.key === mode).unit;
  const empty = rows.every((r) => r.in === 0 && r.out === 0);
  // Thin the x-axis ticks so daily/weekly don't crowd.
  const tickInterval = mode === 'daily' ? 4 : mode === 'weekly' ? 1 : 0;

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-card dark:bg-surface dark:border-white/10 dark:shadow-none">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Cash flow · {unit}</p>
          <h3 className="mt-0.5 text-[22px] font-bold tracking-tight text-slate-900 dark:text-white">Money in, money out.</h3>
        </div>
        <div className="flex rounded-xl border border-zinc-200 bg-zinc-50 p-0.5 dark:border-white/10 dark:bg-white/5">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === m.key
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {empty ? (
        <div className="flex h-64 flex-col items-center justify-center text-center">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No movement in this range</p>
          <p className="mt-1 text-xs text-slate-400">Collected rent and expenses will plot here.</p>
        </div>
      ) : (
        <div className="mt-5 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={IN} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={IN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} interval={tickInterval} minTickGap={8} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)} />
              <Tooltip content={<FlowTooltip />} cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="in"
                stroke={IN}
                strokeWidth={2.5}
                fill="url(#flowFill)"
                dot={{ r: 3.5, fill: '#fff', stroke: IN, strokeWidth: 2 }}
                activeDot={{ r: 5, fill: '#fff', stroke: IN, strokeWidth: 2.5 }}
                isAnimationActive
                animationDuration={700}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend + caption */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-white/10">
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: IN }} /> Collected (in)</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: OUT }} /> Expenses (out)</span>
        </div>
        <p className="text-[11px] text-slate-400">Line = rent collected · expenses shown on hover</p>
      </div>
    </div>
  );
}
