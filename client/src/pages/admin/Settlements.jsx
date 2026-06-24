import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Wallet, Plus, FileDown, Search, Receipt, MinusCircle, CheckCircle2, LogOut, ArrowRight,
} from 'lucide-react';
import { api, errMsg, API_BASE } from '../../api/client';
import {
  Button, Card, Field, Input, Modal, Spinner, EmptyState, StatusBadge, StatCard,
  Avatar, Table, TableRow, Td, PageHeader, inr, fmtDate, fmtDateTime,
} from '../../components/ui';

// Build a fully-qualified URL for the /uploads PDF (API_BASE may be '/api' or an absolute origin).
const fileUrl = (p) => {
  if (!p) return '#';
  if (/^https?:\/\//.test(p)) return p;
  const origin = API_BASE.replace(/\/api\/?$/, '');
  return `${origin}${p}`;
};

/** Deposit − Dues − Deductions = Refund, shown as an itemised ledger. */
function SettlementBreakdown({ s }) {
  if (!s) return null;
  const refundPositive = s.refund >= 0;
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white">
      <ul className="divide-y divide-slate-100 text-sm">
        <li className="flex items-center justify-between px-5 py-3">
          <span className="text-slate-600">Security deposit held</span>
          <span className="font-semibold tabular-nums text-slate-900">{inr(s.depositHeld)}</span>
        </li>
        <li className="flex items-center justify-between px-5 py-3">
          <span className="text-slate-600">Less: pending rent dues</span>
          <span className="font-semibold tabular-nums text-red-600">− {inr(s.pendingDues)}</span>
        </li>
        <li className="flex items-center justify-between px-5 py-3">
          <span className="text-slate-600">Less: deductions</span>
          <span className="font-semibold tabular-nums text-red-600">− {inr(s.totalDeductions)}</span>
        </li>
      </ul>
      <div className="flex items-center justify-between rounded-b-2xl bg-brand-50 px-5 py-4">
        <span className="text-sm font-semibold text-brand-700">
          {refundPositive ? 'Net refund to tenant' : 'Recoverable from tenant'}
        </span>
        <span className="text-xl font-bold tabular-nums text-brand-700">{inr(Math.abs(s.refund))}</span>
      </div>
    </div>
  );
}

export default function Settlements() {
  const [queue, setQueue] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState(null); // tenant id
  const [detail, setDetail] = useState(null);      // { tenant, ledger, settlement }
  const [detailLoading, setDetailLoading] = useState(false);

  const [deductForm, setDeductForm] = useState(null); // { amount, reason } | null
  const [busy, setBusy] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: q }, { data: t }] = await Promise.all([
        api.get('/settlements/queue'),
        api.get('/tenants', { params: { limit: 200 } }),
      ]);
      setQueue(q.data.queue);
      setTenants(t.data.tenants);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const loadDetail = useCallback(async (tenantId) => {
    if (!tenantId) { setDetail(null); return; }
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/settlements/${tenantId}`);
      setDetail(data.data);
    } catch (e) {
      toast.error(errMsg(e));
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { loadDetail(selected); }, [selected, loadDetail]);

  const addDeduction = async (e) => {
    e.preventDefault();
    const amount = Number(deductForm.amount);
    if (!amount || amount <= 0) return toast.error('Enter a deduction amount');
    setBusy(true);
    try {
      const { data } = await api.post(`/settlements/${selected}/deductions`, {
        amount,
        reason: deductForm.reason,
      });
      setDetail((d) => ({ ...d, ledger: data.data.ledger, settlement: data.data.settlement }));
      setDeductForm(null);
      toast.success('Deduction added');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const generatePdf = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/settlements/${selected}/finalize`);
      toast.success('Settlement PDF generated');
      await loadDetail(selected);
      loadQueue();
      window.open(fileUrl(data.data.settlementUrl), '_blank', 'noopener');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  // Pickable tenants: anyone with a tenant account (active or moved-out).
  const term = search.trim().toLowerCase();
  const pickable = tenants.filter(
    (t) => !term || t.name?.toLowerCase().includes(term) || t.email?.toLowerCase().includes(term),
  );

  const s = detail?.settlement;
  const settled = !!detail?.ledger?.settledAt;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deposit Ledger & Settlements"
        subtitle="Compute move-out refunds: deposit held minus dues and deductions"
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={LogOut} tone="amber" label="In move-out queue" value={queue.length} sub="Awaiting / pending close" />
        <StatCard
          icon={CheckCircle2}
          tone="green"
          label="Settled"
          value={queue.filter((q) => q.settledAt).length}
          sub="PDF generated"
        />
        <StatCard
          icon={Wallet}
          tone="indigo"
          label="Deposit held"
          value={s ? inr(s.depositHeld) : '—'}
          sub={detail ? detail.tenant.name : 'Select a tenant'}
        />
        <StatCard
          icon={Receipt}
          tone="blue"
          label="Computed refund"
          value={s ? inr(Math.max(0, s.refund)) : '—'}
          sub={s && s.refund < 0 ? `${inr(Math.abs(s.refund))} recoverable` : 'After dues & deductions'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: tenant picker + move-out queue */}
        <div className="space-y-6 lg:col-span-1">
          <Card title="Pick a tenant">
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-72 space-y-1.5 overflow-y-auto scrollbar-thin">
              {pickable.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">No tenants found</p>
              ) : (
                pickable.map((t) => (
                  <button
                    key={t._id}
                    onClick={() => setSelected(t._id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                      selected === t._id ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <Avatar name={t.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{t.name}</p>
                      <p className="truncate text-xs text-slate-400">{t.email}</p>
                    </div>
                    <StatusBadge status={t.tenantProfile?.status || 'active'} />
                  </button>
                ))
              )}
            </div>
          </Card>

          <Card title="Move-out queue">
            {loading ? (
              <Spinner />
            ) : queue.length === 0 ? (
              <EmptyState icon={LogOut} title="Queue is empty" message="Moved-out or inactive tenants appear here." />
            ) : (
              <div className="space-y-1.5">
                {queue.map((q) => (
                  <button
                    key={q._id}
                    onClick={() => setSelected(q._id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                      selected === q._id ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <Avatar name={q.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{q.name}</p>
                      <p className="truncate text-xs text-slate-400">
                        {q.room ? `Room ${q.room.roomNumber}` : 'No room'} · moved {fmtDate(q.moveOutDate)}
                      </p>
                    </div>
                    {q.settledAt ? <StatusBadge status="resolved" /> : <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />}
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right: settlement detail */}
        <div className="lg:col-span-2">
          {!selected ? (
            <Card>
              <EmptyState
                icon={Wallet}
                title="No tenant selected"
                message="Pick a tenant on the left to view their deposit ledger and compute a move-out settlement."
              />
            </Card>
          ) : detailLoading ? (
            <Card><Spinner /></Card>
          ) : !detail ? (
            <Card><EmptyState icon={Wallet} title="Unable to load ledger" /></Card>
          ) : (
            <div className="space-y-6">
              <Card
                title={`Settlement — ${detail.tenant.name}`}
                action={
                  settled ? <StatusBadge status="resolved" /> : <StatusBadge status={detail.tenant.tenantProfile?.status || 'active'} />
                }
              >
                <SettlementBreakdown s={s} />

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button variant="secondary" onClick={() => setDeductForm({ amount: '', reason: '' })} disabled={settled}>
                    <MinusCircle className="h-4 w-4" /> Add deduction
                  </Button>
                  <Button onClick={generatePdf} loading={busy}>
                    <FileDown className="h-4 w-4" /> Generate settlement PDF
                  </Button>
                  {detail.ledger.settlementUrl && (
                    <a
                      href={fileUrl(detail.ledger.settlementUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      View last PDF
                    </a>
                  )}
                </div>
                {settled && (
                  <p className="mt-3 text-xs text-slate-400">
                    Finalised {fmtDateTime(detail.ledger.settledAt)} — ledger is closed.
                  </p>
                )}
              </Card>

              <Card title="Deposit ledger">
                {detail.ledger.entries?.length ? (
                  <Table headers={['Type', 'Reason', 'Amount', 'Date']}>
                    {detail.ledger.entries.map((e) => (
                      <TableRow key={e._id}>
                        <Td><StatusBadge status={e.type === 'deposit' ? 'active' : e.type === 'refund' ? 'resolved' : 'overdue'} /></Td>
                        <Td className="text-slate-700">{e.reason || <span className="capitalize">{e.type}</span>}</Td>
                        <Td className={`font-semibold tabular-nums ${e.type === 'deposit' ? 'text-slate-900' : 'text-red-600'}`}>
                          {e.type === 'deposit' ? '' : '− '}{inr(e.amount)}
                        </Td>
                        <Td className="text-slate-500">{fmtDate(e.at)}</Td>
                      </TableRow>
                    ))}
                  </Table>
                ) : (
                  <EmptyState
                    icon={Receipt}
                    title="No ledger entries yet"
                    message="The opening deposit is seeded from the tenant's recorded security deposit."
                  />
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Add deduction modal */}
      <Modal open={!!deductForm} onClose={() => setDeductForm(null)} title="Add deduction">
        {deductForm && (
          <form onSubmit={addDeduction} className="space-y-4">
            <Field label="Amount (₹)" required>
              <Input
                type="number"
                min={1}
                value={deductForm.amount}
                onChange={(e) => setDeductForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="e.g. 1500"
                required
              />
            </Field>
            <Field label="Reason" hint="e.g. Wall damage, unpaid utilities, cleaning">
              <Input
                value={deductForm.reason}
                onChange={(e) => setDeductForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Reason for deduction"
              />
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setDeductForm(null)}>Cancel</Button>
              <Button type="submit" loading={busy}><Plus className="h-4 w-4" /> Add deduction</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
