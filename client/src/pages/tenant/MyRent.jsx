import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Banknote, FileDown, CreditCard, AlertTriangle, CheckCircle2, Wallet,
  Clock, TrendingUp, ShieldCheck, Smartphone, Landmark, Lock, Loader2,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Modal, Spinner, EmptyState, StatusBadge, Table, TableRow, Td,
  PageHeader, StatCard, Field, Input, Select, inr, fmtDate, Pagination, usePagination,
} from '../../components/ui';
import QRCode from '../../components/QRCode';
import { useAuth } from '../../context/AuthContext';

const PAY_METHODS = [
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'netbanking', label: 'Net banking', icon: Landmark },
];

/** Simulated secure checkout for demo/mock mode — verifies the order on "pay". */
function CheckoutModal({ checkout, onClose, onDone }) {
  const [method, setMethod] = useState('upi');
  const [phase, setPhase] = useState('select'); // select | processing | done
  const [upi, setUpi] = useState(null); // { configured, vpa, intent, ... }
  const [upiView, setUpiView] = useState('qr'); // qr | id

  useEffect(() => {
    if (!checkout) return undefined;
    let on = true;
    api.get(`/rents/${checkout.rent._id}/upi`)
      .then(({ data }) => { if (on) setUpi(data.data); })
      .catch(() => {});
    return () => { on = false; };
  }, [checkout]);

  if (!checkout) return null;
  const { rent, order } = checkout;
  const amount = rent.totalAmount;

  const payNow = async () => {
    setPhase('processing');
    try {
      await new Promise((r) => setTimeout(r, 1500)); // gateway latency
      await api.post(`/rents/${rent._id}/verify`, {
        orderId: order.id,
        paymentId: `pay_${method}_${Date.now()}`,
        signature: 'mock',
      });
      setPhase('done');
      setTimeout(() => onDone(), 1200);
    } catch (e) {
      toast.error(errMsg(e, 'Payment failed'));
      setPhase('select');
    }
  };

  return (
    <Modal open onClose={phase === 'processing' ? undefined : onClose} title="Secure checkout">
      {/* amount strip */}
      <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-white/5 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Lock className="h-3.5 w-3.5" /> Paying for {monthLabel(rent)}
        </div>
        <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{inr(amount)}</span>
      </div>

      {phase === 'select' && (
        <div className="mt-5">
          <div className="grid grid-cols-3 gap-2">
            {PAY_METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition-colors ${
                  method === m.id
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'
                }`}
              >
                <m.icon className="h-5 w-5" /> {m.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {method === 'upi' && (
              upi?.configured ? (
                <div className="space-y-3">
                  <div className="flex justify-center gap-2">
                    {[{ id: 'qr', label: 'Scan QR' }, { id: 'id', label: 'Enter UPI ID' }].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setUpiView(v.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          upiView === v.id
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                  {upiView === 'qr' ? (
                    <div className="flex flex-col items-center pt-1">
                      <QRCode value={upi.intent} size={168} caption={`Scan with any UPI app to pay ${inr(amount)} to ${upi.vpa}`} />
                      <a href={upi.intent} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300">
                        Open in a UPI app →
                      </a>
                    </div>
                  ) : (
                    <Field label="UPI ID"><Input defaultValue={upi.vpa} /></Field>
                  )}
                </div>
              ) : (
                <Field label="UPI ID"><Input defaultValue="demo@okhdfcbank" /></Field>
              )
            )}
            {method === 'card' && (
              <>
                <Field label="Card number"><Input defaultValue="4111 1111 1111 1111" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Expiry"><Input defaultValue="12/27" /></Field>
                  <Field label="CVV"><Input type="password" defaultValue="123" /></Field>
                </div>
              </>
            )}
            {method === 'netbanking' && (
              <Field label="Bank">
                <Select defaultValue="HDFC Bank">
                  {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra'].map((bk) => (
                    <option key={bk} value={bk}>{bk}</option>
                  ))}
                </Select>
              </Field>
            )}
          </div>

          <Button onClick={payNow} size="lg" className="mt-5 w-full">
            <Lock className="h-4 w-4" /> Pay {inr(amount)}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" /> 256-bit encrypted · demo gateway — no real charge
          </p>
        </div>
      )}

      {phase === 'processing' && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="h-9 w-9 animate-spin text-brand-500" />
          <p className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-100">Processing payment…</p>
          <p className="mt-1 text-xs text-slate-400">Contacting your bank — don't close this window.</p>
        </div>
      )}

      {phase === 'done' && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 18 }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-500/15"
          >
            <CheckCircle2 className="h-9 w-9" />
          </motion.div>
          <p className="mt-4 text-base font-bold text-slate-900 dark:text-white">Payment successful</p>
          <p className="mt-1 text-sm text-slate-500">{inr(amount)} received · receipt is ready</p>
        </div>
      )}
    </Modal>
  );
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const monthLabel = (r) => `${MONTHS[r.month - 1]} ${r.year}`;

export default function MyRent() {
  const { user } = useAuth();
  const [rents, setRents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null); // rent being paid (confirm modal)
  const [checkout, setCheckout] = useState(null); // { rent, order } — demo gateway
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/rents');
      setRents(data.data.rents);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /**
   * Pay flow:
   *  1. POST /rents/:id/pay → { mode, keyId, order }
   *  2. live mode → open Razorpay checkout; mock mode → simulate instantly
   *  3. POST /rents/:id/verify with the payment ids
   */
  const pay = async (rent) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/rents/${rent._id}/pay`);
      const { mode, keyId, order } = data.data;

      if (mode === 'mock') {
        // Demo mode — open the in-app secure checkout to complete the flow.
        setPaying(null);
        setCheckout({ rent, order });
        return;
      }

      // Live Razorpay checkout
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load Razorpay'));
        document.body.appendChild(script);
      });

      const rzp = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Quarters',
        description: `Rent — ${MONTHS[rent.month - 1]} ${rent.year}`,
        order_id: order.id,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: '#2563eb' },
        handler: async (resp) => {
          try {
            await api.post(`/rents/${rent._id}/verify`, {
              orderId: resp.razorpay_order_id,
              paymentId: resp.razorpay_payment_id,
              signature: resp.razorpay_signature,
            });
            toast.success('Payment successful 🎉');
            setPaying(null);
            load();
          } catch (err) {
            toast.error(errMsg(err, 'Verification failed — contact admin'));
          }
        },
        modal: { ondismiss: () => toast('Payment cancelled', { icon: 'ℹ️' }) },
      });
      rzp.open();
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

  const due = rents.filter((r) => r.status !== 'paid');
  const paidRents = rents.filter((r) => r.status === 'paid');

  // ── KPIs computed from loaded data ────────────────────────────────────
  const totalPaid = paidRents.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const totalPending = due.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const onTimeCount = paidRents.filter((r) => !r.lateFee).length;
  const onTimePct = paidRents.length ? Math.round((onTimeCount / paidRents.length) * 100) : 100;
  const nextDue = due[0];

  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(rents, 10);

  return (
    <div className="space-y-6">
      <PageHeader title="My Rent" subtitle="Pay online and download receipts" />

      {/* ── Due alert / all-clear ─────────────────────────────────────── */}
      {!loading && (due.length > 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-sun-50 p-6 shadow-card">
          <div className="pointer-events-none absolute -top-10 -right-6 w-52 h-52 rounded-full bg-sun-400/15 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sun-400 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-[0_8px_20px_-6px_rgba(245,158,11,0.6)]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                  {due.length} unpaid month{due.length > 1 ? 's' : ''}
                </p>
                <p className="text-2xl font-bold tracking-tight text-amber-900 mt-0.5 tabular-nums">
                  {inr(totalPending)} <span className="text-base font-semibold text-amber-700">due</span>
                </p>
                <p className="text-sm text-amber-700/90 mt-1">
                  Next: <span className="font-semibold">{monthLabel(nextDue)}</span> · due {fmtDate(nextDue.dueDate)} — pay before the due date to avoid late fees.
                </p>
              </div>
            </div>
            <Button onClick={() => setPaying(nextDue)} className="shrink-0">
              <CreditCard className="w-4 h-4" /> Pay {MONTHS[nextDue.month - 1]}
            </Button>
          </div>
        </div>
      ) : rents.length > 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-brand-200/70 bg-gradient-to-br from-brand-50 to-emerald-50 p-6 shadow-card">
          <div className="pointer-events-none absolute -top-10 -right-6 w-52 h-52 rounded-full bg-brand-400/15 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shrink-0 shadow-[0_8px_20px_-6px_rgba(36,48,71,0.6)]">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-brand-900">All dues cleared 🎉</p>
              <p className="text-sm text-brand-700/90 mt-0.5">You're fully paid up — no outstanding rent. Receipts are available below.</p>
            </div>
          </div>
        </div>
      ) : null)}

      {/* ── Summary KPIs ──────────────────────────────────────────────── */}
      {!loading && rents.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Wallet} tone="green" label="Total paid" value={inr(totalPaid)} sub={`${paidRents.length} month${paidRents.length === 1 ? '' : 's'}`} />
          <StatCard icon={Clock} tone={totalPending > 0 ? 'amber' : 'blue'} label="Pending" value={inr(totalPending)} sub={`${due.length} unpaid`} />
          <StatCard icon={TrendingUp} tone="indigo" label="On-time" value={`${onTimePct}%`} sub={`${onTimeCount}/${paidRents.length || 0} on time`} />
          <StatCard icon={ShieldCheck} tone={due.length ? 'red' : 'green'} label="Status" value={due.length ? 'Action needed' : 'Up to date'} sub={due.length ? 'Dues outstanding' : 'No dues'} />
        </div>
      )}

      <Card title="Rent history">
        {loading ? (
          <Spinner />
        ) : rents.length === 0 ? (
          <EmptyState icon={Banknote} title="No rent records yet" message="Your rent appears here once the admin generates the month." />
        ) : (
          <Table headers={['Month', 'Rent', 'Electricity', 'Late fee', 'Discount', 'Total', 'Due date', 'Status', 'Actions']}>
            {pageItems.map((r) => (
              <TableRow key={r._id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300 flex flex-col items-center justify-center shrink-0 leading-none ring-1 ring-brand-100 dark:ring-white/10">
                      <span className="text-[11px] font-bold uppercase tracking-wide">{MONTHS[r.month - 1].slice(0, 3)}</span>
                      <span className="text-[9px] text-brand-400 mt-0.5">{r.year}</span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">{monthLabel(r)}</span>
                  </div>
                </Td>
                <Td className="tabular-nums">{inr(r.rentAmount)}</Td>
                <Td className={`tabular-nums ${r.electricityCharge ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>{r.electricityCharge ? inr(r.electricityCharge) : '—'}</Td>
                <Td className={`tabular-nums ${r.lateFee ? 'text-rose-500 font-medium' : 'text-slate-400'}`}>{r.lateFee ? inr(r.lateFee) : '—'}</Td>
                <Td className={`tabular-nums ${r.discount ? 'text-emerald-500 font-medium' : 'text-slate-400'}`}>{r.discount ? `-${inr(r.discount)}` : '—'}</Td>
                <Td className="font-bold text-slate-900 dark:text-white tabular-nums">{inr(r.totalAmount)}</Td>
                <Td className="text-slate-500">{fmtDate(r.dueDate)}</Td>
                <Td><StatusBadge status={r.status} /></Td>
                <Td>
                  {r.status === 'paid' ? (
                    <button onClick={() => receipt(r)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-white/5 transition-colors">
                      <FileDown className="w-3.5 h-3.5" /> Receipt
                    </button>
                  ) : (
                    <Button size="sm" onClick={() => setPaying(r)}>
                      <CreditCard className="w-3.5 h-3.5" /> Pay now
                    </Button>
                  )}
                </Td>
              </TableRow>
            ))}
          </Table>
        )}
        {!loading && total > 0 && (
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
        )}
      </Card>

      {/* Pay confirm modal */}
      <Modal open={!!paying} onClose={() => setPaying(null)} title="Confirm payment">
        {paying && (
          <>
            <div className="flex items-center gap-3 rounded-2xl bg-brand-50/70 dark:bg-brand-500/15 ring-1 ring-brand-100 dark:ring-white/10 px-4 py-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Rent for</p>
                <p className="font-semibold text-slate-900 dark:text-white">{monthLabel(paying)}</p>
              </div>
            </div>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Rent</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">{inr(paying.rentAmount)}</dd>
              </div>
              {paying.electricityCharge > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Electricity{paying.electricityMeta?.units ? ` (${paying.electricityMeta.units}u ÷ ${paying.electricityMeta.occupants})` : ''}</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">{inr(paying.electricityCharge)}</dd>
                </div>
              )}
              {paying.lateFee > 0 && (
                <div className="flex items-center justify-between text-rose-500">
                  <dt>Late fee</dt>
                  <dd className="font-medium tabular-nums">{inr(paying.lateFee)}</dd>
                </div>
              )}
              {paying.discount > 0 && (
                <div className="flex items-center justify-between text-emerald-500">
                  <dt>Discount</dt>
                  <dd className="font-medium tabular-nums">-{inr(paying.discount)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 pt-3 mt-1">
                <dt className="text-base font-semibold text-slate-900 dark:text-white">Total payable</dt>
                <dd className="text-xl font-bold text-brand-700 dark:text-brand-300 tabular-nums">{inr(paying.totalAmount)}</dd>
              </div>
            </dl>

            <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              You'll continue to a secure checkout (UPI, card or net banking).
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setPaying(null)}>Cancel</Button>
              <Button onClick={() => pay(paying)} loading={busy}>
                <CreditCard className="w-4 h-4" /> Continue to pay
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Demo secure checkout (mock mode) */}
      <CheckoutModal
        checkout={checkout}
        onClose={() => setCheckout(null)}
        onDone={() => { setCheckout(null); toast.success('Payment successful 🎉'); load(); }}
      />
    </div>
  );
}
