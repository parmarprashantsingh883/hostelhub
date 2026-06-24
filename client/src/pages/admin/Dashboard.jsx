import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, DoorOpen, BedDouble, Home, Banknote, Clock, Wrench, ClipboardList,
  Plus, CalendarPlus, Megaphone, AlertTriangle, AlertCircle,
  CheckCircle2, ShieldCheck, UserCheck, Pin, ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { api } from '../../api/client';
import {
  Card, Skeleton, EmptyState, StatusBadge, Badge, StatCard, Avatar, Button, ProgressBar,
  inr, fmtDate,
} from '../../components/ui';
import { CHART, BrandTooltip, axisTick, gridProps } from '../../components/ui/charts';
import { StatDonut } from '../../components/dashboard/widgets';
import { useAuth } from '../../context/AuthContext';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

const QUICK_ACTIONS = [
  { label: 'Add tenant', to: '/admin/tenants', icon: Plus },
  { label: 'Generate rent', to: '/admin/rents', icon: CalendarPlus },
  { label: 'Add room', to: '/admin/rooms', icon: DoorOpen },
  { label: 'Post notice', to: '/admin/notices', icon: Megaphone },
];

function healthBand(score) {
  if (score >= 85) return { label: 'Excellent', tone: 'green' };
  if (score >= 70) return { label: 'Healthy', tone: 'blue' };
  if (score >= 55) return { label: 'Fair', tone: 'yellow' };
  return { label: 'Needs attention', tone: 'red' };
}

function MiniStat({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-900', amber: 'text-amber-600', rose: 'text-rose-500',
    emerald: 'text-emerald-600', blue: 'text-sky-600',
  };
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 px-3 py-2.5">
      <p className={`text-xl font-bold tabular-nums ${tones[tone]}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
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

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-72" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }
  if (!data) return <EmptyState title="Could not load dashboard" />;

  const { stats: s, health, pendingRent, recentNotices, recentComplaints, charts } = data;
  const firstName = user?.name?.split(' ')[0] || 'there';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' });
  const rev = charts.revenueByMonth || [];
  const collectionPct = s.monthBilled > 0 ? Math.round((s.monthCollection / s.monthBilled) * 100) : 100;
  const band = healthBand(health.score);

  // Summary cards (clickable)
  const cards = [
    { to: '/admin/tenants', icon: Users, label: 'Total tenants', value: s.totalTenants, sub: 'Active residents' },
    { to: '/admin/rooms', icon: DoorOpen, label: 'Total rooms', value: s.totalRooms, sub: `${s.occupiedBeds}/${s.totalBeds} beds` },
    { to: '/admin/rooms', icon: BedDouble, label: 'Occupied', value: s.occupiedRooms, sub: `${s.occupancyPct}% occupancy` },
    { to: '/admin/rooms', icon: Home, label: 'Vacant', value: s.vacantRooms, sub: s.maintenanceRooms ? `${s.maintenanceRooms} under upkeep` : 'Ready to fill' },
    { to: '/admin/rents', icon: Banknote, label: 'Revenue (mo)', value: inr(s.monthCollection), sub: `${collectionPct}% collected` },
    { to: '/admin/rents', icon: Clock, label: 'Pending rent', value: inr(s.monthPending), sub: `${s.unpaidCount} unpaid · ${s.overdueCount} overdue` },
    { to: '/admin/complaints', icon: Wrench, label: 'Open complaints', value: s.openComplaints, sub: `${s.highPriorityComplaints} high priority` },
    { to: '/admin/visitors', icon: ClipboardList, label: 'Visitors today', value: s.visitorsToday, sub: `${s.visitorsInside} inside now` },
  ];

  // Alerts (derived from real stats)
  const alerts = [
    s.monthPending > 0 && { icon: Banknote, tone: 'amber', text: `${inr(s.monthPending)} rent pending from ${s.unpaidCount} tenant${s.unpaidCount === 1 ? '' : 's'}`, to: '/admin/rents' },
    s.overdueCount > 0 && { icon: AlertCircle, tone: 'rose', text: `${s.overdueCount} overdue invoice${s.overdueCount === 1 ? '' : 's'} past due date`, to: '/admin/rents' },
    s.highPriorityComplaints > 0 && { icon: AlertTriangle, tone: 'rose', text: `${s.highPriorityComplaints} high-priority complaint${s.highPriorityComplaints === 1 ? '' : 's'} open`, to: '/admin/complaints' },
    s.vacantRooms > 0 && { icon: Home, tone: 'amber', text: `${s.vacantRooms} vacant room${s.vacantRooms === 1 ? '' : 's'} to fill`, to: '/admin/rooms' },
    s.maintenanceRooms > 0 && { icon: Wrench, tone: 'slate', text: `${s.maintenanceRooms} room${s.maintenanceRooms === 1 ? '' : 's'} under maintenance`, to: '/admin/rooms' },
    s.visitorsInside > 0 && { icon: UserCheck, tone: 'amber', text: `${s.visitorsInside} visitor${s.visitorsInside === 1 ? '' : 's'} still inside (not checked out)`, to: '/admin/visitors' },
    s.avgFoodRating != null && s.avgFoodRating < 3 && { icon: AlertTriangle, tone: 'rose', text: `Low food rating (${s.avgFoodRating}/5)`, to: '/admin/food-menu' },
  ].filter(Boolean);

  const alertTone = { amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-500', slate: 'bg-slate-100 text-slate-500' };

  return (
    <div className="space-y-5">
      {/* ── Header + quick actions ───────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">{dateStr} <span className="text-slate-300">·</span> updated just now</p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-slate-900">{greeting()}, {firstName} 👋</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_ACTIONS.map((a, i) => (
            <Link key={a.label} to={a.to}>
              <Button variant={i === 0 ? 'primary' : 'secondary'} size="sm"><a.icon className="h-4 w-4" /> {a.label}</Button>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Summary cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="block rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20">
            <StatCard icon={c.icon} label={c.label} value={c.value} sub={c.sub} />
          </Link>
        ))}
      </div>

      {/* ── Health score + revenue ───────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="PG Health Score">
          <div className="flex flex-col items-center">
            <StatDonut value={health.score} unit="" size={150} stroke={14} label={band.label} />
            <Badge tone={band.tone}>{band.label} · {health.score}/100</Badge>
          </div>
          <div className="mt-5 space-y-3">
            {health.breakdown.map((b) => (
              <div key={b.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{b.key}</span>
                  <span className="font-semibold tabular-nums text-slate-700">{b.pct}%</span>
                </div>
                <ProgressBar value={b.pct} />
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Revenue"
          className="lg:col-span-2"
          action={<Link to="/admin/rents" className="font-mono text-[10px] uppercase tracking-wider text-brand-600 hover:text-brand-700">View rents</Link>}
        >
          {/* paid vs unpaid chips */}
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-600">{charts.paidVsUnpaid?.[0]?.value || 0} paid</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 font-semibold text-rose-500">{charts.paidVsUnpaid?.[1]?.value || 0} unpaid</span>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700">{collectionPct}% collected</span>
          </div>
          {rev.length ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rev} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
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
          ) : <EmptyState title="No payments yet" message="Revenue appears once rents are paid." />}
        </Card>
      </div>

      {/* ── Alerts + pending rent ────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Alerts & reminders" action={<span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-500">{alerts.length}</span>}>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-3 py-6">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-slate-800">All clear</p>
                <p className="text-xs text-slate-400">No pending issues need your attention.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {alerts.map((a, i) => (
                <Link key={i} to={a.to} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${alertTone[a.tone]}`}><a.icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1 text-sm text-slate-700">{a.text}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="Pending rent" action={<Link to="/admin/rents" className="font-mono text-[10px] uppercase tracking-wider text-brand-600 hover:text-brand-700">Manage</Link>}>
          {pendingRent.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All rent collected" message="No outstanding dues this month." />
          ) : (
            <div className="space-y-1">
              {pendingRent.map((r) => (
                <div key={r._id} className="flex items-center gap-3 py-1.5">
                  <Avatar name={r.tenant} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{r.tenant}</p>
                    <p className="text-xs text-slate-400">{r.room ? `Room ${r.room}` : 'No room'} · due {fmtDate(r.dueDate)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                  <span className="w-20 text-right text-sm font-semibold tabular-nums text-slate-900">{inr(r.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Complaints + visitors ────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Complaints" action={<Link to="/admin/complaints" className="font-mono text-[10px] uppercase tracking-wider text-brand-600 hover:text-brand-700">View all</Link>}>
          <div className="mb-4 grid grid-cols-4 gap-2.5">
            <MiniStat label="Open" value={s.openComplaints} tone="amber" />
            <MiniStat label="In progress" value={s.inProgressComplaints} tone="blue" />
            <MiniStat label="Resolved" value={s.resolvedComplaints} tone="emerald" />
            <MiniStat label="High" value={s.highPriorityComplaints} tone="rose" />
          </div>
          {recentComplaints.length === 0 ? (
            <EmptyState icon={Wrench} title="No complaints" />
          ) : (
            <div className="space-y-1">
              {recentComplaints.slice(0, 4).map((c) => (
                <div key={c._id} className="flex items-center justify-between gap-2 py-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{c.title}</p>
                    <p className="truncate text-xs capitalize text-slate-400">{c.tenantId?.name || '—'} · {c.category}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Visitors" action={<Link to="/admin/visitors" className="font-mono text-[10px] uppercase tracking-wider text-brand-600 hover:text-brand-700">Visitor log</Link>}>
          <div className="grid grid-cols-3 gap-2.5">
            <MiniStat label="Today" value={s.visitorsToday} />
            <MiniStat label="Inside now" value={s.visitorsInside} tone="emerald" />
            <MiniStat label="Pending" value={s.visitorsPending} tone="amber" />
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-xl bg-brand-50 px-3.5 py-3 ring-1 ring-brand-600/10">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <p className="text-xs leading-relaxed text-slate-600">
              {s.visitorsInside === 0
                ? 'Everyone has checked out — no visitors are currently inside the premises.'
                : `${s.visitorsInside} visitor${s.visitorsInside === 1 ? ' is' : 's are'} currently inside. Check them out on exit to keep the log accurate.`}
            </p>
          </div>
        </Card>
      </div>

      {/* ── Notice board ─────────────────────────────────── */}
      <Card title="Notice board" action={<Link to="/admin/notices" className="font-mono text-[10px] uppercase tracking-wider text-brand-600 hover:text-brand-700">Manage notices</Link>}>
        {recentNotices.length === 0 ? (
          <EmptyState icon={Megaphone} title="No notices yet" message="Post your first notice for residents." action={<Link to="/admin/notices"><Button size="sm"><Plus className="h-4 w-4" /> Post notice</Button></Link>} />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {recentNotices.map((n) => (
              <div key={n._id} className="flex items-start gap-3 rounded-xl border border-slate-200/70 px-3.5 py-3">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.priority === 'urgent' ? 'bg-rose-50 text-rose-500' : 'bg-brand-50 text-brand-600'}`}>
                  {n.isPinned ? <Pin className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{n.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge tone={n.priority === 'urgent' ? 'red' : 'gray'}>{n.category}</Badge>
                    <span className="text-[11px] text-slate-400">{fmtDate(n.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
