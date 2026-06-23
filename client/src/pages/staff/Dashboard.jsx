import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Wrench, CheckCircle2, ClipboardList, Loader2 } from 'lucide-react';
import { api, errMsg } from '../../api/client';
import { Card, Spinner, EmptyState, StatusBadge, fmtDateTime } from '../../components/ui';
import { StatDonut, SegmentBar } from '../../components/dashboard/widgets';
import { useAuth } from '../../context/AuthContext';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

function Stat({ icon: Icon, tile, label, value }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tile}`}><Icon className="h-4 w-4" /></span>
      <span className="text-sm text-slate-600">{label}</span>
      <span className="ml-auto font-semibold tabular-nums text-slate-900">{value}</span>
    </div>
  );
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/staff');
      setData(res.data.data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  if (!data) return <EmptyState title="Dashboard unavailable" message="Could not load your tasks." />;

  const { stats, tasks } = data;
  const firstName = user?.name?.split(' ')[0] || 'there';
  const total = stats.assigned + stats.inProgress + stats.resolvedToday;
  const pct = total ? Math.round((stats.resolvedToday / total) * 100) : 0;
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">{dateStr}</p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-slate-900">{greeting()}, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-slate-500">Here's your day at a glance.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Queue summary */}
        <div className="flex flex-col rounded-2xl border border-slate-200/70 bg-white p-6 shadow-card lg:col-span-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">Your queue</p>
          <div className="mt-1">
            <Stat icon={ClipboardList} tile="bg-blue-50 text-blue-600" label="Assigned" value={stats.assigned} />
            <Stat icon={Loader2} tile="bg-amber-50 text-amber-600" label="In progress" value={stats.inProgress} />
            <Stat icon={CheckCircle2} tile="bg-emerald-50 text-emerald-600" label="Resolved today" value={stats.resolvedToday} />
          </div>
          <div className="mt-auto pt-5">
            <SegmentBar segments={[
              { label: 'Assigned', value: stats.assigned, color: '#3b82f6' },
              { label: 'In progress', value: stats.inProgress, color: '#f59e0b' },
              { label: 'Resolved', value: stats.resolvedToday, color: '#10b981' },
            ]} />
          </div>
        </div>

        {/* Progress donut */}
        <div className="flex flex-col items-center rounded-2xl border border-slate-200/70 bg-white p-6 shadow-card lg:col-span-4">
          <p className="self-start font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">Today's progress</p>
          <div className="my-3"><StatDonut value={pct} size={148} stroke={14} /></div>
          <p className="text-sm text-slate-500">{stats.resolvedToday} of {total || 0} cleared</p>
        </div>

        {/* Visitors expected */}
        <div className="flex flex-col rounded-2xl border border-slate-200/70 bg-white p-6 shadow-card lg:col-span-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><ClipboardList className="h-5 w-5" /></span>
          <p className="mt-auto pt-6 font-display text-4xl font-semibold tabular-nums text-slate-900">{stats.expectedVisitors}</p>
          <p className="mt-1 text-sm text-slate-500">visitors expected today</p>
        </div>
      </div>

      <Card title="My open tasks">
        {tasks.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="All clear" message="No tasks assigned to you right now." />
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((t) => (
              <div key={t._id} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Wrench className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{t.title}</p>
                  <p className="text-xs text-slate-400">{t.tenantId?.name || '—'}{t.roomId ? ` · Room ${t.roomId.roomNumber}` : ''} · {fmtDateTime(t.createdAt)}</p>
                </div>
                <StatusBadge status={t.priority} />
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
