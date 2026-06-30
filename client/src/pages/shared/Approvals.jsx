import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle2, XCircle, Clock, Plus, Trash2, IndianRupee, ClipboardCheck, ListChecks,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Badge, Field, Input, Select, Textarea, Modal, Spinner, EmptyState,
  PageHeader, StatCard, Avatar, inr, fmtDate,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

const TYPES = ['expense', 'purchase', 'discount', 'refund', 'leave', 'other'];
const EXPENSE_CATS = ['maintenance', 'utilities', 'salaries', 'supplies', 'rent', 'marketing', 'other'];
const cap = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const TYPE_TONE = { expense: 'blue', purchase: 'blue', discount: 'indigo', refund: 'yellow', leave: 'gray', other: 'gray' };
const STATUS_TONE = { pending: 'yellow', approved: 'green', rejected: 'red' };
const FILTERS = ['all', 'pending', 'approved', 'rejected'];
const isExpenseType = (t) => t === 'expense' || t === 'purchase';
const EMPTY = { type: 'expense', title: '', amount: '', expenseCategory: 'supplies', reason: '' };

export default function Approvals() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [approvals, setApprovals] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(null);
  const [reject, setReject] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/approvals');
      setApprovals(data.data.approvals);
      setCounts(data.data.counts || {});
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.title.trim()) return toast.error('A title is required');
    setBusy(true);
    try {
      await api.post('/approvals', {
        type: form.type, title: form.title.trim(), amount: Number(form.amount) || 0,
        expenseCategory: form.expenseCategory, reason: form.reason.trim(),
      });
      toast.success('Request submitted');
      setForm(null);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const decide = async (a, decision, note = '') => {
    setBusy(true);
    try {
      await api.put(`/approvals/${a._id}/decision`, { decision, note });
      toast.success(`Request ${decision}`);
      setReject(null); setRejectNote('');
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const remove = async (a) => {
    try { await api.delete(`/approvals/${a._id}`); toast.success('Request withdrawn'); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const list = filter === 'all' ? approvals : approvals.filter((a) => a.status === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        subtitle={isAdmin ? 'Review and sign off requests from your team' : 'Raise and track your requests'}
        action={<Button onClick={() => setForm({ ...EMPTY })}><Plus className="w-4 h-4" /> New request</Button>}
      />

      {loading ? <Spinner /> : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={Clock} tone="amber" label="Pending" value={counts.pending || 0} sub={isAdmin ? 'Awaiting your sign-off' : 'Awaiting review'} />
            <StatCard icon={CheckCircle2} tone="green" label="Approved" value={counts.approved || 0} sub="Signed off" />
            <StatCard icon={XCircle} tone="red" label="Rejected" value={counts.rejected || 0} sub="Declined" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filter === f ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'}`}>
                {cap(f)}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <Card><EmptyState icon={ListChecks} title="No requests" message={isAdmin ? 'Requests from your team will appear here.' : 'Raise a request to get admin sign-off.'} action={<Button onClick={() => setForm({ ...EMPTY })}><Plus className="w-4 h-4" /> New request</Button>} /></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map((a) => {
                const mine = String(a.requestedBy?._id || a.requestedBy) === String(user?._id);
                return (
                  <div key={a._id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-white/10 dark:bg-surface">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white">{a.title}</p>
                      <Badge tone={STATUS_TONE[a.status]}>{cap(a.status)}</Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                      <Badge tone={TYPE_TONE[a.type] || 'gray'}>{cap(a.type)}</Badge>
                      {a.amount > 0 && <span className="inline-flex items-center gap-0.5 font-semibold text-slate-700 dark:text-slate-200"><IndianRupee className="w-3 h-3" />{inr(a.amount)}</span>}
                      {isExpenseType(a.type) && a.amount > 0 && <span className="text-slate-400">· {cap(a.expenseCategory)}</span>}
                    </div>
                    {a.reason && <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{a.reason}</p>}
                    <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-400">
                      <Avatar name={a.requestedBy?.name} size="xs" />
                      <span>{mine ? 'You' : a.requestedBy?.name}{a.requestedBy?.role ? ` · ${cap(a.requestedBy.role)}` : ''}</span>
                    </div>
                    {a.status !== 'pending' && (
                      <p className="mt-2 rounded-lg bg-slate-50 dark:bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {cap(a.status)} by {a.decidedBy?.name || 'admin'} · {a.decidedAt ? fmtDate(a.decidedAt) : ''}{a.decisionNote ? ` — “${a.decisionNote}”` : ''}{a.expenseId ? ' · posted to P&L' : ''}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 dark:border-white/10 pt-3">
                      {isAdmin && a.status === 'pending' && (
                        <>
                          <Button size="sm" variant="success" onClick={() => decide(a, 'approved')} loading={busy}><CheckCircle2 className="w-3.5 h-3.5" /> Approve</Button>
                          <Button size="sm" variant="danger" onClick={() => { setReject(a); setRejectNote(''); }}><XCircle className="w-3.5 h-3.5" /> Reject</Button>
                        </>
                      )}
                      {!isAdmin && mine && a.status === 'pending' && (
                        <button onClick={() => remove(a)} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /> Withdraw</button>
                      )}
                      {a.status === 'pending' && !isAdmin && <span className="text-xs text-amber-500 inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Awaiting review</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* New request */}
      <Modal open={!!form} onClose={() => setForm(null)} title="New approval request">
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type"><Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>{TYPES.map((t) => <option key={t} value={t}>{cap(t)}</option>)}</Select></Field>
              <Field label="Amount (₹)" hint="Optional"><Input type="number" min={0} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></Field>
            </div>
            <Field label="Title" required><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. New mattresses for dorm 204" /></Field>
            {isExpenseType(form.type) && (
              <Field label="Expense category" hint="Where it posts if approved">
                <Select value={form.expenseCategory} onChange={(e) => setForm((f) => ({ ...f, expenseCategory: e.target.value }))}>{EXPENSE_CATS.map((c) => <option key={c} value={c}>{cap(c)}</option>)}</Select>
              </Field>
            )}
            <Field label="Reason"><Textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Why is this needed?" /></Field>
            {isExpenseType(form.type) && Number(form.amount) > 0 && (
              <p className="flex items-center gap-2 rounded-lg bg-brand-50 dark:bg-brand-500/15 px-3 py-2 text-xs text-brand-700 dark:text-brand-200"><ClipboardCheck className="w-3.5 h-3.5" /> If approved, {inr(Number(form.amount))} posts to {cap(form.expenseCategory)} in your P&L.</p>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button onClick={create} loading={busy}>Submit request</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject with note */}
      <Modal open={!!reject} onClose={() => setReject(null)} title="Reject request">
        {reject && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Decline <span className="font-semibold text-slate-800 dark:text-slate-100">{reject.title}</span>.</p>
            <Field label="Reason" hint="Optional — shared with the requester"><Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Why is this declined?" /></Field>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setReject(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => decide(reject, 'rejected', rejectNote.trim())} loading={busy}><XCircle className="w-4 h-4" /> Reject</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
