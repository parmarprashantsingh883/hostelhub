import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  ClipboardCheck, Plus, LogIn, LogOut, IndianRupee, CheckCircle2, Trash2, AlertTriangle, Home,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Badge, Field, Input, Select, Textarea, Modal, Drawer, ConfirmDialog,
  Spinner, EmptyState, PageHeader, StatCard, inr, fmtDate,
} from '../../components/ui';

const CONDITIONS = ['good', 'fair', 'damaged', 'missing'];
const COND_TONE = { good: 'green', fair: 'yellow', damaged: 'red', missing: 'gray' };
const cap = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const TYPE = { move_in: { label: 'Move-in', icon: LogIn, tone: 'blue' }, move_out: { label: 'Move-out', icon: LogOut, tone: 'indigo' } };
const totalDeductions = (items) => (items || []).reduce((s, i) => s + (Number(i.deduction) || 0), 0);
const issuesOf = (items) => (items || []).filter((i) => i.condition === 'damaged' || i.condition === 'missing').length;

export default function Inspections() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [moveInTenants, setMoveInTenants] = useState([]);
  const [moveOutTenants, setMoveOutTenants] = useState([]);

  const [createForm, setCreateForm] = useState(null); // { type, tenantId }
  const [editor, setEditor] = useState(null); // open inspection
  const [items, setItems] = useState([]);
  const [overallNote, setOverallNote] = useState('');
  const [delTarget, setDelTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/inspections');
      setInspections(data.data.inspections);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/tenants', { params: { limit: 200 } }).then(({ data }) => setMoveInTenants(data.data.tenants || [])).catch(() => {});
    api.get('/settlements/queue').then(({ data }) => setMoveOutTenants(data.data.queue || [])).catch(() => {});
  }, []);

  const openEditor = (insp) => {
    setEditor(insp);
    setItems((insp.items || []).map((i) => ({ ...i })));
    setOverallNote(insp.overallNote || '');
  };

  const create = async () => {
    if (!createForm.tenantId) return toast.error('Pick a resident');
    setBusy(true);
    try {
      const { data } = await api.post('/inspections', { type: createForm.type, tenantId: createForm.tenantId });
      setCreateForm(null);
      openEditor(data.data.inspection);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const setItem = (idx, patch) => setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.put(`/inspections/${editor._id}`, { items, overallNote });
      setEditor(data.data.inspection);
      toast.success('Inspection saved');
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const complete = async () => {
    setBusy(true);
    try {
      // persist edits first, then finalise
      await api.put(`/inspections/${editor._id}`, { items, overallNote });
      const { data } = await api.put(`/inspections/${editor._id}/complete`);
      const d = data.data;
      if (d.postedToLedger) toast.success(`Completed · ${inr(totalDeductions(items))} posted to the deposit`);
      else if (d.ledgerClosed) toast('Completed — settlement already closed, deductions not posted', { icon: 'ℹ️' });
      else toast.success('Inspection completed');
      setEditor(null);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const doDelete = async () => {
    setBusy(true);
    try { await api.delete(`/inspections/${delTarget._id}`); toast.success('Inspection deleted'); setDelTarget(null); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const completedCount = inspections.filter((i) => i.status === 'completed').length;
  const draftCount = inspections.filter((i) => i.status === 'draft').length;
  const tenantOptions = createForm?.type === 'move_out' ? moveOutTenants : moveInTenants;
  const isDraft = editor?.status === 'draft';
  const dedTotal = totalDeductions(items);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspections"
        subtitle="Move-in & move-out room condition reports"
        action={<Button onClick={() => setCreateForm({ type: 'move_in', tenantId: '' })}><Plus className="w-4 h-4" /> New inspection</Button>}
      />

      {loading ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={ClipboardCheck} accent label="Inspections" value={inspections.length} sub="All reports" />
            <StatCard icon={AlertTriangle} label="Drafts" value={draftCount} sub="In progress" />
            <StatCard icon={CheckCircle2} label="Completed" value={completedCount} sub="Finalised" />
          </div>

          {inspections.length === 0 ? (
            <Card><EmptyState icon={ClipboardCheck} title="No inspections yet" message="Record a room's condition at move-in or move-out." action={<Button onClick={() => setCreateForm({ type: 'move_in', tenantId: '' })}><Plus className="w-4 h-4" /> New inspection</Button>} /></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {inspections.map((it) => {
                const T = TYPE[it.type] || TYPE.move_in;
                const issues = issuesOf(it.items);
                const ded = totalDeductions(it.items);
                return (
                  <button key={it._id} onClick={() => openEditor(it)} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-card transition-colors hover:border-brand-200 dark:border-white/10 dark:bg-surface dark:hover:border-white/20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">{it.tenantId?.name || '—'}</p>
                        <p className="text-xs text-slate-400">{it.roomId?.roomNumber ? `Room ${it.roomId.roomNumber}` : 'No room'} · {fmtDate(it.createdAt)}</p>
                      </div>
                      <Badge tone={T.tone}>{T.label}</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <Badge tone={it.status === 'completed' ? 'green' : 'yellow'}>{cap(it.status)}</Badge>
                      {issues > 0 && <span className="text-rose-500 font-medium">{issues} issue{issues === 1 ? '' : 's'}</span>}
                      {ded > 0 && <span className="ml-auto inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200"><IndianRupee className="w-3 h-3" />{inr(ded)}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create modal */}
      <Modal open={!!createForm} onClose={() => setCreateForm(null)} title="New inspection">
        {createForm && (
          <div className="space-y-4">
            <Field label="Type">
              <Select value={createForm.type} onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value, tenantId: '' }))}>
                <option value="move_in">Move-in</option>
                <option value="move_out">Move-out</option>
              </Select>
            </Field>
            <Field label="Resident" required hint={createForm.type === 'move_out' ? 'Residents in the move-out queue' : 'Active residents'}>
              <Select value={createForm.tenantId} onChange={(e) => setCreateForm((f) => ({ ...f, tenantId: e.target.value }))}>
                <option value="">— Select resident —</option>
                {tenantOptions.map((t) => <option key={t._id} value={t._id}>{t.name}{t.room?.roomNumber ? ` · Room ${t.room.roomNumber}` : ''}</option>)}
              </Select>
            </Field>
            <p className="flex items-center gap-2 text-xs text-slate-400"><Home className="w-3.5 h-3.5" /> A standard room checklist is created automatically — you fill in the condition next.</p>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={() => setCreateForm(null)}>Cancel</Button>
              <Button onClick={create} loading={busy}>Create & inspect</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Checklist editor */}
      <Drawer
        open={!!editor}
        onClose={() => setEditor(null)}
        title={editor ? `${TYPE[editor.type]?.label} inspection` : ''}
        subtitle={editor ? `${editor.tenantId?.name || ''}${editor.roomId?.roomNumber ? ` · Room ${editor.roomId.roomNumber}` : ''}` : ''}
        footer={editor && isDraft ? (
          <div className="flex items-center gap-3">
            {editor.type === 'move_out' && <span className="text-sm text-slate-500 dark:text-slate-400">Deductions: <span className="font-bold text-slate-900 dark:text-white">{inr(dedTotal)}</span></span>}
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" onClick={save} loading={busy}>Save draft</Button>
              <Button onClick={complete} loading={busy}><CheckCircle2 className="w-4 h-4" /> Complete</Button>
            </div>
          </div>
        ) : null}
      >
        {editor && (
          <div className="space-y-3">
            {editor.status === 'completed' && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/15 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                Completed {editor.completedAt ? fmtDate(editor.completedAt) : ''}{editor.postedToLedger ? ` · ${inr(totalDeductions(items))} posted to the deposit` : ''} — read-only.
              </div>
            )}
            {items.map((it, idx) => {
              const flagged = it.condition === 'damaged' || it.condition === 'missing';
              return (
                <div key={idx} className="rounded-xl border border-slate-200 dark:border-white/10 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{it.label}</span>
                    {isDraft ? (
                      <select
                        value={it.condition}
                        onChange={(e) => setItem(idx, { condition: e.target.value, ...(e.target.value === 'good' || e.target.value === 'fair' ? { deduction: 0 } : {}) })}
                        className="h-8 rounded-lg border border-slate-300 dark:border-white/15 dark:bg-surface2 dark:text-white px-2 text-xs focus:outline-none focus:border-brand-500"
                      >
                        {CONDITIONS.map((c) => <option key={c} value={c}>{cap(c)}</option>)}
                      </select>
                    ) : (
                      <Badge tone={COND_TONE[it.condition]}>{cap(it.condition)}</Badge>
                    )}
                  </div>
                  {flagged && (
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      {isDraft ? (
                        <>
                          <Input type="number" min={0} value={it.deduction || ''} onChange={(e) => setItem(idx, { deduction: Number(e.target.value) || 0 })} placeholder="Deduction ₹" />
                          <Input value={it.note || ''} onChange={(e) => setItem(idx, { note: e.target.value })} placeholder="Note" />
                        </>
                      ) : (
                        <>
                          {it.deduction > 0 && <span className="text-xs font-semibold text-rose-500">− {inr(it.deduction)}</span>}
                          {it.note && <span className="text-xs text-slate-500 dark:text-slate-400">{it.note}</span>}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <Field label="Overall note" className="pt-1">
              {isDraft ? (
                <Textarea value={overallNote} onChange={(e) => setOverallNote(e.target.value)} placeholder="Any overall remarks…" />
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">{overallNote || <span className="text-slate-400">—</span>}</p>
              )}
            </Field>

            {isDraft && (
              <button onClick={() => { setDelTarget(editor); }} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600">
                <Trash2 className="w-3.5 h-3.5" /> Delete this draft
              </button>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog open={!!delTarget} onClose={() => setDelTarget(null)} onConfirm={async () => { await doDelete(); setEditor(null); }} loading={busy} title="Delete inspection draft?" message="This draft will be permanently removed." confirmLabel="Delete" />
    </div>
  );
}
