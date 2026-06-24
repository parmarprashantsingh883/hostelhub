import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Banknote, BellRing, FileDown, CheckCircle2, CalendarPlus, Pencil, Wallet, Clock, AlertTriangle, Zap } from 'lucide-react';
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
  const [selected, setSelected] = useState(new Set());
  const [rooms, setRooms] = useState([]);
  const [elecOpen, setElecOpen] = useState(false);
  const [elec, setElec] = useState({ roomId: '', mode: 'units', units: '', ratePerUnit: 8, amount: '' });

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

  useEffect(() => {
    api.get('/rooms', { params: { limit: 200 } })
      .then(({ data }) => setRooms(data.data.rooms || []))
      .catch(() => { /* non-blocking */ });
  }, []);

  const applyElectricity = async () => {
    const room = rooms.find((r) => r._id === elec.roomId);
    if (!room) return toast.error('Pick a room to bill');
    const payload = {
      roomId: elec.roomId,
      month: filter.month,
      year: filter.year,
      dueDay: gen.dueDay,
      ...(elec.mode === 'flat'
        ? { amount: Number(elec.amount) }
        : { units: Number(elec.units), ratePerUnit: Number(elec.ratePerUnit) }),
    };
    setBusy(true);
    try {
      const { data } = await api.post('/rents/electricity', payload);
      const d = data.data;
      toast.success(`₹${d.total} split across ${d.charged} tenant${d.charged === 1 ? '' : 's'} (₹${d.perHead}/head)${d.skippedPaid ? ` · ${d.skippedPaid} paid skipped` : ''}`);
      setElecOpen(false);
      setElec({ roomId: '', mode: 'units', units: '', ratePerUnit: 8, amount: '' });
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

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

  const remind = async (rentIds) => {
    setBusy(true);
    try {
      const body = rentIds && rentIds.length ? { rentIds } : {};
      const { data } = await api.post('/rents/send-reminders', body);
      const n = data.data.remindersSent;
      toast.success(n ? `${n} reminder${n === 1 ? '' : 's'} sent via email` : 'No pending dues to remind');
      setSelected(new Set());
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleSel = (id) => setSelected((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

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
  const unpaid = rents.filter((r) => r.status !== 'paid');
  const allUnpaidSelected = unpaid.length > 0 && unpaid.every((r) => selected.has(r._id));
  const toggleAll = () => setSelected(allUnpaidSelected ? new Set() : new Set(unpaid.map((r) => r._id)));

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
            <Button variant="secondary" onClick={() => setElecOpen(true)}>
              <Zap className="w-4 h-4" /> Bill electricity
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
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50/70 px-3 py-2">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                <input type="checkbox" checked={allUnpaidSelected} onChange={toggleAll} disabled={!unpaid.length} className="h-4 w-4 rounded border-slate-300 accent-brand-600" />
                Select unpaid ({unpaid.length})
              </label>
              {selected.size > 0 && (
                <>
                  <span className="text-xs font-semibold text-slate-700">{selected.size} selected</span>
                  <Button size="sm" onClick={() => remind([...selected])} loading={busy}><BellRing className="w-3.5 h-3.5" /> Remind selected</Button>
                  <button onClick={() => setSelected(new Set())} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
                </>
              )}
              <span className="ml-auto flex items-center gap-1.5">
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-700">Email ✓</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">WhatsApp soon</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">SMS soon</span>
              </span>
            </div>
            <Table headers={['', 'Tenant', 'Room', 'Rent', 'Electricity', 'Late fee', 'Discount', 'Total', 'Due', 'Status', 'Actions']}>
            {rents.map((r) => (
              <TableRow key={r._id} className="hover:bg-brand-50/40 transition-colors">
                <Td>
                  {r.status !== 'paid' && (
                    <input type="checkbox" checked={selected.has(r._id)} onChange={() => toggleSel(r._id)} className="h-4 w-4 rounded border-slate-300 accent-brand-600" aria-label="Select rent row" />
                  )}
                </Td>
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
                <Td className={r.electricityCharge ? 'tabular-nums text-slate-700' : 'text-slate-400'}>
                  {r.electricityCharge ? (
                    <span title={r.electricityMeta?.units ? `${r.electricityMeta.units} units ÷ ${r.electricityMeta.occupants}` : 'Electricity share'}>
                      {inr(r.electricityCharge)}
                    </span>
                  ) : '—'}
                </Td>
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
                          onClick={() => remind([r._id])}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Send reminder"
                        >
                          <BellRing className="w-4 h-4" />
                        </button>
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
          </>
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

      {/* Electricity billing modal */}
      <Modal open={elecOpen} onClose={() => setElecOpen(false)} title="Bill electricity to a room">
        {(() => {
          const room = rooms.find((r) => r._id === elec.roomId);
          const occ = room?.currentOccupancy || 0;
          const total = elec.mode === 'flat'
            ? Math.max(0, Number(elec.amount) || 0)
            : Math.max(0, (Number(elec.units) || 0) * (Number(elec.ratePerUnit) || 0));
          const perHead = occ > 0 ? Math.floor(total / occ) : 0;
          return (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Splits the bill equally across the room's <b className="text-slate-700">active occupants</b> and adds each share to their {MONTHS[filter.month - 1]} {filter.year} rent. Paid invoices are left untouched.
              </p>
              <Field label="Room">
                <Select value={elec.roomId} onChange={(e) => setElec((s) => ({ ...s, roomId: e.target.value }))}>
                  <option value="">Select a room…</option>
                  {rooms.filter((r) => (r.currentOccupancy || 0) > 0).map((r) => (
                    <option key={r._id} value={r._id}>
                      Room {r.roomNumber} · {r.currentOccupancy} occupant{r.currentOccupancy === 1 ? '' : 's'}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setElec((s) => ({ ...s, mode: 'units' }))}
                  className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${elec.mode === 'units' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  Units × rate
                </button>
                <button
                  type="button"
                  onClick={() => setElec((s) => ({ ...s, mode: 'flat' }))}
                  className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${elec.mode === 'flat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  Flat amount
                </button>
              </div>

              {elec.mode === 'units' ? (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Units consumed">
                    <Input type="number" min={0} value={elec.units} onChange={(e) => setElec((s) => ({ ...s, units: e.target.value }))} placeholder="e.g. 120" />
                  </Field>
                  <Field label="Rate / unit (₹)">
                    <Input type="number" min={0} step="0.5" value={elec.ratePerUnit} onChange={(e) => setElec((s) => ({ ...s, ratePerUnit: e.target.value }))} />
                  </Field>
                </div>
              ) : (
                <Field label="Total bill amount (₹)">
                  <Input type="number" min={0} value={elec.amount} onChange={(e) => setElec((s) => ({ ...s, amount: e.target.value }))} placeholder="e.g. 960" />
                </Field>
              )}

              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Bill total</span>
                  <span className="font-semibold tabular-nums text-slate-900">{inr(total)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500">Split across</span>
                  <span className="font-semibold tabular-nums text-slate-900">{occ} occupant{occ === 1 ? '' : 's'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-200/70 pt-2">
                  <span className="font-medium text-brand-700">Per head</span>
                  <span className="text-lg font-bold tabular-nums text-brand-700">{inr(perHead)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <Button variant="secondary" onClick={() => setElecOpen(false)}>Cancel</Button>
                <Button onClick={applyElectricity} loading={busy} disabled={!elec.roomId || total <= 0}>
                  <Zap className="w-4 h-4" /> Add to invoices
                </Button>
              </div>
            </div>
          );
        })()}
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
          <span className="text-lg font-bold text-slate-900 tabular-nums">{inr((adjustFor?.rentAmount || 0) + (adjustFor?.electricityCharge || 0) + (adjust.lateFee || 0) - (adjust.discount || 0))}</span>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setAdjustFor(null)}>Cancel</Button>
          <Button onClick={saveAdjust} loading={busy}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
