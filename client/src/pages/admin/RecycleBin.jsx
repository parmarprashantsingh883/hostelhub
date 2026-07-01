import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Trash2, RotateCcw, Undo2, Clock } from 'lucide-react';
import { api, errMsg } from '../../api/client';
import { Button, Card, Badge, Spinner, EmptyState, ConfirmDialog, PageHeader, StatCard, fmtDateTime } from '../../components/ui';

const TYPE_TONE = { Room: 'blue', Asset: 'indigo', Vendor: 'yellow', Expense: 'green', Lead: 'gray', Notice: 'red' };

export default function RecycleBin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [purge, setPurge] = useState(null);
  const [emptying, setEmptying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/recyclebin');
      setItems(data.data.items);
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const restore = async (it) => {
    setBusy(true);
    try { await api.post(`/recyclebin/${it._id}/restore`); toast.success(`${it.type} restored`); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const doPurge = async () => {
    setBusy(true);
    try { await api.delete(`/recyclebin/${purge._id}`); toast.success('Deleted permanently'); setPurge(null); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const doEmpty = async () => {
    setBusy(true);
    try { const { data } = await api.delete('/recyclebin'); toast.success(`Emptied — ${data.data.deletedCount} item${data.data.deletedCount === 1 ? '' : 's'} removed`); setEmptying(false); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recycle bin"
        subtitle="Deleted rooms, assets, vendors, expenses, leads & notices — restore or remove for good"
        action={items.length > 0 ? <Button variant="danger" onClick={() => setEmptying(true)}><Trash2 className="w-4 h-4" /> Empty bin</Button> : null}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Trash2} accent label="In the bin" value={items.length} sub="Deleted items" />
        <StatCard icon={Undo2} tone="green" label="Restorable" value={items.length} sub="One-click restore" />
        <StatCard icon={Clock} tone="amber" label="Kept" value={items.length ? 'Until purged' : '—'} sub="No auto-expiry" />
      </div>

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState icon={Trash2} title="The bin is empty" message="Deleted records show up here so you can restore them if needed." />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/10">
            {items.map((it) => (
              <div key={it._id} className="flex flex-wrap items-center gap-3 py-3">
                <Badge tone={TYPE_TONE[it.type] || 'gray'}>{it.type}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{it.label || it.type}</p>
                  <p className="text-xs text-slate-400">Deleted {fmtDateTime(it.deletedAt)}{it.deletedBy?.name ? ` · by ${it.deletedBy.name}` : ''}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => restore(it)} loading={busy}><RotateCcw className="w-3.5 h-3.5" /> Restore</Button>
                <button onClick={() => setPurge(it)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-white/5 transition-colors" title="Delete forever"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog open={!!purge} onClose={() => setPurge(null)} onConfirm={doPurge} loading={busy} title="Delete forever?" message={purge ? `"${purge.label || purge.type}" will be permanently removed and cannot be restored.` : ''} confirmLabel="Delete forever" />
      <ConfirmDialog open={emptying} onClose={() => setEmptying(false)} onConfirm={doEmpty} loading={busy} title="Empty the recycle bin?" message="All items in the bin will be permanently removed. This cannot be undone." confirmLabel="Empty bin" />
    </div>
  );
}
