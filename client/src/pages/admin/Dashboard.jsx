import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Wrench, CheckCircle2, AlertCircle, Banknote, Plus, ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { api } from '../../api/client';
import { Card, Spinner, EmptyState, StatusBadge, Avatar, Button, inr, fmtDate } from '../../components/ui';
import { CHART, BrandTooltip, axisTick, gridProps } from '../../components/ui/charts';
import { StatDonut, Sparkline, SegmentBar } from '../../components/dashboard/widgets';
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

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/admin').then(({ data }) => setData(data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (!data) return <EmptyState title="Could not load dashboard" />;

  const { stats, recentPayments, recentComplaints, charts } = data;
  const firstName = user?.name?.split(' ')[0] || 'there';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-5">
      {/* ── Greeting ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">{dateStr}</p>
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
        {/* Collected */}
        <div className="flex flex-col rounded-3xl border border-black/[0.04] bg-white p-6 shadow-card lg:col-span-5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">Collected this month</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
              <Banknote className="h-3 w-3" /> {MONTHS[now.getMonth()]} {now.getFullYear()}
            </span>
          </div>
          <p className="mt-3 font-display text-[2.6rem] font-semibold leading-none tracking-tight tabular-nums text-slate-900">{inr(stats.monthCollection)}</p>
          <p className="mt-2 text-sm text-slate-500">{inr(stats.monthPending)} still pending</p>
          <div className="mt-auto pt-5">
            {charts.revenueByMonth?.length > 1
              ? <Sparkline data={charts.revenueByMonth} dataKey="revenue" id="rev-spark" height={56} />
              : <div className="h-14" />}
          </div>
        </div>

        {/* Occupancy donut — bold dark card */}
        <div className="flex flex-col items-center rounded-3xl bg-night-900 p-6 text-white shadow-soft lg:col-span-4">
          <p className="self-start font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">Bed occupancy</p>
          <div className="my-3">
            <StatDonut value={stats.occupancyPct} size={148} stroke={14} track="rgba(255,255,255,0.12)" centerClass="text-white" />
          </div>
          <p className="text-sm text-white/65">{stats.occupiedBeds}/{stats.totalBeds} beds filled</p>
        </div>

        {/* Rooms breakdown */}
        <div className="flex flex-col rounded-3xl border border-black/[0.04] bg-white p-6 shadow-card lg:col-span-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">Rooms</p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-slate-900">{stats.totalRooms}</p>
          <div className="mt-auto pt-5">
            <SegmentBar segments={[
              { label: 'Occupied', value: stats.occupiedRooms, color: '#ea5e3c' },
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
          <GlanceRow icon={AlertCircle} tile="bg-red-50 text-red-600" label="Pending rent" value={inr(stats.monthPending)} />
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
                  <p className="text-sm font-semibold tabular-nums text-emerald-600">{inr(p.totalAmount)}</p>
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
