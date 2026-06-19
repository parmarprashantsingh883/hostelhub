import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, UserPlus, UserMinus, DoorOpen, LayoutGrid, BedDouble, Wrench, Search,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Field, Input, Select, Modal, ConfirmDialog, Spinner, EmptyState,
  StatusBadge, Badge, StatCard, Avatar, ProgressBar, Table, TableRow, Td, PageHeader, inr,
} from '../../components/ui';

const EMPTY_FORM = { roomNumber: '', floor: 0, roomType: 'single', capacity: 1, rentAmount: '', facilities: '' };

const TYPE_TONE = { single: 'blue', double: 'indigo', triple: 'yellow', dormitory: 'gray' };

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', roomType: '', search: '' });
  const [form, setForm] = useState(null); // null | {…} (with _id ⇒ edit)
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [assignFor, setAssignFor] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [assignTenantId, setAssignTenantId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/rooms', { params: filter });
      setRooms(data.data.rooms);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openAssign = async (room) => {
    setAssignFor(room);
    setAssignTenantId('');
    try {
      const { data } = await api.get('/tenants', { params: { status: 'active' } });
      setTenants(data.data.tenants);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      roomNumber: form.roomNumber,
      floor: Number(form.floor),
      roomType: form.roomType,
      capacity: Number(form.capacity),
      rentAmount: Number(form.rentAmount),
      facilities: String(form.facilities || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      ...(form._id && form.status === 'maintenance' ? { status: 'maintenance' } : {}),
    };
    try {
      if (form._id) {
        await api.put(`/rooms/${form._id}`, payload);
        toast.success('Room updated');
      } else {
        await api.post('/rooms', payload);
        toast.success('Room added');
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
      await api.delete(`/rooms/${confirmDelete._id}`);
      toast.success('Room deleted');
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const doAssign = async () => {
    if (!assignTenantId) return toast.error('Pick a tenant');
    setBusy(true);
    try {
      await api.put(`/rooms/${assignFor._id}/assign-tenant`, { tenantId: assignTenantId });
      toast.success('Tenant assigned');
      setAssignFor(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const removeTenant = async (room, tenantId) => {
    try {
      await api.put(`/rooms/${room._id}/remove-tenant`, { tenantId });
      toast.success('Tenant removed from room');
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  // KPIs computed from the already-loaded rooms array
  const total = rooms.length;
  const occupied = rooms.filter((r) => r.status === 'occupied').length;
  const vacant = rooms.filter((r) => r.status === 'vacant').length;
  const maintenance = rooms.filter((r) => r.status === 'maintenance').length;
  const beds = rooms.reduce((s, r) => s + (r.capacity || 0), 0);
  const filled = rooms.reduce((s, r) => s + (r.currentOccupancy || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rooms"
        subtitle={`${rooms.length} room${rooms.length === 1 ? '' : 's'} across your property`}
        action={
          <Button onClick={() => setForm({ ...EMPTY_FORM })}>
            <Plus className="w-4 h-4" /> Add room
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={LayoutGrid} tone="indigo" label="Total rooms" value={total} sub={`${beds} beds`} />
        <StatCard icon={BedDouble} tone="green" label="Occupied" value={occupied} sub={`${filled}/${beds} beds filled`} />
        <StatCard icon={DoorOpen} tone="amber" label="Vacant" value={vacant} sub="Ready to assign" />
        <StatCard icon={Wrench} tone="red" label="Maintenance" value={maintenance} sub="Out of service" />
      </div>

      {/* Filters */}
      <Card>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              className="pl-9"
              placeholder="Search room number…"
              value={filter.search}
              onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <Select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All statuses</option>
            <option value="vacant">Vacant</option>
            <option value="partially_occupied">Partially occupied</option>
            <option value="occupied">Occupied</option>
            <option value="maintenance">Maintenance</option>
          </Select>
          <Select value={filter.roomType} onChange={(e) => setFilter((f) => ({ ...f, roomType: e.target.value }))}>
            <option value="">All types</option>
            <option value="single">Single</option>
            <option value="double">Double</option>
            <option value="triple">Triple</option>
            <option value="dormitory">Dormitory</option>
          </Select>
        </div>
      </Card>

      {/* List */}
      <Card>
        {loading ? (
          <Spinner />
        ) : rooms.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="No rooms found"
            message="Add your first room to start assigning tenants."
            action={<Button onClick={() => setForm({ ...EMPTY_FORM })}><Plus className="w-4 h-4" /> Add room</Button>}
          />
        ) : (
          <Table headers={['Room', 'Type', 'Rent', 'Occupancy', 'Status', 'Tenants', 'Actions']}>
            {rooms.map((r) => {
              const full = r.currentOccupancy >= r.capacity;
              const occTone = full ? 'green' : r.currentOccupancy ? 'amber' : 'slate';
              return (
                <TableRow key={r._id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                        <DoorOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">Room {r.roomNumber}</p>
                        <p className="text-xs text-slate-400">Floor {r.floor}</p>
                      </div>
                    </div>
                  </Td>
                  <Td><Badge tone={TYPE_TONE[r.roomType] || 'gray'}>{r.roomType}</Badge></Td>
                  <Td className="font-semibold text-slate-900 tabular-nums">{inr(r.rentAmount)}</Td>
                  <Td>
                    <div className="w-28">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-700 tabular-nums">{r.currentOccupancy}/{r.capacity}</span>
                        {full && <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Full</span>}
                      </div>
                      <ProgressBar value={r.currentOccupancy} max={r.capacity} tone={occTone} />
                    </div>
                  </Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td>
                    {r.assignedTenants?.length ? (
                      <div className="space-y-1.5">
                        {r.assignedTenants.map((t) => (
                          <div key={t._id} className="flex items-center gap-2 text-xs group/tenant">
                            <Avatar name={t.name} size="xs" />
                            <span className="text-slate-700 truncate max-w-[8rem]">{t.name}</span>
                            <button
                              onClick={() => removeTenant(r, t._id)}
                              className="text-slate-300 hover:text-red-500 opacity-0 group-hover/tenant:opacity-100 transition"
                              title="Remove from room"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Empty</span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openAssign(r)}
                        disabled={r.status === 'maintenance' || r.currentOccupancy >= r.capacity}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Assign tenant"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setForm({ ...r, facilities: (r.facilities || []).join(', ') })
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(r)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Td>
                </TableRow>
              );
            })}
          </Table>
        )}
      </Card>

      {/* Add/Edit modal */}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? `Edit room ${form.roomNumber}` : 'Add room'}>
        {form && (
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Room number" required>
                <Input value={form.roomNumber} onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))} required />
              </Field>
              <Field label="Floor" required>
                <Input type="number" min={0} value={form.floor} onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))} required />
              </Field>
              <Field label="Room type" required>
                <Select value={form.roomType} onChange={(e) => setForm((f) => ({ ...f, roomType: e.target.value }))}>
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                  <option value="triple">Triple</option>
                  <option value="dormitory">Dormitory</option>
                </Select>
              </Field>
              <Field label="Capacity" required>
                <Input type="number" min={1} max={20} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} required />
              </Field>
            </div>
            <Field label="Monthly rent (₹)" required>
              <Input type="number" min={0} value={form.rentAmount} onChange={(e) => setForm((f) => ({ ...f, rentAmount: e.target.value }))} required />
            </Field>
            <Field label="Facilities" hint="Comma separated — AC, Wi-Fi, Balcony…">
              <Input value={form.facilities} onChange={(e) => setForm((f) => ({ ...f, facilities: e.target.value }))} />
            </Field>
            {form._id && (
              <Field label="Status">
                <Select
                  value={form.status === 'maintenance' ? 'maintenance' : 'auto'}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value === 'maintenance' ? 'maintenance' : 'vacant' }))
                  }
                >
                  <option value="auto">Auto (from occupancy)</option>
                  <option value="maintenance">Under maintenance</option>
                </Select>
              </Field>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" loading={busy}>{form._id ? 'Save changes' : 'Add room'}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Assign modal */}
      <Modal open={!!assignFor} onClose={() => setAssignFor(null)} title={`Assign tenant to room ${assignFor?.roomNumber}`}>
        <Field label="Tenant" hint="Only active tenants are listed">
          <Select value={assignTenantId} onChange={(e) => setAssignTenantId(e.target.value)}>
            <option value="">Select tenant…</option>
            {tenants.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} ({t.email}){t.tenantProfile?.roomId ? ' — currently in a room' : ''}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setAssignFor(null)}>Cancel</Button>
          <Button onClick={doAssign} loading={busy}>Assign</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        loading={busy}
        title="Delete room?"
        message={`Room ${confirmDelete?.roomNumber} will be permanently deleted. Rooms with assigned tenants cannot be deleted.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
