import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, UserX, Users, FileUp, Check, ArrowLeft, ArrowRight, ShieldCheck, FileSignature, BedDouble, User as UserIcon, Eye } from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Field, Input, Select, Modal, ConfirmDialog, Spinner, EmptyState,
  StatusBadge, Badge, Table, TableRow, Td, PageHeader, inr, fmtDate,
  Avatar, Drawer, DetailRow, Pagination, usePagination,
} from '../../components/ui';

const initials = (name) => (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

const EMPTY = {
  name: '', email: '', phone: '', password: '',
  roomId: '', rentAmount: '', securityDeposit: '',
  emergencyName: '', emergencyPhone: '', emergencyRelation: '',
  guardianName: '', guardianPhone: '',
  idType: 'aadhaar', idNumber: '',
  policeVerification: 'pending', agreementStatus: 'not_sent',
};

const STEPS = [
  { label: 'Contact', icon: UserIcon },
  { label: 'Verification', icon: ShieldCheck },
  { label: 'Allotment', icon: BedDouble },
  { label: 'Review', icon: FileSignature },
];

const POLICE_TONE = { pending: 'gray', submitted: 'blue', verified: 'green' };
const AGREEMENT_TONE = { not_sent: 'gray', sent: 'blue', signed: 'green' };
const labelize = (s) => String(s || '').replace(/_/g, ' ');

function Stepper({ step }) {
  return (
    <div className="mb-6 flex items-center">
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={s.label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${done ? 'bg-brand-600 text-white' : active ? 'bg-brand-600 text-white ring-4 ring-brand-100' : 'bg-slate-100 text-slate-400'}`}>
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-[11px] font-medium ${active || done ? 'text-slate-700' : 'text-slate-400'}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`mx-2 h-0.5 flex-1 rounded ${done ? 'bg-brand-600' : 'bg-slate-200'}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', search: '' });
  const [form, setForm] = useState(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmOut, setConfirmOut] = useState(null);
  const [docFor, setDocFor] = useState(null);
  const [docType, setDocType] = useState('id_proof');
  const [docFile, setDocFile] = useState(null);
  const [viewing, setViewing] = useState(null);
  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(tenants, 8);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([api.get('/tenants', { params: filter }), api.get('/rooms')]);
      setTenants(t.data.data.tenants);
      setRooms(r.data.data.rooms);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm({ ...EMPTY }); setStep(0); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    const tenantProfile = {
      ...(form.roomId ? { roomId: form.roomId } : {}),
      rentAmount: Number(form.rentAmount) || 0,
      securityDeposit: Number(form.securityDeposit) || 0,
      emergencyContact: { name: form.emergencyName, phone: form.emergencyPhone, relation: form.emergencyRelation },
      guardianDetails: { name: form.guardianName, phone: form.guardianPhone },
      idProof: { type: form.idType, number: form.idNumber },
      policeVerification: form.policeVerification,
      agreementStatus: form.agreementStatus,
    };
    try {
      if (form._id) {
        await api.put(`/tenants/${form._id}`, { name: form.name, phone: form.phone, tenantProfile });
        toast.success('Tenant updated');
      } else {
        await api.post('/tenants', { name: form.name, email: form.email, phone: form.phone, password: form.password || undefined, tenantProfile });
        toast.success(`Tenant onboarded${form.password ? '' : ' (default password: Tenant@123)'}`);
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
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
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
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const editTenant = (t) => {
    const p = t.tenantProfile || {};
    setForm({
      _id: t._id, name: t.name, email: t.email, phone: t.phone || '',
      roomId: p.roomId?._id || p.roomId || '',
      rentAmount: p.rentAmount ?? '', securityDeposit: p.securityDeposit ?? '',
      emergencyName: p.emergencyContact?.name || '', emergencyPhone: p.emergencyContact?.phone || '', emergencyRelation: p.emergencyContact?.relation || '',
      guardianName: p.guardianDetails?.name || '', guardianPhone: p.guardianDetails?.phone || '',
      idType: p.idProof?.type || 'aadhaar', idNumber: p.idProof?.number || '',
      policeVerification: p.policeVerification || 'pending', agreementStatus: p.agreementStatus || 'not_sent',
    });
    setStep(0);
  };

  const roomOptions = rooms.filter((r) => r.status !== 'maintenance' && (r.currentOccupancy < r.capacity || r._id === form?.roomId));
  const canNext = step !== 0 || (form?.name?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form?.email || ''));
  const isEdit = !!form?._id;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        subtitle={`${tenants.length} tenant${tenants.length === 1 ? '' : 's'}`}
        action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Add tenant</Button>}
      />

      <Card>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="Search name, email or phone…" value={filter.search} onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))} />
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
          <Table headers={['Tenant', 'Contact', 'Room', 'Rent', 'Verification', 'Status', 'Actions']}>
            {pageItems.map((t) => {
              const p = t.tenantProfile || {};
              return (
                <TableRow key={t._id} onClick={() => setViewing(t)} className="cursor-pointer hover:bg-brand-50/40 transition-colors">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{initials(t.name)}</div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{t.name}</p>
                        <p className="text-xs text-slate-400 truncate">{t.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>{t.phone || '—'}</Td>
                  <Td>
                    {p.roomId?.roomNumber
                      ? <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">Room {p.roomId.roomNumber}</span>
                      : <span className="text-slate-400">Unassigned</span>}
                  </Td>
                  <Td className="font-semibold text-slate-700">{inr(p.rentAmount)}</Td>
                  <Td>
                    <div className="flex flex-col items-start gap-1">
                      <Badge tone={POLICE_TONE[p.policeVerification] || 'gray'}>{labelize(p.policeVerification || 'pending')}</Badge>
                      <span className="font-mono text-[10px] uppercase tracking-wide text-slate-400">Agreement: {labelize(p.agreementStatus || 'not_sent')}</span>
                    </div>
                  </Td>
                  <Td><StatusBadge status={p.status} /></Td>
                  <Td>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setViewing(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Quick view"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => editTenant(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setDocFor(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Upload document"><FileUp className="w-4 h-4" /></button>
                      {p.status === 'active' && (
                        <button onClick={() => setConfirmOut(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Move out"><UserX className="w-4 h-4" /></button>
                      )}
                    </div>
                  </Td>
                </TableRow>
              );
            })}
          </Table>
        )}
        {!loading && total > 0 && (
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
        )}
      </Card>

      {/* Quick-view drawer */}
      <Drawer
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name}
        subtitle={viewing?.email}
        footer={viewing && (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => { const t = viewing; setViewing(null); editTenant(t); }}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            {viewing.tenantProfile?.status === 'active' && (
              <Button variant="danger" size="sm" onClick={() => { const t = viewing; setViewing(null); setConfirmOut(t); }}>
                <UserX className="w-3.5 h-3.5" /> Move out
              </Button>
            )}
          </div>
        )}
      >
        {viewing && (() => {
          const p = viewing.tenantProfile || {};
          return (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Avatar name={viewing.name} size="lg" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{viewing.name}</p>
                  <div className="mt-1"><StatusBadge status={p.status} /></div>
                </div>
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 mb-1">Allotment</p>
                <DetailRow label="Room">{p.roomId?.roomNumber ? `Room ${p.roomId.roomNumber}${p.roomId.floor ? ` · Floor ${p.roomId.floor}` : ''}` : 'Unassigned'}</DetailRow>
                <DetailRow label="Monthly rent">{inr(p.rentAmount)}</DetailRow>
                <DetailRow label="Security deposit">{inr(p.securityDeposit)}</DetailRow>
                <DetailRow label="Joined">{fmtDate(p.joiningDate)}</DetailRow>
                {p.moveOutDate && <DetailRow label="Moved out">{fmtDate(p.moveOutDate)}</DetailRow>}
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 mb-1">Contact</p>
                <DetailRow label="Phone">{viewing.phone || '—'}</DetailRow>
                <DetailRow label="Emergency">{p.emergencyContact?.name ? `${p.emergencyContact.name}${p.emergencyContact.phone ? ` · ${p.emergencyContact.phone}` : ''}` : '—'}</DetailRow>
                <DetailRow label="Guardian">{p.guardianDetails?.name ? `${p.guardianDetails.name}${p.guardianDetails.phone ? ` · ${p.guardianDetails.phone}` : ''}` : '—'}</DetailRow>
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 mb-1">Verification</p>
                <DetailRow label="ID proof">{p.idProof?.number ? `${labelize(p.idProof.type)} · ${p.idProof.number}` : '—'}</DetailRow>
                <DetailRow label="Police">
                  <Badge tone={POLICE_TONE[p.policeVerification] || 'gray'}>{labelize(p.policeVerification || 'pending')}</Badge>
                </DetailRow>
                <DetailRow label="Agreement">
                  <Badge tone={AGREEMENT_TONE[p.agreementStatus] || 'gray'}>{labelize(p.agreementStatus || 'not_sent')}</Badge>
                </DetailRow>
              </div>
            </div>
          );
        })()}
      </Drawer>

      {/* Add wizard / Edit form */}
      <Modal open={!!form} onClose={() => setForm(null)} title={isEdit ? `Edit ${form.name}` : 'Onboard a new tenant'} wide>
        {form && (isEdit ? (
          <form onSubmit={save} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name" required><Input value={form.name} onChange={set('name')} required /></Field>
              <Field label="Email"><Input type="email" value={form.email} disabled /></Field>
              <Field label="Phone"><Input value={form.phone} onChange={set('phone')} /></Field>
              <Field label="Room">
                <Select value={form.roomId} onChange={set('roomId')}>
                  <option value="">No room</option>
                  {roomOptions.map((r) => <option key={r._id} value={r._id}>{r.roomNumber} ({r.currentOccupancy}/{r.capacity}) — {inr(r.rentAmount)}</option>)}
                </Select>
              </Field>
              <Field label="Monthly rent (₹)"><Input type="number" min={0} value={form.rentAmount} onChange={set('rentAmount')} /></Field>
              <Field label="Security deposit (₹)"><Input type="number" min={0} value={form.securityDeposit} onChange={set('securityDeposit')} /></Field>
              <Field label="Police verification">
                <Select value={form.policeVerification} onChange={set('policeVerification')}><option value="pending">Pending</option><option value="submitted">Submitted</option><option value="verified">Verified</option></Select>
              </Field>
              <Field label="Agreement">
                <Select value={form.agreementStatus} onChange={set('agreementStatus')}><option value="not_sent">Not sent</option><option value="sent">Sent</option><option value="signed">Signed</option></Select>
              </Field>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" loading={busy}>Save changes</Button>
            </div>
          </form>
        ) : (
          <div>
            <Stepper step={step} />

            {step === 0 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full name" required><Input value={form.name} onChange={set('name')} placeholder="e.g. Aarav Shah" /></Field>
                <Field label="Email" required><Input type="email" value={form.email} onChange={set('email')} placeholder="aarav@example.com" /></Field>
                <Field label="Phone"><Input value={form.phone} onChange={set('phone')} placeholder="+91 …" /></Field>
                <Field label="Login password" hint="Blank = default Tenant@123"><Input type="text" value={form.password} onChange={set('password')} /></Field>
                <Field label="Emergency contact"><Input value={form.emergencyName} onChange={set('emergencyName')} placeholder="Name" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone"><Input value={form.emergencyPhone} onChange={set('emergencyPhone')} /></Field>
                  <Field label="Relation"><Input value={form.emergencyRelation} onChange={set('emergencyRelation')} placeholder="Parent" /></Field>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="ID type">
                  <Select value={form.idType} onChange={set('idType')}><option value="aadhaar">Aadhaar</option><option value="passport">Passport</option><option value="driving_license">Driving license</option><option value="voter_id">Voter ID</option><option value="other">Other</option></Select>
                </Field>
                <Field label="ID number"><Input value={form.idNumber} onChange={set('idNumber')} placeholder="XXXX-XXXX-XXXX" /></Field>
                <Field label="Police verification" hint="Track local verification status">
                  <Select value={form.policeVerification} onChange={set('policeVerification')}><option value="pending">Pending</option><option value="submitted">Submitted</option><option value="verified">Verified</option></Select>
                </Field>
                <Field label="Rental agreement">
                  <Select value={form.agreementStatus} onChange={set('agreementStatus')}><option value="not_sent">Not sent</option><option value="sent">Sent for signature</option><option value="signed">Signed</option></Select>
                </Field>
                <Field label="Guardian name"><Input value={form.guardianName} onChange={set('guardianName')} /></Field>
                <Field label="Guardian phone"><Input value={form.guardianPhone} onChange={set('guardianPhone')} /></Field>
                <p className="sm:col-span-2 text-xs text-slate-400">You can upload the ID / agreement files from the tenant row after onboarding.</p>
              </div>
            )}

            {step === 2 && (
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Assign room">
                  <Select value={form.roomId} onChange={(e) => {
                    const r = rooms.find((x) => x._id === e.target.value);
                    setForm((f) => ({ ...f, roomId: e.target.value, rentAmount: f.rentAmount || r?.rentAmount || '', securityDeposit: f.securityDeposit || r?.rentAmount || '' }));
                  }}>
                    <option value="">No room yet</option>
                    {roomOptions.map((r) => <option key={r._id} value={r._id}>{r.roomNumber} ({r.currentOccupancy}/{r.capacity}) — {inr(r.rentAmount)}</option>)}
                  </Select>
                </Field>
                <Field label="Monthly rent (₹)"><Input type="number" min={0} value={form.rentAmount} onChange={set('rentAmount')} /></Field>
                <Field label="Security deposit (₹)"><Input type="number" min={0} value={form.securityDeposit} onChange={set('securityDeposit')} /></Field>
                <p className="sm:col-span-3 text-xs text-slate-400">Move-in date defaults to today. Pick the room and the rent auto-fills from the room.</p>
              </div>
            )}

            {step === 3 && (
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">Review &amp; confirm</p>
                <dl className="mt-3 grid sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                  {[
                    ['Name', form.name || '—'],
                    ['Email', form.email || '—'],
                    ['Phone', form.phone || '—'],
                    ['Room', roomOptions.find((r) => r._id === form.roomId)?.roomNumber ? `Room ${roomOptions.find((r) => r._id === form.roomId).roomNumber}` : 'Unassigned'],
                    ['Monthly rent', form.rentAmount ? inr(form.rentAmount) : '—'],
                    ['Deposit', form.securityDeposit ? inr(form.securityDeposit) : '—'],
                    ['ID proof', `${labelize(form.idType)} ${form.idNumber || ''}`.trim()],
                    ['Police verification', labelize(form.policeVerification)],
                    ['Agreement', labelize(form.agreementStatus)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-slate-200/60 pb-2">
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="font-medium text-slate-900 text-right capitalize">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={() => (step === 0 ? setForm(null) : setStep((s) => s - 1))}>
                {step === 0 ? 'Cancel' : <><ArrowLeft className="w-4 h-4" /> Back</>}
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>Continue <ArrowRight className="w-4 h-4" /></Button>
              ) : (
                <Button type="button" loading={busy} onClick={save}><Check className="w-4 h-4" /> Onboard tenant</Button>
              )}
            </div>
          </div>
        ))}
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
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:h-9 file:px-4 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-700 file:text-sm file:font-medium hover:file:bg-brand-100 file:cursor-pointer" />
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
