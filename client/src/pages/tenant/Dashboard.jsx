import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  Banknote, Home, Wrench, Users, CreditCard, ArrowRight, Plus, UtensilsCrossed,
  CheckCircle2, Calendar, ChevronRight, Sparkles, TrendingUp,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import { Card, Skeleton, EmptyState, StatusBadge, StatCard, inr, fmtDate } from '../../components/ui';
import { StatDonut } from '../../components/dashboard/widgets';
import { useAuth } from '../../context/AuthContext';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const M3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const QUICK = [
  { to: '/tenant/rent', label: 'Pay rent', icon: CreditCard, tone: 'from-sky-400 to-sky-500' },
  { to: '/tenant/complaints', label: 'Raise complaint', icon: Wrench, tone: 'from-amber-400 to-amber-500' },
  { to: '/tenant/visitors', label: 'Add visitor', icon: Plus, tone: 'from-cyan-400 to-sky-500' },
  { to: '/tenant/food-menu', label: 'Food menu', icon: UtensilsCrossed, tone: 'from-blue-500 to-indigo-500' },
];

// Payment-status colors, reused by the bars and the tooltip.
const RENT_STATUS = {
  paid: { color: '#10b981', label: 'Paid' },
  pending: { color: '#f59e0b', label: 'Pending' },
  overdue: { color: '#f43f5e', label: 'Overdue' },
};

function RentTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const st = RENT_STATUS[d.status] || RENT_STATUS.pending;
  return (
    <div className="rounded-xl bg-slate-900 px-3.5 py-2.5 text-white shadow-xl ring-1 ring-white/10">
      <p className="text-[11px] font-semibold text-white/60">{d.name} {d.year}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{inr(d.amount)}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-[11px]">
        <span className="h-2 w-2 rounded-full" style={{ background: st.color }} /> {st.label}
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

export default function TenantDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/tenant');
      setData(res.data.data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <DashboardSkeleton />;
  if (!data) return <EmptyState title="Dashboard unavailable" message="Could not load your details." />;

  const { room, dueRent, recentRents = [], recentComplaints = [], upcomingVisitors = [] } = data;
  const openComplaints = recentComplaints.filter((c) => !['resolved', 'rejected'].includes(c.status)).length;
  const firstName = user?.name?.split(' ')[0] || 'there';

  // Rent trend (chronological) + reliability
  const rentTrend = [...recentRents].reverse().map((r) => ({ name: `${M3[r.month - 1]}`, year: r.year, amount: r.totalAmount, status: r.status }));
  const paidCount = recentRents.filter((r) => r.status === 'paid').length;
  const pendingCount = recentRents.length - paidCount;
  const onTimePct = recentRents.length ? Math.round((paidCount / recentRents.length) * 100) : 100;
  const payColor = onTimePct >= 80 ? '#10b981' : onTimePct >= 50 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="space-y-6">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 text-white shadow-soft">
        <div className="pointer-events-none absolute -top-20 -right-10 w-72 h-72 rounded-full bg-sun-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '26px 26px' }} />
        <div className="relative p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <p className="text-sm text-slate-300">{greeting()},</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-0.5">{firstName} 👋</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-slate-100">
                <Home className="w-3.5 h-3.5" /> {room ? `Room ${room.roomNumber} · Floor ${room.floor}` : 'No room assigned'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-slate-100">
                <Calendar className="w-3.5 h-3.5" /> {fmtDate(new Date())}
              </span>
            </div>
          </div>
          <div className="w-full lg:w-auto lg:min-w-[300px] rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/15 p-5">
            {dueRent ? (
              <>
                <p className="text-xs uppercase tracking-wide text-slate-300">Rent due</p>
                <p className="text-3xl font-bold tracking-tight mt-1">{inr(dueRent.totalAmount)}</p>
                <p className="text-xs text-slate-300 mt-1">{MONTHS[dueRent.month - 1]} {dueRent.year} · due {fmtDate(dueRent.dueDate)}</p>
                <Link to="/tenant/rent" className="mt-4 inline-flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-white text-brand-700 text-sm font-bold hover:bg-brand-50 transition-colors">
                  <CreditCard className="w-4 h-4" /> Pay now
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold">All dues cleared</p>
                  <p className="text-xs text-slate-300 mt-0.5">No pending rent. You're all set 🎉</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={Banknote} label="Monthly rent" value={room ? inr(room.rentAmount) : '—'} sub={room ? `${room.roomType} room` : 'Not assigned'} tone="blue" />
        <StatCard icon={Wrench} label="Open complaints" value={openComplaints} sub={openComplaints ? 'Being looked into' : 'Nothing pending'} tone="amber" />
        <StatCard icon={Users} label="Upcoming visitors" value={upcomingVisitors.length} sub={upcomingVisitors.length ? 'Expected soon' : 'None scheduled'} tone="indigo" />
      </div>

      {/* ── Quick actions ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {QUICK.map((q) => (
          <Link key={q.to} to={q.to} className="group flex items-center gap-3 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-surface p-4 shadow-card hover:shadow-soft hover:-translate-y-0.5 transition-all duration-200">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${q.tone} text-white flex items-center justify-center shrink-0`}>
              <q.icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1">{q.label}</span>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>

      {/* ── Rent overview (chart) + payment summary ──────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Rent overview" action={<span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400"><TrendingUp className="w-3.5 h-3.5" /> last {rentTrend.length || 0} months</span>}>
            {rentTrend.length === 0 ? (
              <EmptyState icon={Banknote} title="No rent history yet" message="Your monthly rent trend appears here once generated." />
            ) : (
              <>
                <div className="h-56 -ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rentTrend} margin={{ top: 10, right: 8, left: -8, bottom: 0 }} barCategoryGap="28%">
                      <CartesianGrid strokeDasharray="4 4" stroke="var(--chart-grid)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                      <Tooltip content={<RentTooltip />} cursor={{ fill: 'var(--chart-grid)', fillOpacity: 0.4 }} />
                      <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={44}>
                        {rentTrend.map((d, i) => (
                          <Cell key={i} fill={(RENT_STATUS[d.status] || RENT_STATUS.pending).color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs font-medium text-slate-600 dark:border-white/10 dark:text-slate-300">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: RENT_STATUS.paid.color }} /> Paid</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: RENT_STATUS.pending.color }} /> Pending</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: RENT_STATUS.overdue.color }} /> Overdue</span>
                  <span className="ml-auto text-[11px] text-slate-400">Bar color = payment status</span>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Payment reliability */}
        <Card title="Payment summary">
          <div className="flex flex-col items-center py-2 text-center">
            <StatDonut value={onTimePct} unit="%" size={128} stroke={12} color={payColor} label="Paid" />
            <p className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-100">{paidCount} of {recentRents.length || 0} months cleared</p>
            <div className="mt-3 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Paid <b className="tabular-nums">{paidCount}</b></span>
              {pendingCount > 0 && (
                <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300"><span className="h-2 w-2 rounded-full bg-amber-500" /> Pending <b className="tabular-nums">{pendingCount}</b></span>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-400">{dueRent ? `${MONTHS[dueRent.month - 1]} pending` : 'Great payment record 🎉'}</p>
          </div>
        </Card>
      </div>

      {/* ── Activity ─────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Upcoming visitors" action={<Link to="/tenant/visitors" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">Manage <ArrowRight className="w-3 h-3" /></Link>}>
          {upcomingVisitors.length === 0 ? (
            <EmptyState icon={Users} title="No visitors" message="Pre-register a guest from the Visitors page." />
          ) : (
            <div className="space-y-3">
              {upcomingVisitors.map((v) => (
                <div key={v._id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300 flex items-center justify-center text-xs font-bold shrink-0">{(v.visitorName || '?').slice(0, 1).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{v.visitorName}</p>
                    <p className="text-xs text-slate-400">{fmtDate(v.expectedDateTime)}</p>
                  </div>
                  <StatusBadge status={v.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Recent complaints" action={<Link to="/tenant/complaints" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">View all <ArrowRight className="w-3 h-3" /></Link>}>
          {recentComplaints.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Sparkles className="w-7 h-7 text-emerald-400 mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Nothing to report</p>
              <p className="text-xs text-slate-400 mt-0.5">No complaints raised.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentComplaints.slice(0, 4).map((c) => (
                <div key={c._id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 flex items-center justify-center shrink-0"><Wrench className="w-4 h-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{c.title}</p>
                    <p className="text-xs text-slate-400 capitalize">{c.category}</p>
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
