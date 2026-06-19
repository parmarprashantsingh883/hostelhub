import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, UserX, Users, FileUp } from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Field, Input, Select, Modal, ConfirmDialog, Spinner, EmptyState,
  StatusBadge, Table, TableRow, Td, PageHeader, inr, fmtDate,
} from '../../components/ui';

const initials = (name) =>
  (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

const EMPTY = {
  name: '', email: '', phone: '', password: '',
  roomId: '', rentAmount: '', securityDeposit: '',
  emergencyName: '', emergencyPhone: '', emergencyRelation: '',
  guardianName: '', guardianPhone: '',
  idType: 'aadhaar', idNumber: '',
};

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', search: '' });
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmOut, setConfirmOut] = useState(null);
  const [docFor, setDocFor] = useState(null);
  const [docType, setDocType] = useState('id_proof');
  const [docFile, setDocFile] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([
        api.get('/tenants', { params: filter }),
        api.get('/rooms'),
      ]);
      setTenants(t.data.data.tenants);
      setRooms(r.data.data.rooms);
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
    const tenantProfile = {
      ...(form.roomId ? { roomId: form.roomId } : {}),
      rentAmount: Number(form.rentAmount) || 0,
      securityDeposit: Number(form.securityDeposit) || 0,
      emergencyContact: { name: form.emergencyName, phone: form.emergencyPhone, relation: form.emergencyRelation },
      guardianDetails: { name: form.guardianName, phone: form.guardianPhone },
      idProof: { type: form.idType, number: form.idNumber },
    };
    try {
      if (form._id) {
        await api.put(`/tenants/${form._id}`, { name: form.name, phone: form.phone, tenantProfile });
        toast.success('Tenant updated');
      } else {
        await api.post('/tenants', {
          name: form.name, email: form.email, phone: form.phone,
          password: form.password || undefined, tenantProfile,
        });
        toast.success(`Tenant added${form.password ? '' : ' (default password: Tenant@123)'}`);
      }
      setForm(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const moveOut = async () => {
    setBusy(true);
    try {
      await api.delete(`/tenants/${confirmOut._id}`);
      toast.success('Tenant moved out');
      setConfirmOut(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const uploadDoc = async () => {
    if (!docFile) return toast.error('Choose a file');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', docFile);
      fd.append('userId', docFor._id);
      fd.append('documentType', docType);
      await api.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Document uploaded');
      setDocFor(null);
      setDocFile(null);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const editTenant = (t) => {
    const p = t.tenantProfile || {};
    setForm({
      _id: t._id,
      name: t.name, email: t.email, phone: t.phone || '',
      roomId: p.roomId?._id || p.roomId || '',
      rentAmount: p.rentAmount ?? '',
      securityDeposit: p.securityDeposit ?? '',
      emergencyName: p.emergencyContact?.name || '',
      emergencyPhone: p.emergencyContact?.phone || '',
      emergencyRelation: p.emergencyContact?.relation || '',
      guardianName: p.guardianDetails?.name || '',
      guardianPhone: p.guardianDetails?.phone || '',
      idType: p.idProof?.type || 'aadhaar',
      idNumber: p.idProof?.number || '',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        subtitle={`${tenants.length} tenant${tenants.length === 1 ? '' : 's'}`}
        action={<Button onClick={() => setForm({ ...EMPTY })}><Plus className="w-4 h-4" /> Add tenant</Button>}
      />

      <Card>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            placeholder="Search name, email or phone…"
            value={filter.search}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
          />
          <Select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="moved_out">Moved out</option>
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <Spinner />
        ) : tenants.length === 0 ? (
          <EmptyState icon={Users} title="No tenants found" message="Add a tenant or relax your filters." />
        ) : (
          <Table headers={['Tenant', 'Contact', 'Room', 'Rent', 'Joined', 'Status', 'Actions']}>
            {tenants.map((t) => (
              <TableRow key={t._id} className="hover:bg-brand-50/40 transition-colors">
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {initials(t.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{t.name}</p>
                      <p className="text-xs text-slate-400 truncate">{t.email}</p>
                    </div>
                  </div>
                </Td>
                <Td>{t.phone || '—'}</Td>
                <Td>
                  {t.tenantProfile?.roomId?.roomNumber
                    ? <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">Room {t.tenantProfile.roomId.roomNumber}</span>
                    : <span className="text-slate-400">Unassigned</span>}
                </Td>
                <Td className="font-semibold text-slate-700">{inr(t.tenantProfile?.rentAmount)}</Td>
                <Td>{fmtDate(t.tenantProfile?.joiningDate)}</Td>
                <Td><StatusBadge status={t.tenantProfile?.status} /></Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => editTenant(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDocFor(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Upload document">
                      <FileUp className="w-4 h-4" />
                    </button>
                    {t.tenantProfile?.status === 'active' && (
                      <button onClick={() => setConfirmOut(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Move out">
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Td>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>

      {/* Add/Edit */}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? `Edit ${form.name}` : 'Add tenant'} wide>
        {form && (
          <form onSubmit={save} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name" required>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </Field>
              <Field label="Email" required>
                <Input type="email" value={form.email} disabled={!!form._id} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </Field>
              {!form._id && (
                <Field label="Password" hint="Blank = default Tenant@123">
                  <Input type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                </Field>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Room">
                <Select value={form.roomId} onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}>
                  <option value="">No room</option>
                  {rooms
                    .filter((r) => r.status !== 'maintenance' && (r.currentOccupancy < r.capacity || r._id === form.roomId))
                    .map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.roomNumber} ({r.currentOccupancy}/{r.capacity}) — {inr(r.rentAmount)}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Monthly rent (₹)">
                <Input type="number" min={0} value={form.rentAmount} onChange={(e) => setForm((f) => ({ ...f, rentAmount: e.target.value }))} />
              </Field>
              <Field label="Security deposit (₹)">
                <Input type="number" min={0} value={form.securityDeposit} onChange={(e) => setForm((f) => ({ ...f, securityDeposit: e.target.value }))} />
              </Field>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Emergency contact</p>
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Name"><Input value={form.emergencyName} onChange={(e) => setForm((f) => ({ ...f, emergencyName: e.target.value }))} /></Field>
                <Field label="Phone"><Input value={form.emergencyPhone} onChange={(e) => setForm((f) => ({ ...f, emergencyPhone: e.target.value }))} /></Field>
                <Field label="Relation"><Input value={form.emergencyRelation} onChange={(e) => setForm((f) => ({ ...f, emergencyRelation: e.target.value }))} /></Field>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Guardian & ID proof</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Guardian name"><Input value={form.guardianName} onChange={(e) => setForm((f) => ({ ...f, guardianName: e.target.value }))} /></Field>
                <Field label="Guardian phone"><Input value={form.guardianPhone} onChange={(e) => setForm((f) => ({ ...f, guardianPhone: e.target.value }))} /></Field>
                <Field label="ID type">
                  <Select value={form.idType} onChange={(e) => setForm((f) => ({ ...f, idType: e.target.value }))}>
                    <option value="aadhaar">Aadhaar</option>
                    <option value="passport">Passport</option>
                    <option value="driving_license">Driving license</option>
                    <option value="voter_id">Voter ID</option>
                    <option value="other">Other</option>
                  </Select>
                </Field>
                <Field label="ID number"><Input value={form.idNumber} onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value }))} /></Field>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" loading={busy}>{form._id ? 'Save changes' : 'Add tenant'}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Upload document */}
      <Modal open={!!docFor} onClose={() => { setDocFor(null); setDocFile(null); }} title={`Upload document — ${docFor?.name}`}>
        <div className="space-y-4">
          <Field label="Document type">
            <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
              <option value="id_proof">ID proof</option>
              <option value="agreement">Agreement copy</option>
              <option value="payment_proof">Payment proof</option>
              <option value="police_verification">Police verification</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="File" hint="JPG, PNG, WEBP or PDF — max 5 MB">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:h-9 file:px-4 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-700 file:text-sm file:font-medium hover:file:bg-brand-100 file:cursor-pointer"
            />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setDocFor(null); setDocFile(null); }}>Cancel</Button>
            <Button onClick={uploadDoc} loading={busy}>Upload</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmOut}
        onClose={() => setConfirmOut(null)}
        onConfirm={moveOut}
        loading={busy}
        title="Move tenant out?"
        message={`${confirmOut?.name} will be removed from their room, marked as moved out, and their login deactivated.`}
        confirmLabel="Move out"
      />
    </div>
  );
}
