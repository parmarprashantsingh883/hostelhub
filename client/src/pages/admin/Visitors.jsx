import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ClipboardList, LogIn, LogOut, Ban, Clock, UserCheck, UserMinus, Filter } from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Select, Spinner, EmptyState, StatusBadge, Table, TableRow, Td,
  PageHeader, StatCard, Avatar, fmtDateTime, Pagination, usePagination,
} from '../../components/ui';

const STATUSES = ['expected', 'checked_in', 'checked_out', 'rejected'];

export default function AdminVisitors() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/visitors', { params: status ? { status } : {} });
      setVisitors(data.data.visitors);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, action, label) => {
    setBusy(id + action);
    try {
      await api.put(`/visitors/${id}/${action}`);
      toast.success(label);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const countBy = (s) => visitors.filter((v) => v.status === s).length;

  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(visitors, 10);

  return (
    <div className="space-y-6">
      <PageHeader title="Visitors" subtitle="Track and manage everyone coming through the gate" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} tone="amber" label="Expected" value={countBy('expected')} sub="Awaiting arrival" />
        <StatCard icon={UserCheck} tone="green" label="Checked in" value={countBy('checked_in')} sub="Currently inside" />
        <StatCard icon={UserMinus} tone="blue" label="Checked out" value={countBy('checked_out')} sub="Visit complete" />
        <StatCard icon={Ban} tone="red" label="Rejected" value={countBy('rejected')} sub="Denied entry" />
      </div>

      <Card>
        <div className="flex items-center gap-2.5 sm:max-w-xs">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Filter className="h-4 w-4" />
          </span>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <Spinner />
        ) : visitors.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No visitors" message="Visitor requests raised by tenants appear here." />
        ) : (
          <Table headers={['Visitor', 'Phone', 'Tenant', 'Purpose', 'Expected', 'Status', 'Actions']}>
            {pageItems.map((v) => (
              <TableRow key={v._id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={v.visitorName} size="sm" />
                    <span className="font-semibold text-slate-900">{v.visitorName}</span>
                  </div>
                </Td>
                <Td className="tabular-nums">{v.visitorPhone}</Td>
                <Td>{v.tenantId?.name || <span className="text-slate-300">—</span>}</Td>
                <Td className="max-w-xs"><span className="line-clamp-1 text-slate-500">{v.purpose}</span></Td>
                <Td className="text-xs text-slate-400 whitespace-nowrap">{fmtDateTime(v.expectedDateTime)}</Td>
                <Td><StatusBadge status={v.status} /></Td>
                <Td>
                  <div className="flex gap-1.5">
                    {v.status === 'expected' && (
                      <>
                        <Button size="sm" variant="success" loading={busy === v._id + 'check-in'} onClick={() => act(v._id, 'check-in', 'Checked in')}>
                          <LogIn className="w-3.5 h-3.5" /> In
                        </Button>
                        <Button size="sm" variant="danger" loading={busy === v._id + 'reject'} onClick={() => act(v._id, 'reject', 'Rejected')}>
                          <Ban className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    {v.status === 'checked_in' && (
                      <Button size="sm" variant="secondary" loading={busy === v._id + 'check-out'} onClick={() => act(v._id, 'check-out', 'Checked out')}>
                        <LogOut className="w-3.5 h-3.5" /> Out
                      </Button>
                    )}
                    {(v.status === 'checked_out' || v.status === 'rejected') && <span className="text-xs text-slate-300">—</span>}
                  </div>
                </Td>
              </TableRow>
            ))}
          </Table>
        )}
        {!loading && total > 0 && (
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
        )}
      </Card>
    </div>
  );
}
