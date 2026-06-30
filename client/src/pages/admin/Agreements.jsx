import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FileSignature, Plus, FileDown, Trash2, CheckCircle2, Clock, Send,
} from 'lucide-react';
import { api, errMsg, assetUrl } from '../../api/client';
import {
  Button, Card, Badge, Field, Input, Select, Textarea, Modal, ConfirmDialog, TableSkeleton,
  EmptyState, StatCard, Avatar, Table, TableRow, Td, PageHeader, inr, fmtDate,
} from '../../components/ui';

const STATUS_TONE = { draft: 'gray', sent: 'yellow', signed: 'green', cancelled: 'red' };
const cap = (s) => String(s || '').replace(/\b\w/g, (m) => m.toUpperCase());
const todayISO = () => new Date().toISOString().slice(0, 10);
const EMPTY = { tenantId: '', rentAmount: '', depositAmount: '', dueDay: 5, durationMonths: 11, startDate: todayISO(), terms: '' };

export default function Agreements() {
  const [agreements, setAgreements] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/agreements');
      setAgreements(data.data.agreements);
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/tenants', { params: { limit: 200, status: 'active' } }).then(({ data }) => setTenants(data.data.tenants || [])).catch(() => {}); }, []);

  const onPickTenant = (id) => {
    const t = tenants.find((x) => x._id === id);
    setForm((f) => ({ ...f, tenantId: id, rentAmount: t?.tenantProfile?.rentAmount ?? '', depositAmount: t?.tenantProfile?.securityDeposit ?? '' }));
  };

  const create = async () => {
    if (!form.tenantId) return toast.error('Pick a resident');
    setBusy(true);
    try {
      await api.post('/agreements', {
        tenantId: form.tenantId, rentAmount: Number(form.rentAmount) || 0, depositAmount: Number(form.depositAmount) || 0,
        dueDay: Number(form.dueDay) || 5, durationMonths: Number(form.durationMonths) || 11, startDate: form.startDate, terms: form.terms.trim(),
      });
      toast.success('Agreement generated & sent');
      setForm(null);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const download = async (a) => {
    try { const { data } = await api.get(`/agreements/${a._id}/pdf`); window.open(assetUrl(data.data.pdfUrl), '_blank', 'noopener'); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const doDelete = async () => {
    setBusy(true);
    try { await api.delete(`/agreements/${del._id}`); toast.success('Agreement deleted'); setDel(null); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const sent = agreements.filter((a) => a.status === 'sent').length;
  const signed = agreements.filter((a) => a.status === 'signed').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agreements"
        subtitle="Generate, send and track e-signed rental agreements"
        action={<Button onClick={() => setForm({ ...EMPTY })}><Plus className="w-4 h-4" /> New agreement</Button>}
      />

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={FileSignature} accent label="Agreements" value={agreements.length} sub="All" />
        <StatCard icon={Clock} tone="amber" label="Awaiting signature" value={sent} sub="Sent, unsigned" />
        <StatCard icon={CheckCircle2} tone="green" label="Signed" value={signed} sub="Completed" />
      </div>

      <Card>
        {loading ? (
          <TableSkeleton cols={6} />
        ) : agreements.length === 0 ? (
          <EmptyState icon={FileSignature} title="No agreements yet" message="Generate a rental agreement and send it to a resident to e-sign." action={<Button onClick={() => setForm({ ...EMPTY })}><Plus className="w-4 h-4" /> New agreement</Button>} />
        ) : (
          <Table headers={['Resident', 'Room', 'Rent', 'Deposit', 'Status', 'Signed', '']}>
            {agreements.map((a) => (
              <TableRow key={a._id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={a.tenantId?.name} size="sm" />
                    <div className="min-w-0"><p className="font-semibold text-slate-900 dark:text-white truncate">{a.tenantId?.name || '—'}</p><p className="text-xs text-slate-400 truncate">{a.tenantId?.email}</p></div>
                  </div>
                </Td>
                <Td className="text-slate-600 dark:text-slate-300">{a.roomId?.roomNumber ? `Room ${a.roomId.roomNumber}` : '—'}</Td>
                <Td className="tabular-nums">{inr(a.rentAmount)}</Td>
                <Td className="tabular-nums">{inr(a.depositAmount)}</Td>
                <Td><Badge tone={STATUS_TONE[a.status]}>{cap(a.status)}</Badge></Td>
                <Td className="text-xs text-slate-500">{a.signedAt ? fmtDate(a.signedAt) : '—'}</Td>
                <Td>
                  <div className="flex gap-1">
                    <button onClick={() => download(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-white/5" title="Download PDF"><FileDown className="w-4 h-4" /></button>
                    {a.status !== 'signed' && <button onClick={() => setDel(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-white/5" title="Delete"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </Td>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title="New rental agreement">
        {form && (
          <div className="space-y-4">
            <Field label="Resident" required>
              <Select value={form.tenantId} onChange={(e) => onPickTenant(e.target.value)}>
                <option value="">— Select resident —</option>
                {tenants.map((t) => <option key={t._id} value={t._id}>{t.name}{t.tenantProfile?.roomId?.roomNumber ? ` · Room ${t.tenantProfile.roomId.roomNumber}` : ''}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Monthly rent (₹)"><Input type="number" min={0} value={form.rentAmount} onChange={(e) => setForm((f) => ({ ...f, rentAmount: e.target.value }))} /></Field>
              <Field label="Security deposit (₹)"><Input type="number" min={0} value={form.depositAmount} onChange={(e) => setForm((f) => ({ ...f, depositAmount: e.target.value }))} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Start date"><Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></Field>
              <Field label="Term (months)"><Input type="number" min={1} max={60} value={form.durationMonths} onChange={(e) => setForm((f) => ({ ...f, durationMonths: e.target.value }))} /></Field>
              <Field label="Rent due day"><Input type="number" min={1} max={28} value={form.dueDay} onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))} /></Field>
            </div>
            <Field label="Extra clauses" hint="Optional — appended to the standard terms"><Textarea value={form.terms} onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))} placeholder="e.g. Pets not allowed; parking slot #4 assigned." /></Field>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button onClick={create} loading={busy}><Send className="w-4 h-4" /> Generate & send</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={doDelete} loading={busy} title="Delete agreement?" message={del ? `The agreement for ${del.tenantId?.name} will be removed.` : ''} confirmLabel="Delete" />
    </div>
  );
}
