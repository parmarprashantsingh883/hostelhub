import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ClipboardList, Plus, UserPlus, CalendarClock, CalendarDays, Phone } from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Field, Input, Textarea, Modal, Spinner, EmptyState, StatusBadge,
  Table, TableRow, Td, PageHeader, StatCard, Avatar, fmtDateTime,
  Pagination, usePagination,
} from '../../components/ui';

const EMPTY = { visitorName: '', visitorPhone: '', purpose: '', expectedDateTime: '' };

export default function TenantVisitors() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/visitors');
      setVisitors(data.data.visitors);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.visitorName || !form.visitorPhone || !form.purpose || !form.expectedDateTime) {
      return toast.error('Please fill all fields');
    }
    setBusy(true);
    try {
      await api.post('/visitors', form);
      toast.success('Visitor request added');
      setOpen(false);
      setForm(EMPTY);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const upcoming = visitors.filter((v) => v.expectedDateTime && new Date(v.expectedDateTime) >= now).length;
  const thisMonth = visitors.filter((v) => v.expectedDateTime && new Date(v.expectedDateTime) >= monthStart).length;

  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(visitors, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Visitors"
        subtitle="Pre-register guests for a smooth gate entry"
        action={<Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Add visitor</Button>}
      />

      {!loading && visitors.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={ClipboardList} label="Total visitors" value={visitors.length} tone="indigo" />
          <StatCard icon={CalendarClock} label="Upcoming" value={upcoming} sub="Expected from now" tone="green" />
          <StatCard icon={CalendarDays} label="This month" value={thisMonth} sub="Pre-registered" tone="amber" />
        </div>
      )}

      <Card>
        {loading ? (
          <Spinner />
        ) : visitors.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No visitors yet"
            message="Add an expected guest so the gate can check them in."
            action={<Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Add visitor</Button>}
          />
        ) : (
          <Table headers={['Visitor', 'Purpose', 'Expected', 'Status']}>
            {pageItems.map((v) => (
              <TableRow key={v._id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={v.visitorName} />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{v.visitorName}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-400 truncate">
                        <Phone className="w-3 h-3 shrink-0" />{v.visitorPhone}
                      </p>
                    </div>
                  </div>
                </Td>
                <Td className="max-w-xs"><span className="line-clamp-2 text-slate-600">{v.purpose}</span></Td>
                <Td className="whitespace-nowrap text-slate-500 tabular-nums">{fmtDateTime(v.expectedDateTime)}</Td>
                <Td><StatusBadge status={v.status} /></Td>
              </TableRow>
            ))}
          </Table>
        )}
        {!loading && total > 0 && (
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add expected visitor">
        <div className="space-y-4">
          <Field label="Visitor name" required>
            <Input value={form.visitorName} onChange={set('visitorName')} placeholder="e.g. Ramesh Kumar" />
          </Field>
          <Field label="Phone" required>
            <Input value={form.visitorPhone} onChange={set('visitorPhone')} placeholder="10-digit mobile" />
          </Field>
          <Field label="Purpose" required>
            <Textarea value={form.purpose} onChange={set('purpose')} placeholder="Reason for the visit…" />
          </Field>
          <Field label="Expected date & time" required>
            <Input type="datetime-local" value={form.expectedDateTime} onChange={set('expectedDateTime')} />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={busy}><UserPlus className="w-4 h-4" /> Add visitor</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
