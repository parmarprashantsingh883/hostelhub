import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Building2, ReceiptIndianRupee, Wallet, IndianRupee, BellRing, Save } from 'lucide-react';
import { api, errMsg } from '../../api/client';
import { Button, Card, Field, Input, Select, Textarea, Spinner, PageHeader } from '../../components/ui';

function Switch({ on, onChange, label, hint }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
        {hint && <span className="block text-xs text-slate-400">{hint}</span>}
      </span>
      <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-slate-300 dark:bg-white/15'}`}>
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}

export default function Settings() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/settings');
      setForm(data.data.settings);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setText = (section, key) => (e) => setForm((f) => ({ ...f, [section]: { ...f[section], [key]: e.target.value } }));
  const setNum = (section, key) => (e) => setForm((f) => ({ ...f, [section]: { ...f[section], [key]: e.target.value === '' ? '' : Number(e.target.value) } }));
  const setToggle = (key) => (val) => setForm((f) => ({ ...f, notifications: { ...f.notifications, [key]: val } }));

  const save = async () => {
    setBusy(true);
    try {
      const { business, rent, deposit, payments, notifications } = form;
      const { data } = await api.put('/settings', { business, rent, deposit, payments, notifications });
      setForm(data.data.settings);
      toast.success('Settings saved');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" subtitle="Property profile, billing rules and notification channels" />
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Configure your property — the whole app reads from here"
        action={<Button onClick={save} loading={busy}><Save className="h-4 w-4" /> Save changes</Button>}
      />

      {/* Property profile */}
      <Card title="Property profile">
        <p className="-mt-1 mb-4 flex items-center gap-2 text-xs text-slate-400">
          <Building2 className="h-3.5 w-3.5" /> Shown on receipts, invoices and the tenant portal.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Property / business name" required>
            <Input value={form.business.name} onChange={setText('business', 'name')} placeholder="e.g. Sunrise PG" />
          </Field>
          <Field label="GSTIN" hint="Optional — printed on receipts">
            <Input value={form.business.gstin} onChange={setText('business', 'gstin')} placeholder="29ABCDE1234F1Z5" />
          </Field>
          <Field label="Contact email">
            <Input type="email" value={form.business.email} onChange={setText('business', 'email')} placeholder="hello@yourpg.com" />
          </Field>
          <Field label="Contact phone">
            <Input value={form.business.phone} onChange={setText('business', 'phone')} placeholder="+91 90000 00000" />
          </Field>
        </div>
        <Field label="Address" className="mt-4">
          <Textarea value={form.business.address} onChange={setText('business', 'address')} placeholder="Building, street, area, city, PIN" />
        </Field>
      </Card>

      {/* Rent & billing */}
      <Card title="Rent & billing">
        <p className="-mt-1 mb-4 flex items-center gap-2 text-xs text-slate-400">
          <ReceiptIndianRupee className="h-3.5 w-3.5" /> Defaults applied when you generate monthly rent and bill electricity.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Rent due day" hint="Day of month (1–28)">
            <Input type="number" min={1} max={28} value={form.rent.dueDay} onChange={setNum('rent', 'dueDay')} />
          </Field>
          <Field label="Grace days" hint="Before overdue">
            <Input type="number" min={0} max={30} value={form.rent.graceDays} onChange={setNum('rent', 'graceDays')} />
          </Field>
          <Field label="Electricity rate ₹/unit">
            <Input type="number" min={0} step="0.5" value={form.rent.electricityRatePerUnit} onChange={setNum('rent', 'electricityRatePerUnit')} />
          </Field>
          <Field label="Late fee">
            <Select value={form.rent.lateFeeMode} onChange={setText('rent', 'lateFeeMode')}>
              <option value="none">No late fee</option>
              <option value="flat">Flat amount (₹)</option>
              <option value="percent">Percent of rent (%)</option>
            </Select>
          </Field>
          {form.rent.lateFeeMode !== 'none' && (
            <Field label={form.rent.lateFeeMode === 'flat' ? 'Late fee amount (₹)' : 'Late fee (%)'}>
              <Input type="number" min={0} value={form.rent.lateFeeValue} onChange={setNum('rent', 'lateFeeValue')} />
            </Field>
          )}
        </div>
      </Card>

      {/* Deposit */}
      <Card title="Security deposit">
        <p className="-mt-1 mb-4 flex items-center gap-2 text-xs text-slate-400">
          <Wallet className="h-3.5 w-3.5" /> Default deposit suggested when reserving a bed / moving a resident in.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Default deposit" hint="In months of rent">
            <Input type="number" min={0} max={12} value={form.deposit.defaultMonths} onChange={setNum('deposit', 'defaultMonths')} />
          </Field>
        </div>
        <Field label="Refund policy note" hint="Shown on the settlement / move-out screen" className="mt-4">
          <Textarea value={form.deposit.policyNote} onChange={setText('deposit', 'policyNote')} placeholder="e.g. Refundable within 15 days of move-out, after deductions." />
        </Field>
      </Card>

      {/* Payments */}
      <Card title="Payments (UPI)">
        <p className="-mt-1 mb-4 flex items-center gap-2 text-xs text-slate-400">
          <IndianRupee className="h-3.5 w-3.5" /> Drives the tenant "scan to pay" QR. Leave blank to hide it.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="UPI ID (VPA)" hint="e.g. yourpg@okhdfcbank">
            <Input value={form.payments.upiVpa} onChange={setText('payments', 'upiVpa')} placeholder="yourpg@okhdfcbank" />
          </Field>
          <Field label="Payee name" hint="Shown in the payer's UPI app">
            <Input value={form.payments.upiPayeeName} onChange={setText('payments', 'upiPayeeName')} placeholder="Defaults to property name" />
          </Field>
        </div>
      </Card>

      {/* Notifications */}
      <Card title="Notification channels">
        <p className="-mt-1 mb-4 flex items-center gap-2 text-xs text-slate-400">
          <BellRing className="h-3.5 w-3.5" /> Which channels are available when reminding tenants.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Switch on={form.notifications.email} onChange={setToggle('email')} label="Email" hint="In-app + email reminders" />
          <Switch on={form.notifications.whatsapp} onChange={setToggle('whatsapp')} label="WhatsApp" hint="Free click-to-send links" />
          <Switch on={form.notifications.sms} onChange={setToggle('sms')} label="SMS" hint="Free click-to-send links" />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} loading={busy} size="lg"><Save className="h-4 w-4" /> Save changes</Button>
      </div>
    </div>
  );
}
