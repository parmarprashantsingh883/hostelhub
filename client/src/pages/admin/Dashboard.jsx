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
import { StatDonut, SegmentDonut, SegmentLegend } from '../../components/dashboard/widgets';
import CashflowChart from '../../components/dashboard/CashflowChart';
import OnboardingChecklist from '../../components/dashboard/OnboardingChecklist';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
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
  if (score >= 85) return { label: 'Excellent', tone: 'green', color: '#10b981' };
  if (score >= 70) return { label: 'Healthy', tone: 'green', color: '#10b981' };
  if (score >= 55) return { label: 'Fair', tone: 'yellow', color: '#f59e0b' };
  return { label: 'Needs attention', tone: 'red', color: '#ef4444' };
}

// Semantic color for a single health factor (good ≥80 · watch 60–79 · low <60).
function factorTone(pct) {
  if (pct >= 80) return { bar: '#10b981', text: 'text-emerald-600 dark:text-emerald-400', chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' };
  if (pct >= 60) return { bar: '#f59e0b', text: 'text-amber-600 dark:text-amber-400', chip: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' };
  return { bar: '#ef4444', text: 'text-rose-500 dark:text-rose-400', chip: 'bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300' };
}

function MiniStat({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-900 dark:text-white', amber: 'text-amber-600 dark:text-amber-300', rose: 'text-rose-500 dark:text-rose-300',
    emerald: 'text-emerald-600 dark:text-emerald-300', blue: 'text-sky-600 dark:text-sky-300',
  };
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
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

  const { stats: s, health, pendingRent, recentNotices, recentComplaints, charts, sparks = {}, cashflow = { in: [], out: [] } } = data;
  const firstName = user?.name?.split(' ')[0] || 'there';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' });
  const rev = charts.revenueByMonth || [];
  const collectionPct = s.monthBilled > 0 ? Math.round((s.monthCollection / s.monthBilled) * 100) : 100;
  const band = healthBand(health.score);

  // Room status breakdown for the "Where they are now." donut.
  const roomStatus = [
    { label: 'Occupied', value: s.occupiedRooms || 0, color: '#0d9488' },
    { label: 'Partially filled', value: s.partialRooms || 0, color: '#f59e0b' },
    { label: 'Vacant', value: s.vacantRooms || 0, color: '#94a3b8' },
    { label: 'Maintenance', value: s.maintenanceRooms || 0, color: '#52525b' },
  ].filter((seg) => seg.value > 0);

  // Real revenue trend for the hero card's sparkline + month-over-month delta.
  const revSeries = rev.map((r) => r.revenue);
  const revDelta = rev.length >= 2 && rev[rev.length - 2].revenue > 0
    ? Math.round(((rev[rev.length - 1].revenue - rev[rev.length - 2].revenue) / rev[rev.length - 2].revenue) * 100)
    : null;

  // Sparkline series (real 8-week activity from the API) + per-metric colors.
  // Structural point-in-time metrics (rooms/occupied/vacant) carry no trend.
  const hasSeries = (a) => Array.isArray(a) && a.some((n) => n > 0);

  // Summary cards (clickable)
  const cards = [
    { to: '/admin/tenants', icon: Users, label: 'Total tenants', value: s.totalTenants, sub: 'Active residents', series: hasSeries(sparks.tenants) ? sparks.tenants : null, spark: '#0d9488' },
    { to: '/admin/rooms', icon: DoorOpen, label: 'Total rooms', value: s.totalRooms, sub: `${s.occupiedBeds}/${s.totalBeds} beds` },
    { to: '/admin/rooms', icon: BedDouble, label: 'Occupied', value: s.occupiedRooms, sub: `${s.occupancyPct}% occupancy` },
    { to: '/admin/rooms', icon: Home, label: 'Vacant', value: s.vacantRooms, sub: s.maintenanceRooms ? `${s.maintenanceRooms} under upkeep` : 'Ready to fill' },
    { to: '/admin/rents', icon: Banknote, label: 'Revenue (mo)', value: inr(s.monthCollection), sub: `${collectionPct}% collected`, accent: true, series: revSeries.length ? revSeries : null, spark: '#fb923c', delta: revDelta },
    { to: '/admin/rents', icon: Clock, label: 'Pending rent', value: inr(s.monthPending), sub: `${s.unpaidCount} unpaid · ${s.overdueCount} overdue`, tone: 'ember', series: hasSeries(sparks.rents) ? sparks.rents : null, spark: '#6366f1' },
    { to: '/admin/complaints', icon: Wrench, label: 'Open complaints', value: s.openComplaints, sub: `${s.highPriorityComplaints} high priority`, series: hasSeries(sparks.complaints) ? sparks.complaints : null, spark: '#f43f5e' },
    { to: '/admin/visitors', icon: ClipboardList, label: 'Visitors today', value: s.visitorsToday, sub: `${s.visitorsInside} inside now`, series: hasSeries(sparks.visitors) ? sparks.visitors : null, spark: '#0ea5e9' },
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

  const alertTone = { amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300', rose: 'bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300', slate: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300' };

  return (
    <div className="space-y-5">
      {/* ── Header + quick actions ───────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">{dateStr} <span className="text-slate-300">·</span> updated just now</p>
          <h1 className="mt-1.5 text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">{greeting()}, <span className="font-display font-medium italic text-brand-600 dark:text-brand-400">{firstName}</span>.</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_ACTIONS.map((a, i) => (
            <Link key={a.label} to={a.to}>
              <Button variant={i === 0 ? 'primary' : 'secondary'} size="sm"><a.icon className="h-4 w-4" /> {a.label}</Button>
            </Link>
          ))}
        </div>
      </div>

      {/* ── First-run setup guide (hides itself once complete) ── */}
      <OnboardingChecklist />

      {/* ── Summary cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="block rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20">
            <StatCard icon={c.icon} label={c.label} value={c.value} sub={c.sub} accent={c.accent} tone={c.tone} series={c.series} spark={c.spark} delta={c.delta} />
          </Link>
        ))}
      </div>

      {/* ── Health score + revenue ───────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="PG Health Score">
          <div className="flex flex-col items-center">
            <StatDonut value={health.score} unit="" size={158} stroke={13} color={band.color} label={band.label} />
            <Badge tone={band.tone}>{band.label} · {health.score}/100</Badge>
          </div>

          {/* Auto-derived insight: call out the weakest factor (or celebrate). */}
          {(() => {
            const weakest = [...health.breakdown].sort((a, b) => a.pct - b.pct)[0];
            const t = factorTone(weakest.pct);
            return weakest.pct < 80 ? (
              <div className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${t.chip}`}>
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span><b>{weakest.key}</b> is dragging your score — {weakest.pct}%</span>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Every factor is in good shape.
              </div>
            );
          })()}

          {/* Factor breakdown — semantic colors + weight chip + 80% target tick. */}
          <div className="mt-5 space-y-3.5">
            {health.breakdown.map((b) => {
              const t = factorTone(b.pct);
              return (
                <div key={b.key}>
                  <div className="mb-1.5 flex items-center gap-2 text-xs">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: t.bar }} />
                    <span className="text-slate-600 dark:text-slate-300">{b.key}</span>
                    <span className="rounded bg-slate-100 px-1 py-px font-mono text-[9px] font-medium text-slate-400 dark:bg-white/10 dark:text-slate-500">{b.weight}%</span>
                    <span className={`ml-auto font-semibold tabular-nums ${t.text}`}>{b.pct}%</span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${b.pct}%`, background: t.bar }} />
                    {/* target tick at 80% */}
                    <span className="absolute top-0 h-full w-px bg-slate-300/70 dark:bg-white/20" style={{ left: '80%' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[10.5px] text-slate-400">Bars vs the 80% target line · weight = impact on score</p>
        </Card>

        <div className="lg:col-span-2">
          <CashflowChart inEvents={cashflow.in} outEvents={cashflow.out} />
        </div>
      </div>

      {/* ── Room status breakdown ────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-card dark:bg-surface dark:border-white/10 dark:shadow-none">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Rooms</p>
        <h3 className="mt-0.5 font-display text-xl italic text-slate-900 dark:text-white">Where they are now.</h3>
        {roomStatus.length ? (
          <div className="mt-4 flex flex-col items-center gap-8 sm:flex-row sm:gap-12">
            <SegmentDonut segments={roomStatus} centerLabel="Total rooms" />
            <SegmentLegend segments={roomStatus} />
          </div>
        ) : (
          <EmptyState title="No rooms yet" message="Add rooms to see the occupancy breakdown." />
        )}
      </div>

      {/* ── Alerts + pending rent ────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Alerts & reminders" action={<span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-500">{alerts.length}</span>}>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-3 py-6">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">All clear</p>
                <p className="text-xs text-slate-400">No pending issues need your attention.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {alerts.map((a, i) => (
                <Link key={i} to={a.to} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${alertTone[a.tone]}`}><a.icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200">{a.text}</span>
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
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{r.tenant}</p>
                    <p className="text-xs text-slate-400">{r.room ? `Room ${r.room}` : 'No room'} · due {fmtDate(r.dueDate)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                  <span className="w-20 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{inr(r.amount)}</span>
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
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{c.title}</p>
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
          <div className="mt-5 flex items-start gap-3 rounded-xl bg-brand-50 px-3.5 py-3 ring-1 ring-brand-600/10 dark:bg-brand-500/10 dark:ring-white/10">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {s.visitorsInside === 0
                ? 'Everyone has checked out — no visitors are currently inside the premises.'
                : `${s.visitorsInside} visitor${s.visitorsInside === 1 ? ' is' : 's are'} currently inside. Check them out on exit to keep the log accurate.`}
            </p>
          </div>
        </Card>
      </div>

      {/* ── Recent activity + Notice board ───────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ActivityFeed />

      <Card title="Notice board" action={<Link to="/admin/notices" className="font-mono text-[10px] uppercase tracking-wider text-brand-600 hover:text-brand-700">Manage notices</Link>}>
        {recentNotices.length === 0 ? (
          <EmptyState icon={Megaphone} title="No notices yet" message="Post your first notice for residents." action={<Link to="/admin/notices"><Button size="sm"><Plus className="h-4 w-4" /> Post notice</Button></Link>} />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {recentNotices.map((n) => (
              <div key={n._id} className="flex items-start gap-3 rounded-xl border border-slate-200/70 px-3.5 py-3 dark:border-white/10">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.priority === 'urgent' ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300'}`}>
                  {n.isPinned ? <Pin className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
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
    </div>
  );
}
