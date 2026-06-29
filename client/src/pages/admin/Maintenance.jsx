import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Wrench, Plus, Store, Phone, Play, Ban, Trash2, Pencil, ClipboardList,
  CheckCircle2, Clock, IndianRupee, ListChecks,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Badge, Field, Input, Select, Textarea, Modal, ConfirmDialog,
  Spinner, EmptyState, PageHeader, StatCard, inr, fmtDate,
} from '../../components/ui';

const CATEGORIES = ['electrical', 'plumbing', 'carpentry', 'cleaning', 'appliance', 'internet', 'pest_control', 'painting', 'security', 'general'];
const catLabel = (c) => String(c || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const WO_STATUS = {
  open: { label: 'Open', tone: 'gray' },
  assigned: { label: 'Assigned', tone: 'indigo' },
  in_progress: { label: 'In progress', tone: 'blue' },
  completed: { label: 'Completed', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'red' },
};
const PRIORITY = { low: 'text-slate-400', medium: 'text-amber-500', high: 'text-rose-500' };
const FILTERS = ['all', 'open', 'assigned', 'in_progress', 'completed', 'cancelled'];

const EMPTY_WO = { title: '', description: '', category: 'general', priority: 'medium', vendorId: '', roomId: '', scheduledFor: '', cost: '', complaintId: '' };
const EMPTY_VENDOR = { name: '', category: 'general', phone: '', email: '', notes: '' };

export default function Maintenance() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('orders');
  const [filter, setFilter] = useState('all');
  const [workOrders, setWorkOrders] = useState([]);
  const [counts, setCounts] = useState({});
  const [vendors, setVendors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [woForm, setWoForm] = useState(null); // create/edit work order
  const [completeWO, setCompleteWO] = useState(null);
  const [completeCost, setCompleteCost] = useState('');
  const [delWO, setDelWO] = useState(null);
  const [vendorForm, setVendorForm] = useState(null);
  const [delVendor, setDelVendor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wo, ve] = await Promise.all([api.get('/work-orders'), api.get('/vendors')]);
      setWorkOrders(wo.data.data.workOrders);
      setCounts(wo.data.data.counts || {});
      setVendors(ve.data.data.vendors);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Support links for the create form (rooms + open complaints).
  useEffect(() => {
    api.get('/rooms', { params: { limit: 200 } }).then(({ data }) => setRooms(data.data.rooms || [])).catch(() => {});
    api.get('/complaints').then(({ data }) => setComplaints((data.data.complaints || []).filter((c) => c.status !== 'resolved' && c.status !== 'rejected'))).catch(() => {});
  }, []);

  // Deep link from a complaint: /admin/maintenance?complaint=<id> opens a prefilled WO.
  useEffect(() => {
    const cid = params.get('complaint');
    if (!cid || !complaints.length) return;
    const c = complaints.find((x) => x._id === cid);
    setWoForm({ ...EMPTY_WO, complaintId: cid, title: c?.title || '', description: c?.description || '', roomId: c?.roomId?._id || c?.roomId || '' });
    params.delete('complaint');
    setParams(params, { replace: true });
  }, [complaints]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeVendors = vendors.filter((v) => v.isActive);
  const woList = filter === 'all' ? workOrders : workOrders.filter((w) => w.status === filter);

  // ── work-order actions ──
  const saveWO = async () => {
    if (!woForm.title && !woForm.complaintId) return toast.error('A title is required');
    setBusy(true);
    try {
      const payload = {
        title: woForm.title, description: woForm.description, category: woForm.category, priority: woForm.priority,
        vendorId: woForm.vendorId || null, roomId: woForm.roomId || null,
        scheduledFor: woForm.scheduledFor || null, cost: Number(woForm.cost) || 0,
        ...(woForm.complaintId ? { complaintId: woForm.complaintId } : {}),
      };
      if (woForm._id) await api.put(`/work-orders/${woForm._id}`, payload);
      else await api.post('/work-orders', payload);
      toast.success(woForm._id ? 'Work order updated' : 'Work order created');
      setWoForm(null);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const setStatus = async (wo, status) => {
    try {
      await api.put(`/work-orders/${wo._id}/status`, { status });
      toast.success(`Marked ${WO_STATUS[status].label.toLowerCase()}`);
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const doComplete = async () => {
    setBusy(true);
    try {
      await api.put(`/work-orders/${completeWO._id}/status`, { status: 'completed', cost: Number(completeCost) || 0 });
      toast.success(Number(completeCost) > 0 ? `Completed · ${inr(completeCost)} logged to P&L` : 'Completed');
      setCompleteWO(null); setCompleteCost('');
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const doDeleteWO = async () => {
    setBusy(true);
    try { await api.delete(`/work-orders/${delWO._id}`); toast.success('Work order deleted'); setDelWO(null); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  // ── vendor actions ──
  const saveVendor = async () => {
    if (!vendorForm.name) return toast.error('Vendor name is required');
    setBusy(true);
    try {
      const payload = { name: vendorForm.name, category: vendorForm.category, phone: vendorForm.phone, email: vendorForm.email, notes: vendorForm.notes };
      if (vendorForm._id) await api.put(`/vendors/${vendorForm._id}`, payload);
      else await api.post('/vendors', payload);
      toast.success(vendorForm._id ? 'Vendor updated' : 'Vendor added');
      setVendorForm(null);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const toggleVendor = async (v) => {
    try { await api.put(`/vendors/${v._id}`, { isActive: !v.isActive }); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const doDeleteVendor = async () => {
    setBusy(true);
    try { await api.delete(`/vendors/${delVendor._id}`); toast.success('Vendor removed'); setDelVendor(null); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const TabBtn = ({ id, icon: Icon, label }) => (
    <button onClick={() => setTab(id)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 h-9 text-sm font-medium transition-colors ${tab === id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        subtitle="Work orders and your service-vendor directory"
        action={tab === 'orders'
          ? <Button onClick={() => setWoForm({ ...EMPTY_WO })}><Plus className="w-4 h-4" /> New work order</Button>
          : <Button onClick={() => setVendorForm({ ...EMPTY_VENDOR })}><Plus className="w-4 h-4" /> Add vendor</Button>}
      />

      <div className="flex gap-2">
        <TabBtn id="orders" icon={ListChecks} label="Work orders" />
        <TabBtn id="vendors" icon={Store} label={`Vendors (${vendors.length})`} />
      </div>

      {loading ? <Spinner /> : tab === 'orders' ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Clock} tone="amber" label="Open" value={(counts.open || 0) + (counts.assigned || 0)} sub="Awaiting / assigned" />
            <StatCard icon={Wrench} tone="blue" label="In progress" value={counts.in_progress || 0} sub="Being worked on" />
            <StatCard icon={CheckCircle2} tone="green" label="Completed" value={counts.completed || 0} sub="Done" />
            <StatCard icon={Store} tone="indigo" label="Vendors" value={activeVendors.length} sub="Active providers" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filter === f ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'}`}>
                {f === 'all' ? 'All' : WO_STATUS[f].label}
              </button>
            ))}
          </div>

          {woList.length === 0 ? (
            <Card><EmptyState icon={Wrench} title="No work orders" message="Create a work order, or raise one from a complaint." action={<Button onClick={() => setWoForm({ ...EMPTY_WO })}><Plus className="w-4 h-4" /> New work order</Button>} /></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {woList.map((w) => {
                const done = w.status === 'completed';
                const dead = done || w.status === 'cancelled';
                return (
                  <div key={w._id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-white/10 dark:bg-surface">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white">{w.title}</p>
                      <Badge tone={WO_STATUS[w.status]?.tone || 'gray'}>{WO_STATUS[w.status]?.label || w.status}</Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">{catLabel(w.category)}</span>
                      <span className={`font-semibold ${PRIORITY[w.priority]}`}>{catLabel(w.priority)}</span>
                      {w.roomId?.roomNumber && <span className="text-slate-400">· Room {w.roomId.roomNumber}</span>}
                      {w.complaintId && <span className="inline-flex items-center gap-1 text-slate-400"><ClipboardList className="w-3 h-3" /> from complaint</span>}
                    </div>
                    {w.description && <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{w.description}</p>}
                    <div className="mt-2.5 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {w.vendorId?.name && <p className="flex items-center gap-1.5"><Store className="w-3 h-3" /> {w.vendorId.name}</p>}
                      {w.scheduledFor && <p className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {fmtDate(w.scheduledFor)}</p>}
                      {w.cost > 0 && <p className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200"><IndianRupee className="w-3 h-3" /> {inr(w.cost)}{done && w.expenseId ? ' · logged to P&L' : ''}</p>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 dark:border-white/10 pt-3">
                      {!dead && (
                        <>
                          {(w.status === 'open' || w.status === 'assigned') && (
                            <Button size="sm" variant="secondary" onClick={() => setStatus(w, 'in_progress')}><Play className="w-3.5 h-3.5" /> Start</Button>
                          )}
                          {w.status === 'in_progress' && (
                            <Button size="sm" onClick={() => { setCompleteWO(w); setCompleteCost(w.cost || ''); }}><CheckCircle2 className="w-3.5 h-3.5" /> Complete</Button>
                          )}
                          <button onClick={() => setWoForm({ ...EMPTY_WO, ...w, vendorId: w.vendorId?._id || '', roomId: w.roomId?._id || '', complaintId: w.complaintId?._id || '', scheduledFor: w.scheduledFor ? w.scheduledFor.slice(0, 10) : '', cost: w.cost || '' })} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-white/5" title="Edit"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setStatus(w, 'cancelled')} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-white/5" title="Cancel"><Ban className="w-4 h-4" /></button>
                        </>
                      )}
                      {w.status === 'cancelled' && (
                        <button onClick={() => setDelWO(w)} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                      )}
                      {done && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Completed {w.completedAt ? fmtDate(w.completedAt) : ''}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        // ── Vendors tab ──
        vendors.length === 0 ? (
          <Card><EmptyState icon={Store} title="No vendors yet" message="Add the electricians, plumbers and services you use." action={<Button onClick={() => setVendorForm({ ...EMPTY_VENDOR })}><Plus className="w-4 h-4" /> Add vendor</Button>} /></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {vendors.map((v) => (
              <div key={v._id} className={`rounded-2xl border p-4 transition-colors ${v.isActive ? 'border-slate-200 bg-white dark:border-white/10 dark:bg-surface' : 'border-slate-200 bg-slate-50/60 dark:border-white/10 dark:bg-white/5 opacity-75'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{v.name}</p>
                    <span className="text-xs text-slate-400">{catLabel(v.category)}</span>
                  </div>
                  <Badge tone={v.isActive ? 'green' : 'gray'}>{v.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {v.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {v.phone}</p>}
                  {v.email && <p className="truncate">{v.email}</p>}
                  {v.notes && <p className="line-clamp-2 italic text-slate-400">{v.notes}</p>}
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-slate-100 dark:border-white/10 pt-3">
                  <button onClick={() => setVendorForm({ ...v })} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-white/5" title="Edit"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => toggleVendor(v)} className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">{v.isActive ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => setDelVendor(v)} className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-white/5" title="Remove"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Work order create / edit */}
      <Modal open={!!woForm} onClose={() => setWoForm(null)} title={woForm?._id ? 'Edit work order' : 'New work order'}>
        {woForm && (
          <div className="space-y-4">
            {!woForm._id && complaints.length > 0 && (
              <Field label="Raise from complaint" hint="Optional — prefills details, and resolves the complaint when this completes">
                <Select
                  value={woForm.complaintId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    const c = complaints.find((x) => x._id === cid);
                    setWoForm((f) => ({ ...f, complaintId: cid, title: c?.title || f.title, description: c?.description || f.description, roomId: c?.roomId?._id || c?.roomId || f.roomId }));
                  }}
                >
                  <option value="">— None (standalone) —</option>
                  {complaints.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Title" required><Input value={woForm.title} onChange={(e) => setWoForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Replace tube light in Room 204" /></Field>
            <Field label="Description"><Textarea value={woForm.description} onChange={(e) => setWoForm((f) => ({ ...f, description: e.target.value }))} placeholder="What needs doing?" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category"><Select value={woForm.category} onChange={(e) => setWoForm((f) => ({ ...f, category: e.target.value }))}>{CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}</Select></Field>
              <Field label="Priority"><Select value={woForm.priority} onChange={(e) => setWoForm((f) => ({ ...f, priority: e.target.value }))}>{['low', 'medium', 'high'].map((p) => <option key={p} value={p}>{catLabel(p)}</option>)}</Select></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Vendor" hint="Optional"><Select value={woForm.vendorId} onChange={(e) => setWoForm((f) => ({ ...f, vendorId: e.target.value }))}><option value="">— Unassigned —</option>{activeVendors.map((v) => <option key={v._id} value={v._id}>{v.name} ({catLabel(v.category)})</option>)}</Select></Field>
              <Field label="Room" hint="Optional"><Select value={woForm.roomId} onChange={(e) => setWoForm((f) => ({ ...f, roomId: e.target.value }))}><option value="">— None —</option>{rooms.map((r) => <option key={r._id} value={r._id}>Room {r.roomNumber}</option>)}</Select></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Scheduled for" hint="Optional"><Input type="date" value={woForm.scheduledFor} onChange={(e) => setWoForm((f) => ({ ...f, scheduledFor: e.target.value }))} /></Field>
              <Field label="Estimated cost (₹)" hint="Optional"><Input type="number" min={0} value={woForm.cost} onChange={(e) => setWoForm((f) => ({ ...f, cost: e.target.value }))} /></Field>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={() => setWoForm(null)}>Cancel</Button>
              <Button onClick={saveWO} loading={busy}>{woForm._id ? 'Save' : 'Create work order'}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Complete modal */}
      <Modal open={!!completeWO} onClose={() => setCompleteWO(null)} title="Complete work order">
        {completeWO && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Mark <span className="font-semibold text-slate-800 dark:text-slate-100">{completeWO.title}</span> done. The final cost is logged as a maintenance expense in your P&L.</p>
            <Field label="Final cost (₹)"><Input type="number" min={0} value={completeCost} onChange={(e) => setCompleteCost(e.target.value)} placeholder="0" autoFocus /></Field>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setCompleteWO(null)}>Cancel</Button>
              <Button onClick={doComplete} loading={busy}><CheckCircle2 className="w-4 h-4" /> Complete</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Vendor create / edit */}
      <Modal open={!!vendorForm} onClose={() => setVendorForm(null)} title={vendorForm?._id ? 'Edit vendor' : 'Add vendor'}>
        {vendorForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" required><Input value={vendorForm.name} onChange={(e) => setVendorForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Spark Electricals" /></Field>
              <Field label="Trade"><Select value={vendorForm.category} onChange={(e) => setVendorForm((f) => ({ ...f, category: e.target.value }))}>{CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}</Select></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone"><Input value={vendorForm.phone} onChange={(e) => setVendorForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 90000 00000" /></Field>
              <Field label="Email"><Input type="email" value={vendorForm.email} onChange={(e) => setVendorForm((f) => ({ ...f, email: e.target.value }))} placeholder="vendor@example.com" /></Field>
            </div>
            <Field label="Notes"><Textarea value={vendorForm.notes} onChange={(e) => setVendorForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Rates, availability, etc." /></Field>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={() => setVendorForm(null)}>Cancel</Button>
              <Button onClick={saveVendor} loading={busy}>{vendorForm._id ? 'Save' : 'Add vendor'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!delWO} onClose={() => setDelWO(null)} onConfirm={doDeleteWO} loading={busy} title="Delete work order?" message={delWO ? `"${delWO.title}" will be permanently removed.` : ''} confirmLabel="Delete" />
      <ConfirmDialog open={!!delVendor} onClose={() => setDelVendor(null)} onConfirm={doDeleteVendor} loading={busy} title="Remove vendor?" message={delVendor ? `${delVendor.name} will be removed from your directory.` : ''} confirmLabel="Remove" />
    </div>
  );
}
