import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Package, Plus, Pencil, Trash2, Wrench, IndianRupee, Boxes, AlertTriangle,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Badge, Field, Input, Select, Modal, ConfirmDialog, TableSkeleton,
  EmptyState, StatCard, Table, TableRow, Td, PageHeader, inr, Pagination, usePagination,
} from '../../components/ui';

const CATEGORIES = ['furniture', 'appliance', 'electronics', 'bedding', 'kitchen', 'safety', 'other'];
const CONDITIONS = ['new', 'good', 'fair', 'damaged'];
const STATUSES = ['in_use', 'in_store', 'under_repair', 'retired'];
const cap = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const COND_TONE = { new: 'green', good: 'green', fair: 'yellow', damaged: 'red' };
const STATUS_TONE = { in_use: 'green', in_store: 'gray', under_repair: 'yellow', retired: 'red' };

const EMPTY = { name: '', category: 'furniture', roomId: '', location: '', condition: 'good', status: 'in_use', quantity: 1, purchaseCost: '', purchaseDate: '', serialNo: '', note: '' };

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [kpis, setKpis] = useState({ count: 0, units: 0, totalValue: 0, underRepair: 0, retired: 0, damaged: 0 });
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: '', status: '', roomId: '' });
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filter).filter(([, v]) => v));
      const { data } = await api.get('/assets', { params });
      setAssets(data.data.assets);
      setKpis(data.data.kpis);
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/rooms', { params: { limit: 200 } }).then(({ data }) => setRooms(data.data.rooms || [])).catch(() => {}); }, []);

  const save = async () => {
    if (!form.name.trim()) return toast.error('Asset name is required');
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(), category: form.category, roomId: form.roomId || null, location: form.location.trim(),
        condition: form.condition, status: form.status, quantity: Number(form.quantity) || 1,
        purchaseCost: Number(form.purchaseCost) || 0, purchaseDate: form.purchaseDate || null, serialNo: form.serialNo.trim(), note: form.note.trim(),
      };
      if (form._id) await api.put(`/assets/${form._id}`, payload);
      else await api.post('/assets', payload);
      toast.success(form._id ? 'Asset updated' : 'Asset added');
      setForm(null);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const doDelete = async () => {
    setBusy(true);
    try { await api.delete(`/assets/${del._id}`); toast.success('Asset removed'); setDel(null); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const where = (a) => (a.roomId?.roomNumber ? `Room ${a.roomId.roomNumber}` : a.location || '—');
  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(assets, 12);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset register"
        subtitle="Furniture, appliances and equipment across the property"
        action={<Button onClick={() => setForm({ ...EMPTY })}><Plus className="w-4 h-4" /> Add asset</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={IndianRupee} accent label="Asset value" value={inr(kpis.totalValue)} sub={`${kpis.units} item${kpis.units === 1 ? '' : 's'}`} />
        <StatCard icon={Boxes} tone="indigo" label="Assets" value={kpis.count} sub="Line items" />
        <StatCard icon={Wrench} tone="amber" label="Under repair" value={kpis.underRepair} sub="Being fixed" />
        <StatCard icon={AlertTriangle} tone="red" label="Damaged" value={kpis.damaged} sub={`${kpis.retired} retired`} />
      </div>

      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select value={filter.category} onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value }))}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{cap(c)}</option>)}
          </Select>
          <Select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
          </Select>
          <Select value={filter.roomId} onChange={(e) => setFilter((f) => ({ ...f, roomId: e.target.value }))}>
            <option value="">All locations</option>
            {rooms.map((r) => <option key={r._id} value={r._id}>Room {r.roomNumber}</option>)}
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton cols={6} />
        ) : assets.length === 0 ? (
          <EmptyState icon={Package} title="No assets" message="Add the furniture and appliances you want to track." action={<Button onClick={() => setForm({ ...EMPTY })}><Plus className="w-4 h-4" /> Add asset</Button>} />
        ) : (
          <>
            <Table headers={['Asset', 'Category', 'Location', 'Qty', 'Condition', 'Status', 'Value', '']}>
              {pageItems.map((a) => (
                <TableRow key={a._id}>
                  <Td>
                    <p className="font-semibold text-slate-900 dark:text-white">{a.name}</p>
                    {a.serialNo && <p className="text-xs text-slate-400">SN: {a.serialNo}</p>}
                  </Td>
                  <Td><span className="rounded-md bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">{cap(a.category)}</span></Td>
                  <Td className="text-slate-600 dark:text-slate-300">{where(a)}</Td>
                  <Td className="tabular-nums text-slate-600 dark:text-slate-300">{a.quantity}</Td>
                  <Td><Badge tone={COND_TONE[a.condition] || 'gray'}>{cap(a.condition)}</Badge></Td>
                  <Td><Badge tone={STATUS_TONE[a.status] || 'gray'}>{cap(a.status)}</Badge></Td>
                  <Td className="tabular-nums font-medium text-slate-900 dark:text-white">{a.purchaseCost ? inr(a.purchaseCost) : '—'}</Td>
                  <Td>
                    <div className="flex gap-1">
                      <button onClick={() => setForm({ ...EMPTY, ...a, roomId: a.roomId?._id || '', purchaseDate: a.purchaseDate ? a.purchaseDate.slice(0, 10) : '', purchaseCost: a.purchaseCost || '' })} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-white/5" title="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setDel(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-white/5" title="Remove"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </Td>
                </TableRow>
              ))}
            </Table>
            {total > 0 && <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />}
          </>
        )}
      </Card>

      {/* Create / edit */}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? 'Edit asset' : 'Add asset'}>
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" required><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Ceiling fan" /></Field>
              <Field label="Category"><Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>{CATEGORIES.map((c) => <option key={c} value={c}>{cap(c)}</option>)}</Select></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Room" hint="Or leave blank for a common area"><Select value={form.roomId} onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}><option value="">— Common / not a room —</option>{rooms.map((r) => <option key={r._id} value={r._id}>Room {r.roomNumber}</option>)}</Select></Field>
              <Field label="Location" hint="If not in a room"><Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Lobby, Store" disabled={!!form.roomId} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Condition"><Select value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}>{CONDITIONS.map((c) => <option key={c} value={c}>{cap(c)}</option>)}</Select></Field>
              <Field label="Status"><Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>{STATUSES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}</Select></Field>
              <Field label="Quantity"><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Purchase cost (₹)" hint="Optional"><Input type="number" min={0} value={form.purchaseCost} onChange={(e) => setForm((f) => ({ ...f, purchaseCost: e.target.value }))} /></Field>
              <Field label="Purchase date" hint="Optional"><Input type="date" value={form.purchaseDate} onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Serial no." hint="Optional"><Input value={form.serialNo} onChange={(e) => setForm((f) => ({ ...f, serialNo: e.target.value }))} /></Field>
              <Field label="Note" hint="Optional"><Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></Field>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button onClick={save} loading={busy}>{form._id ? 'Save' : 'Add asset'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={doDelete} loading={busy} title="Remove asset?" message={del ? `"${del.name}" will be removed from the register.` : ''} confirmLabel="Remove" />
    </div>
  );
}
