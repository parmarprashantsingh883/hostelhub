import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Banknote, BellRing, FileDown, CheckCircle2, CalendarPlus, Pencil, Wallet, Clock, AlertTriangle } from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Field, Input, Select, Modal, Spinner, EmptyState,
  StatusBadge, StatCard, Avatar, Table, TableRow, Td, PageHeader, inr, fmtDate,
} from '../../components/ui';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const now = new Date();

export default function Rents() {
  const [rents, setRents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', month: now.getMonth() + 1, year: now.getFullYear() });
  const [busy, setBusy] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [gen, setGen] = useState({ month: now.getMonth() + 1, year: now.getFullYear(), dueDay: 5 });
  const [markFor, setMarkFor] = useState(null);
  const [markMethod, setMarkMethod] = useState('cash');
  const [adjustFor, setAdjustFor] = useState(null);
  const [adjust, setAdjust] = useState({ lateFee: 0, discount: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/rents', { params: filter });
      setRents(data.data.rents);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/rents/generate', gen);
      toast.success(`Generated ${data.data.created} rent records (${data.data.skipped} already existed)`);
      setGenOpen(false);
      setFilter((f) => ({ ...f, month: gen.month, year: gen.year }));
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async () => {
    setBusy(true);
    try {
      await api.put(`/rents/${markFor._id}/mark-paid`, { method: markMethod });
      toast.success('Marked paid + receipt generated');
      setMarkFor(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const saveAdjust = async () => {
    setBusy(true);
    try {
      await api.put(`/rents/${adjustFor._id}`, adjust);
      toast.success('Amounts updated');
      setAdjustFor(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const remind = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/rents/send-reminders');
      toast.success(`${data.data.remindersSent} reminders sent`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const receipt = async (rent) => {
    try {
      const { data } = await api.get(`/rents/${rent._id}/receipt`);
      window.open(data.data.receiptUrl, '_blank');
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const totals = rents.reduce(
    (acc, r) => {
      acc.monthTotal += r.totalAmount;
      if (r.status === 'paid') acc.collected += r.totalAmount;
      else acc.pending += r.totalAmount;
      if (r.status === 'overdue') acc.overdue += 1;
      return acc;
    },
    { collected: 0, pending: 0, monthTotal: 0, overdue: 0 },
  );
  const collectionPct = totals.monthTotal > 0 ? Math.round((totals.collected / totals.monthTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rent & Payments"
        subtitle={`${MONTHS[filter.month - 1]} ${filter.year} — ${rents.length} record${rents.length === 1 ? '' : 's'}`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={remind} loading={busy}>
              <BellRing className="w-4 h-4" /> Send reminders
            </Button>
            <Button onClick={() => setGenOpen(true)}>
              <CalendarPlus className="w-4 h-4" /> Generate month
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Wallet}
          tone="green"
          label="Collected"
          value={inr(totals.collected)}
          sub={`${collectionPct}% of month billed`}
        />
        <StatCard
          icon={Clock}
          tone="amber"
          label="Pending"
          value={inr(totals.pending)}
          sub="Awaiting payment"
        />
        <StatCard
          icon={AlertTriangle}
          tone="red"
          label="Overdue"
          value={totals.overdue}
          sub={totals.overdue === 1 ? 'tenant past due' : 'tenants past due'}
        />
        <StatCard
          icon={Banknote}
          tone="indigo"
          label="This month"
          value={inr(totals.monthTotal)}
          sub={`${MONTHS[filter.month - 1]} ${filter.year} billed`}
        />
      </div>

      <Card>
        <div className="grid sm:grid-cols-3 gap-3">
          <Select value={filter.month} onChange={(e) => setFilter((f) => ({ ...f, month: Number(e.target.value) }))}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </Select>
          <Select value={filter.year} onChange={(e) => setFilter((f) => ({ ...f, year: Number(e.target.value) }))}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
          <Select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <Spinner />
        ) : rents.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="No rent records for this month"
            message="Generate the month to create rent records for every active tenant."
            action={<Button onClick={() => setGenOpen(true)}><CalendarPlus className="w-4 h-4" /> Generate month</Button>}
          />
        ) : (
          <Table headers={['Tenant', 'Room', 'Rent', 'Late fee', 'Discount', 'Total', 'Due', 'Status', 'Actions']}>
            {rents.map((r) => (
              <TableRow key={r._id} className="hover:bg-brand-50/40 transition-colors">
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={r.tenantId?.name} size="sm" />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{r.tenantId?.name || '—'}</p>
                      <p className="text-xs text-slate-400 truncate">{r.tenantId?.phone || 'No phone'}</p>
                    </div>
                  </div>
                </Td>
                <Td>
                  {r.roomId?.roomNumber
                    ? <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">Room {r.roomId.roomNumber}</span>
                    : <span className="text-slate-400">—</span>}
                </Td>
                <Td className="tabular-nums">{inr(r.rentAmount)}</Td>
                <Td className={r.lateFee ? 'text-red-600 font-medium tabular-nums' : 'text-slate-400'}>{r.lateFee ? inr(r.lateFee) : '—'}</Td>
                <Td className={r.discount ? 'text-emerald-600 font-medium tabular-nums' : 'text-slate-400'}>{r.discount ? `-${inr(r.discount)}` : '—'}</Td>
                <Td className="font-bold text-slate-900 tabular-nums">{inr(r.totalAmount)}</Td>
                <Td className="text-slate-500">{fmtDate(r.dueDate)}</Td>
                <Td><StatusBadge status={r.status} /></Td>
                <Td>
                  <div className="flex items-center gap-1">
                    {r.status !== 'paid' ? (
                      <>
                        <button
                          onClick={() => { setAdjustFor(r); setAdjust({ lateFee: r.lateFee || 0, discount: r.discount || 0 }); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Adjust late fee / discount"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setMarkFor(r)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Mark paid"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => receipt(r)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        title="Download receipt"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Td>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>

      {/* Generate modal */}
      <Modal open={genOpen} onClose={() => setGenOpen(false)} title="Generate monthly rent">
        <p className="text-sm text-slate-500 mb-4">
          Creates a rent record for every <b className="text-slate-700">active tenant with a room</b>. Existing records for the month are skipped — safe to re-run.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Month">
            <Select value={gen.month} onChange={(e) => setGen((g) => ({ ...g, month: Number(e.target.value) }))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Year">
            <Input type="number" value={gen.year} onChange={(e) => setGen((g) => ({ ...g, year: Number(e.target.value) }))} />
          </Field>
          <Field label="Due day">
            <Input type="number" min={1} max={28} value={gen.dueDay} onChange={(e) => setGen((g) => ({ ...g, dueDay: Number(e.target.value) }))} />
          </Field>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setGenOpen(false)}>Cancel</Button>
          <Button onClick={generate} loading={busy}>Generate</Button>
        </div>
      </Modal>

      {/* Mark paid modal */}
      <Modal open={!!markFor} onClose={() => setMarkFor(null)} title={`Mark paid — ${markFor?.tenantId?.name}`}>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4 mb-4">
          <Avatar name={markFor?.tenantId?.name} size="md" />
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">{markFor?.tenantId?.name}</p>
            <p className="text-xs text-slate-500">{MONTHS[(markFor?.month || 1) - 1]} {markFor?.year}</p>
          </div>
          <p className="ml-auto text-lg font-bold text-slate-900 tabular-nums">{inr(markFor?.totalAmount)}</p>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          A PDF receipt is generated automatically once the payment is recorded.
        </p>
        <Field label="Payment method">
          <Select value={markMethod} onChange={(e) => setMarkMethod(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank transfer</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setMarkFor(null)}>Cancel</Button>
          <Button variant="success" onClick={markPaid} loading={busy}>Confirm payment</Button>
        </div>
      </Modal>

      {/* Adjust modal */}
      <Modal open={!!adjustFor} onClose={() => setAdjustFor(null)} title="Adjust amounts">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Late fee (₹)">
            <Input type="number" min={0} value={adjust.lateFee} onChange={(e) => setAdjust((a) => ({ ...a, lateFee: Number(e.target.value) }))} />
          </Field>
          <Field label="Discount (₹)">
            <Input type="number" min={0} value={adjust.discount} onChange={(e) => setAdjust((a) => ({ ...a, discount: Number(e.target.value) }))} />
          </Field>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4 mt-4">
          <span className="text-sm font-medium text-slate-500">New total</span>
          <span className="text-lg font-bold text-slate-900 tabular-nums">{inr((adjustFor?.rentAmount || 0) + (adjust.lateFee || 0) - (adjust.discount || 0))}</span>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setAdjustFor(null)}>Cancel</Button>
          <Button onClick={saveAdjust} loading={busy}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
