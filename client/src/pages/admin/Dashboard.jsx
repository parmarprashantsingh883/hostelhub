import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, DoorOpen, Banknote, AlertCircle, CheckCircle2, BedDouble,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api } from '../../api/client';
import {
  StatCard, Card, Spinner, EmptyState, StatusBadge, Avatar, PageHeader, inr, fmtDate,
} from '../../components/ui';
import { CHART, BrandTooltip, axisTick, gridProps } from '../../components/ui/charts';

const occColor = (name, i) => CHART.occupancy[name] ?? CHART.series[i % CHART.series.length];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/dashboard/admin')
      .then(({ data }) => setData(data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (!data) return <EmptyState title="Could not load dashboard" />;

  const { stats, recentPayments, recentComplaints, charts } = data;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Your hostel at a glance" />

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Active tenants" value={stats.totalTenants} tone="indigo" />
        <StatCard
          icon={DoorOpen}
          label="Rooms"
          value={stats.totalRooms}
          sub={`${stats.vacantRooms} vacant · ${stats.maintenanceRooms} maintenance`}
          tone="blue"
        />
        <StatCard
          icon={BedDouble}
          label="Bed occupancy"
          value={`${stats.occupancyPct}%`}
          sub={`${stats.occupiedBeds}/${stats.totalBeds} beds filled`}
          tone="green"
        />
        <StatCard
          icon={Banknote}
          label="Collected this month"
          value={inr(stats.monthCollection)}
          sub={`${inr(stats.monthPending)} pending`}
          tone="amber"
        />
        <StatCard icon={AlertCircle} label="Open complaints" value={stats.openComplaints} tone="red" />
        <StatCard icon={CheckCircle2} label="Resolved complaints" value={stats.resolvedComplaints} tone="green" />
        <StatCard icon={DoorOpen} label="Occupied rooms" value={stats.occupiedRooms} sub={`${stats.partialRooms} partially filled`} tone="indigo" />
        <StatCard icon={Banknote} label="Pending rent" value={inr(stats.monthPending)} tone="red" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Revenue by month" className="lg:col-span-2">
          {charts.revenueByMonth.length === 0 ? (
            <EmptyState title="No payments yet" message="Revenue appears here once rents are paid." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.revenueByMonth}>
                <defs>
                  <linearGradient id="revBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.primarySoft} />
                    <stop offset="100%" stopColor={CHART.primary} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip cursor={{ fill: 'rgba(225,29,72,0.06)' }} content={<BrandTooltip money />} />
                <Bar dataKey="revenue" fill="url(#revBar)" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Room occupancy">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={charts.occupancy} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                {charts.occupancy.map((entry, i) => (
                  <Cell key={i} fill={occColor(entry.name, i)} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Tooltip content={<BrandTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Complaint categories + recents */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Complaints by category">
          {charts.complaintByCategory.length === 0 ? (
            <EmptyState title="No complaints" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts.complaintByCategory} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="category" type="category" width={90} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(225,29,72,0.06)' }} content={<BrandTooltip />} />
                <Bar dataKey="count" fill={CHART.primarySoft} radius={[0, 6, 6, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card
          title="Recent payments"
          action={<Link to="/admin/rents" className="text-xs text-brand-600 hover:underline">View all</Link>}
        >
          {recentPayments.length === 0 ? (
            <EmptyState title="No payments yet" />
          ) : (
            <div className="space-y-3">
              {recentPayments.map((p) => (
                <div key={p._id} className="flex items-center gap-3">
                  <Avatar name={p.tenantId?.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.tenantId?.name || '—'}</p>
                    <p className="text-xs text-slate-400 capitalize">{fmtDate(p.paidAt)} · {String(p.paymentMethod || '').replace(/_/g, ' ')}</p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-600 tabular-nums">{inr(p.totalAmount)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Recent complaints"
          action={<Link to="/admin/complaints" className="text-xs text-brand-600 hover:underline">View all</Link>}
        >
          {recentComplaints.length === 0 ? (
            <EmptyState title="No complaints yet" />
          ) : (
            <div className="space-y-3">
              {recentComplaints.map((c) => (
                <div key={c._id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.title}</p>
                    <p className="text-xs text-slate-400 capitalize">{c.tenantId?.name || '—'} · {c.category}</p>
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
