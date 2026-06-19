import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Wrench, Loader2, CheckCircle2, ClipboardList } from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Card, Spinner, EmptyState, StatusBadge, StatCard, Table, Td, PageHeader, fmtDateTime,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

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

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${user?.name?.split(' ')[0] || 'there'}`} subtitle="Your assigned tasks at a glance" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label="Assigned" value={stats.assigned} tone="blue" />
        <StatCard icon={Loader2} label="In progress" value={stats.inProgress} tone="amber" />
        <StatCard icon={CheckCircle2} label="Resolved today" value={stats.resolvedToday} tone="green" />
        <StatCard icon={Wrench} label="Visitors expected" value={stats.expectedVisitors} tone="indigo" />
      </div>

      <Card title="My open tasks">
        {tasks.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="All clear" message="No tasks assigned to you right now." />
        ) : (
          <Table headers={['Task', 'Tenant', 'Room', 'Priority', 'Status', 'Raised']}>
            {tasks.map((t) => (
              <tr key={t._id} className="hover:bg-gray-50/60 transition-colors">
                <Td className="font-medium text-gray-900 max-w-xs"><span className="line-clamp-1">{t.title}</span></Td>
                <Td>{t.tenantId?.name || '—'}</Td>
                <Td>{t.roomId ? `${t.roomId.roomNumber}` : '—'}</Td>
                <Td><StatusBadge status={t.priority} /></Td>
                <Td><StatusBadge status={t.status} /></Td>
                <Td className="text-xs text-gray-400">{fmtDateTime(t.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
