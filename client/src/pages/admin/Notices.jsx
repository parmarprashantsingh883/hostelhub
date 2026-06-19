import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, Pin, Megaphone, Info, Banknote, Wrench,
  UtensilsCrossed, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Field, Input, Select, Textarea, Modal, ConfirmDialog, Spinner,
  EmptyState, StatusBadge, Badge, PageHeader, StatCard, Stagger, StaggerItem, fmtDateTime,
} from '../../components/ui';

const CATEGORIES = ['general', 'rent', 'maintenance', 'food', 'rules', 'emergency'];
const EMPTY = { title: '', content: '', category: 'general', priority: 'normal', isPinned: false, targetAudience: 'all' };

/* Per-category colour + icon so the feed scans at a glance. */
const CATEGORY = {
  general:     { icon: Info,             tile: 'bg-blue-50 text-blue-600',       badge: 'blue' },
  rent:        { icon: Banknote,         tile: 'bg-emerald-50 text-emerald-600', badge: 'green' },
  maintenance: { icon: Wrench,           tile: 'bg-amber-50 text-amber-600',     badge: 'yellow' },
  food:        { icon: UtensilsCrossed,  tile: 'bg-brand-50 text-brand-600',     badge: 'indigo' },
  rules:       { icon: ShieldCheck,      tile: 'bg-slate-100 text-slate-600',    badge: 'gray' },
  emergency:   { icon: AlertTriangle,    tile: 'bg-red-50 text-red-600',         badge: 'red' },
};
const catStyle = (c) => CATEGORY[c] || { icon: Megaphone, tile: 'bg-brand-50 text-brand-600', badge: 'indigo' };
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function AdminNotices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: '' });
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notices', { params: filter });
      setNotices(data.data.notices);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (form._id) {
        await api.put(`/notices/${form._id}`, form);
        toast.success('Notice updated');
      } else {
        await api.post('/notices', form);
        toast.success(form.priority === 'urgent' ? 'Urgent notice published + emailed' : 'Notice published');
      }
      setForm(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/notices/${confirmDelete._id}`);
      toast.success('Notice deleted');
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const togglePin = async (n) => {
    try {
      await api.put(`/notices/${n._id}`, { isPinned: !n.isPinned });
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  // Pinned first, then newest — mirrors the tenant-facing feed.
  const sorted = [...notices].sort((a, b) => {
    if (!!b.isPinned !== !!a.isPinned) return b.isPinned ? 1 : -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const pinnedCount = notices.filter((n) => n.isPinned).length;
  const urgentCount = notices.filter((n) => n.priority === 'urgent').length;
  const tenantOnly = notices.filter((n) => n.targetAudience === 'tenants').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notices"
        subtitle="Published to tenant and staff portals"
        action={<Button onClick={() => setForm({ ...EMPTY })}><Plus className="w-4 h-4" /> New notice</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Megaphone} label="Published" value={notices.length} tone="indigo" />
        <StatCard icon={Pin} label="Pinned" value={pinnedCount} tone="green" />
        <StatCard icon={AlertTriangle} label="Urgent" value={urgentCount} tone="red" />
        <StatCard icon={Info} label="Tenants only" value={tenantOnly} tone="blue" />
      </div>

      <Card>
        <Select value={filter.category} onChange={(e) => setFilter({ category: e.target.value })} className="sm:max-w-xs">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{cap(c)}</option>)}
        </Select>
      </Card>

      {loading ? (
        <Spinner />
      ) : sorted.length === 0 ? (
        <Card><EmptyState icon={Megaphone} title="No notices" message="Publish your first notice — it shows up instantly for tenants and staff." action={<Button onClick={() => setForm({ ...EMPTY })}><Plus className="w-4 h-4" /> New notice</Button>} /></Card>
      ) : (
        <Stagger className="space-y-4">
          {sorted.map((n) => {
            const { icon: Icon, tile, badge } = catStyle(n.category);
            return (
              <StaggerItem key={n._id}>
                <Card className={`group hover:shadow-soft transition ${n.isPinned ? 'ring-2 ring-brand-200 bg-brand-50/30' : ''}`}>
                  <div className="flex gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tile}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {n.isPinned && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 text-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                            <Pin className="w-3 h-3" /> Pinned
                          </span>
                        )}
                        <h3 className="font-semibold text-slate-900">{n.title}</h3>
                        <Badge tone={badge}>{cap(n.category)}</Badge>
                        {n.priority !== 'normal' && <StatusBadge status={n.priority} />}
                        <Badge tone="gray">{cap(n.targetAudience)}</Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed">{n.content}</p>
                      <p className="text-xs text-slate-400 mt-3">{n.createdBy?.name} · {fmtDateTime(n.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => togglePin(n)} className={`p-1.5 rounded-lg transition-colors ${n.isPinned ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50'}`} title={n.isPinned ? 'Unpin' : 'Pin'}>
                        <Pin className="w-4 h-4" />
                      </button>
                      <button onClick={() => setForm({ ...n })} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConfirmDelete(n)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? 'Edit notice' : 'New notice'}>
        {form && (
          <form onSubmit={save} className="space-y-4">
            <Field label="Title" required>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required maxLength={150} />
            </Field>
            <Field label="Content" required>
              <Textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={5} required maxLength={5000} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Category">
                <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{cap(c)}</option>)}
                </Select>
              </Field>
              <Field label="Priority">
                <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent (emails everyone)</option>
                </Select>
              </Field>
              <Field label="Audience">
                <Select value={form.targetAudience} onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))}>
                  <option value="all">Everyone</option>
                  <option value="tenants">Tenants only</option>
                  <option value="staff">Staff only</option>
                </Select>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPinned}
                onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Pin to top
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" loading={busy}>{form._id ? 'Save changes' : 'Publish'}</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        loading={busy}
        title="Delete notice?"
        message={`"${confirmDelete?.title}" will be removed for everyone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
