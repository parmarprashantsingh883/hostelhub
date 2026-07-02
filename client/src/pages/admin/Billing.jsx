import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CreditCard, Check, Sparkles, ShieldCheck, CalendarClock, Building2 } from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Card, Badge, Button, Spinner, Modal, ConfirmDialog, PageHeader, ProgressBar,
  inr, fmtDate,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

const STATE_TONE = { trialing: 'blue', active: 'green', expired: 'red' };
const STATE_LABEL = { trialing: 'Free trial', active: 'Active', expired: 'Expired' };

function UsageMeter({ label, usage }) {
  const unlimited = usage.limit == null;
  const pct = unlimited ? 0 : Math.min(100, Math.round((usage.used / usage.limit) * 100));
  const tone = pct >= 100 ? 'red' : pct >= 80 ? 'amber' : 'brand';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {usage.used} <span className="font-normal text-slate-400">/ {unlimited ? '∞' : usage.limit}</span>
        </span>
      </div>
      {!unlimited && <ProgressBar value={usage.used} max={usage.limit} tone={tone} />}
      {unlimited && <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10" />}
    </div>
  );
}

export default function Billing() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState('monthly');
  const [busyPlan, setBusyPlan] = useState(null);
  const [demoCheckout, setDemoCheckout] = useState(null); // { plan, order, amount, cycle }
  const [payPhase, setPayPhase] = useState('idle'); // idle | processing
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api.get('/billing'), api.get('/billing/plans')]);
      setSummary(s.data.data);
      setPlans(p.data.data.plans || []);
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activate = async (planId, payCycle, ids) => {
    await api.post('/billing/activate', { planId, cycle: payCycle, ...ids });
    toast.success('Plan activated 🎉');
    setDemoCheckout(null);
    setPayPhase('idle');
    load();
  };

  /** checkout → mock: in-app demo gateway · live: Razorpay */
  const choosePlan = async (plan) => {
    setBusyPlan(plan.id);
    try {
      const { data } = await api.post('/billing/checkout', { planId: plan.id, cycle });
      const { mode, keyId, order, amount } = data.data;

      if (mode === 'mock') {
        setDemoCheckout({ plan, order, amount, cycle });
        return;
      }

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
        description: `${plan.name} plan — ${cycle}`,
        order_id: order.id,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: '#2563eb' },
        handler: (resp) =>
          activate(plan.id, cycle, {
            orderId: resp.razorpay_order_id,
            paymentId: resp.razorpay_payment_id,
            signature: resp.razorpay_signature,
          }).catch((err) => toast.error(errMsg(err, 'Verification failed'))),
        modal: { ondismiss: () => toast('Payment cancelled', { icon: 'ℹ️' }) },
      });
      rzp.open();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusyPlan(null);
    }
  };

  const payDemo = async () => {
    setPayPhase('processing');
    try {
      await activate(demoCheckout.plan.id, demoCheckout.cycle, {
        orderId: demoCheckout.order.id,
        paymentId: `pay_demo_${Date.now()}`,
        signature: 'demo',
      });
    } catch (e) {
      toast.error(errMsg(e));
      setPayPhase('idle');
    }
  };

  const cancelPlan = async () => {
    setCanceling(true);
    try {
      const { data } = await api.post('/billing/cancel');
      toast.success(data.message || 'Plan canceled');
      setConfirmCancel(false);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setCanceling(false); }
  };

  if (loading) return <Spinner />;
  if (!summary) return null;

  const { subscription: sub, state, daysLeft, plan, usage, organization } = summary;
  const canceled = sub?.status === 'canceled' || sub?.cancelAtPeriodEnd;

  return (
    <div className="space-y-6">
      <PageHeader title="Billing & Plan" subtitle="Your Quarters subscription, usage and upgrades" />

      {/* Current subscription */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{organization?.name}</p>
              <p className="text-xs text-slate-400">On Quarters since {fmtDate(organization?.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={STATE_TONE[state] || 'gray'}>{STATE_LABEL[state] || state}</Badge>
            {canceled && state !== 'expired' && <Badge tone="yellow">Ends {fmtDate(sub?.currentPeriodEnd || sub?.trialEndsAt)}</Badge>}
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
            <p className="text-xs uppercase tracking-wide text-slate-400">Current plan</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{plan.name}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <CalendarClock className="h-4 w-4" />
              {state === 'trialing' && `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your free trial`}
              {state === 'active' && !canceled && `Renews ${fmtDate(sub?.currentPeriodEnd)} (${sub?.cycle})`}
              {state === 'active' && canceled && `Access until ${fmtDate(sub?.currentPeriodEnd || sub?.trialEndsAt)}`}
              {state === 'expired' && 'Subscription ended — choose a plan below to continue'}
            </p>
            {state !== 'expired' && !canceled && sub?.status !== 'trialing' && (
              <button onClick={() => setConfirmCancel(true)} className="mt-3 text-xs font-medium text-red-500 hover:underline">
                Cancel plan
              </button>
            )}
          </div>
          <div className="space-y-4">
            <UsageMeter label="Rooms" usage={usage.rooms} />
            <UsageMeter label="Residents" usage={usage.residents} />
            <UsageMeter label="Staff" usage={usage.staff} />
          </div>
        </div>
      </Card>

      {/* Plans */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Plans</h2>
        <div className="flex rounded-xl border border-slate-200 p-1 text-sm dark:border-white/10">
          {['monthly', 'yearly'].map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`rounded-lg px-3 py-1.5 font-medium capitalize transition-colors ${
                cycle === c ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {c}{c === 'yearly' && <span className="ml-1 text-[10px] opacity-80">2 mo free</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = plan.id === p.id && state !== 'expired';
          const price = cycle === 'yearly' ? p.priceYearly : p.priceMonthly;
          return (
            <Card key={p.id} className={p.popular ? 'ring-2 ring-brand-500' : ''}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900 dark:text-white">{p.name}</p>
                {p.popular && (
                  <Badge tone="blue"><span className="flex items-center gap-1"><Sparkles className="h-3 w-3" />Popular</span></Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{p.tagline}</p>
              <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
                {inr(price)}<span className="text-sm font-normal text-slate-400">/{cycle === 'yearly' ? 'yr' : 'mo'}</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />{f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-5 w-full"
                variant={isCurrent ? 'secondary' : p.popular ? 'primary' : 'secondary'}
                disabled={isCurrent}
                loading={busyPlan === p.id}
                onClick={() => choosePlan(p)}
              >
                {isCurrent ? 'Current plan' : state === 'expired' ? 'Renew' : 'Choose plan'}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Billing history */}
      {(sub?.history || []).length > 0 && (
        <Card title="Billing history">
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {[...sub.history].reverse().map((h, i) => (
              <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <CreditCard className="h-4 w-4 text-slate-400" />
                  {h.event === 'trial_started' && 'Free trial started'}
                  {h.event === 'plan_activated' && `${(h.planId || '').replace(/^./, (m) => m.toUpperCase())} plan activated (${h.cycle})`}
                  {h.event === 'plan_canceled' && 'Plan canceled'}
                </span>
                <span className="flex items-center gap-3">
                  {h.amount > 0 && <span className="font-semibold text-slate-700 dark:text-slate-200">{inr(h.amount)}</span>}
                  <span className="text-xs text-slate-400">{fmtDate(h.at)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Demo-gateway checkout (mock mode) */}
      <Modal open={!!demoCheckout} onClose={payPhase === 'processing' ? undefined : () => setDemoCheckout(null)} title="Secure checkout">
        {demoCheckout && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-white/5">
              <div className="flex justify-between"><span className="text-slate-500">Plan</span><span className="font-semibold text-slate-800 dark:text-slate-100">{demoCheckout.plan.name} · {demoCheckout.cycle}</span></div>
              <div className="mt-2 flex justify-between"><span className="text-slate-500">Total</span><span className="font-bold text-slate-900 dark:text-white">{inr(demoCheckout.amount)}</span></div>
            </div>
            <p className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4" /> Demo gateway — no card is charged. With live Razorpay keys this opens the real checkout.
            </p>
            <Button className="w-full" size="lg" loading={payPhase === 'processing'} onClick={payDemo}>
              Pay {inr(demoCheckout.amount)}
            </Button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={cancelPlan}
        loading={canceling}
        title="Cancel your plan?"
        message="You keep full access until the end of the period you've paid for. After that, your data stays safe but changes are locked until you renew."
        confirmLabel="Cancel plan"
      />
    </div>
  );
}
