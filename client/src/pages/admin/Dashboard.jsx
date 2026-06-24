import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Wrench, CheckCircle2, AlertCircle, Banknote, Plus, ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { api } from '../../api/client';
import { Card, Skeleton, EmptyState, StatusBadge, Avatar, Button, inr, fmtDate } from '../../components/ui';
import { CHART, BrandTooltip, axisTick, gridProps } from '../../components/ui/charts';
import { StatDonut, SegmentBar } from '../../components/dashboard/widgets';
import { useAuth } from '../../context/AuthContext';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

function GlanceRow({ icon: Icon, tile, label, value }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tile}`}><Icon className="h-4 w-4" /></span>
      <span className="text-sm text-slate-600">{label}</span>
      <span className="ml-auto font-semibold tabular-nums text-slate-900">{value}</span>
    </div>
  );
}

/** Delta chip tuned for the dark hero surface. */
function DeltaChipDark({ pct }) {
  if (pct == null) return null;
  const up = pct >= 0;
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-white/12 px-1.5 py-0.5 text-[11px] font-semibold text-white ring-1 ring-white/15">
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/admin').then(({ data }) => setData(data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-5 lg:grid-cols-12">
          <Skeleton className="h-44 rounded-2xl lg:col-span-5" />
          <Skeleton className="h-44 rounded-2xl lg:col-span-4" />
          <Skeleton className="h-44 rounded-2xl lg:col-span-3" />
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }
  if (!data) return <EmptyState title="Could not load dashboard" />;

  const { stats, recentPayments, recentComplaints, charts } = data;
  const firstName = user?.name?.split(' ')[0] || 'there';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' });
  const rev = charts.revenueByMonth || [];
  const collectedDelta = rev.length > 1 && rev.at(-2).revenue
    ? Math.round(((rev.at(-1).revenue - rev.at(-2).revenue) / rev.at(-2).revenue) * 100)
    : null;
  const revVals = rev.map((r) => r.revenue || 0);
  const maxRev = Math.max(1, ...revVals);
  const bars = revVals.map((v) => Math.max(8, Math.round((v / maxRev) * 100)));

  return (
    <div className="space-y-5">
      {/* ── Greeting ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">{dateStr} <span className="text-slate-300">·</span> updated just now</p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-slate-900">{greeting()}, {firstName} 👋</h1>
          <p className="mt-1 text-sm text-slate-500">Here's how your property is doing today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/tenants"><Button variant="secondary"><Plus className="h-4 w-4" /> Add tenant</Button></Link>
          <Link to="/admin/rents"><Button>Generate rent <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </div>

      {/* ── Bento hero ───────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Collected — navy hero */}
        <div className="surface-hero relative flex flex-col overflow-hidden rounded-2xl p-6 text-white shadow-hero lg:col-span-5">
          <div className="pointer-events-none absolute -top-16 -right-12 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">Collected this month</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/90 ring-1 ring-white/15">
                <Banknote className="h-3 w-3" /> {MONTHS[now.getMonth()]} {now.getFullYear()}
              </span>
            </div>
            <p className="mt-3 font-display text-[2.8rem] font-semibold leading-none tracking-tight tabular-nums">{inr(stats.monthCollection)}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm text-white/60">
              <DeltaChipDark pct={collectedDelta} />
              <span>vs last month · <span className="font-medium text-white/85">{inr(stats.monthPending)}</span> pending</span>
            </div>
            <div className="mt-auto flex h-16 items-end gap-1.5 pt-6">
              {bars.length > 1 ? bars.map((h, i) => (
                <div key={i} style={{ height: `${h}%` }} className="flex-1 rounded-t bg-gradient-to-t from-white/15 to-white/60" />
              )) : <div className="h-full w-full" />}
            </div>
          </div>
        </div>

        {/* Occupancy donut */}
        <div className="flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card lg:col-span-4">
          <p className="self-start font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">Bed occupancy</p>
          <div className="my-3">
            <StatDonut value={stats.occupancyPct} size={148} stroke={14} />
          </div>
          <p className="text-sm text-slate-500"><span className="font-semibold text-slate-700">{stats.occupiedBeds}</span>/{stats.totalBeds} beds filled</p>
        </div>

        {/* Rooms breakdown */}
        <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card lg:col-span-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">Rooms</p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-slate-900">{stats.totalRooms}</p>
          <div className="mt-auto pt-5">
            <SegmentBar segments={[
              { label: 'Occupied', value: stats.occupiedRooms, color: '#243047' },
              { label: 'Partial', value: stats.partialRooms, color: '#f59e0b' },
              { label: 'Vacant', value: stats.vacantRooms, color: '#cbd5e1' },
              { label: 'Upkeep', value: stats.maintenanceRooms, color: '#9ca3af' },
            ]} />
          </div>
        </div>
      </div>

      {/* ── Revenue + at a glance ────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card
          title="Revenue"
          className="lg:col-span-2"
          action={<span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">last {charts.revenueByMonth?.length || 0} months</span>}
        >
          {charts.revenueByMonth?.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.revenueByMonth} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.primarySoft} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={CHART.primarySoft} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} width={48} />
                  <Tooltip cursor={{ stroke: CHART.primaryFaint }} content={<BrandTooltip money />} />
                  <Area type="monotone" dataKey="revenue" stroke={CHART.primary} strokeWidth={2.5} fill="url(#revFill)" dot={{ r: 3, fill: CHART.primary, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState title="No payments yet" message="Revenue appears here once rents are paid." />}
        </Card>

        <Card title="At a glance">
          <GlanceRow icon={Users} tile="bg-brand-50 text-brand-600" label="Active tenants" value={stats.totalTenants} />
          <GlanceRow icon={Wrench} tile="bg-amber-50 text-amber-600" label="Open complaints" value={stats.openComplaints} />
          <GlanceRow icon={CheckCircle2} tile="bg-emerald-50 text-emerald-600" label="Resolved" value={stats.resolvedComplaints} />
          <GlanceRow icon={AlertCircle} tile="bg-rose-50 text-rose-500" label="Pending rent" value={inr(stats.monthPending)} />
        </Card>
      </div>

      {/* ── Recent activity ──────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Recent payments" action={<Link to="/admin/rents" className="font-mono text-[10px] uppercase tracking-wider text-brand-600 hover:text-brand-700">View all</Link>}>
          {recentPayments.length === 0 ? <EmptyState title="No payments yet" /> : (
            <div className="space-y-1">
              {recentPayments.map((p) => (
                <div key={p._id} className="flex items-center gap-3 py-1.5">
                  <Avatar name={p.tenantId?.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{p.tenantId?.name || '—'}</p>
                    <p className="text-xs capitalize text-slate-400">{fmtDate(p.paidAt)} · {String(p.paymentMethod || '').replace(/_/g, ' ')}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-emerald-500">{inr(p.totalAmount)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Recent complaints" action={<Link to="/admin/complaints" className="font-mono text-[10px] uppercase tracking-wider text-brand-600 hover:text-brand-700">View all</Link>}>
          {recentComplaints.length === 0 ? <EmptyState title="No complaints yet" /> : (
            <div className="space-y-1">
              {recentComplaints.map((c) => (
                <div key={c._id} className="flex items-center justify-between gap-2 py-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{c.title}</p>
                    <p className="text-xs capitalize text-slate-400">{c.tenantId?.name || '—'} · {c.category}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
