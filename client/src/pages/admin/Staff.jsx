import { useEffect, useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, UserX, UserCog, Users, UserCheck, Shield, Search } from 'lucide-react';
import { api, errMsg, assetUrl } from '../../api/client';
import {
  Button, Card, Field, Input, Select, Modal, ConfirmDialog, TableSkeleton, EmptyState,
  StatusBadge, Badge, StatCard, Avatar, Table, TableRow, Td, PageHeader, inr, fmtDate,
  Pagination, usePagination,
} from '../../components/ui';

const EMPTY = { name: '', email: '', phone: '', password: '', staffType: 'maintenance', salary: '' };
const TYPES = ['maintenance', 'cleaning', 'security', 'cook', 'manager'];

const ROLE_TONE = {
  maintenance: 'blue',
  cleaning: 'indigo',
  security: 'red',
  cook: 'yellow',
  manager: 'green',
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ staffType: '', search: '' });
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmOut, setConfirmOut] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/staff', { params: filter });
      setStaff(data.data.staff);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const active = staff.filter((s) => s.staffProfile?.status === 'active').length;
    const managers = staff.filter((s) => s.staffProfile?.staffType === 'manager').length;
    const payroll = staff.reduce((sum, s) => sum + (Number(s.staffProfile?.salary) || 0), 0);
    return { total: staff.length, active, managers, payroll };
  }, [staff]);

  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(staff, 10);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const staffProfile = { staffType: form.staffType, salary: Number(form.salary) || 0 };
    try {
      if (form._id) {
        await api.put(`/staff/${form._id}`, { name: form.name, phone: form.phone, staffProfile });
        toast.success('Staff updated');
      } else {
        await api.post('/staff', {
          name: form.name, email: form.email, phone: form.phone,
          password: form.password || undefined, staffProfile,
        });
        toast.success(`Staff added${form.password ? '' : ' (default password: Staff@123)'}`);
      }
      setForm(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    setBusy(true);
    try {
      await api.delete(`/staff/${confirmOut._id}`);
      toast.success('Staff deactivated');
      setConfirmOut(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        subtitle={`${staff.length} member${staff.length === 1 ? '' : 's'} keeping the property running`}
        action={<Button onClick={() => setForm({ ...EMPTY })}><Plus className="w-4 h-4" /> Add staff</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total staff" value={stats.total} tone="indigo" sub="All members on record" />
        <StatCard icon={UserCheck} label="Active" value={stats.active} tone="green" sub="Currently working" />
        <StatCard icon={Shield} label="Managers" value={stats.managers} tone="blue" sub="Supervisory roles" />
        <StatCard icon={UserCog} label="Monthly payroll" value={inr(stats.payroll)} tone="amber" sub="Across all staff" />
      </div>

      <Card>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              className="pl-9"
              placeholder="Search name or email…"
              value={filter.search}
              onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <Select value={filter.staffType} onChange={(e) => setFilter((f) => ({ ...f, staffType: e.target.value }))}>
            <option value="">All roles</option>
            {TYPES.map((t) => <option key={t} value={t}>{cap(t)}</option>)}
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton cols={6} />
        ) : staff.length === 0 ? (
          <EmptyState icon={UserCog} title="No staff found" message="Add maintenance, security, cooks and managers here." />
        ) : (
          <Table headers={['Member', 'Role', 'Phone', 'Salary', 'Joined', 'Status', 'Actions']}>
            {pageItems.map((s) => (
              <TableRow key={s._id} className="hover:bg-brand-50/40 dark:hover:bg-white/5 transition-colors">
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} src={assetUrl(s.profileImage)} size="sm" />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{s.name}</p>
                      <p className="text-xs text-slate-400 truncate">{s.email}</p>
                    </div>
                  </div>
                </Td>
                <Td>
                  {s.staffProfile?.staffType
                    ? <Badge tone={ROLE_TONE[s.staffProfile.staffType] || 'gray'}>{cap(s.staffProfile.staffType)}</Badge>
                    : <span className="text-slate-400">—</span>}
                </Td>
                <Td className="tabular-nums">{s.phone || <span className="text-slate-400">—</span>}</Td>
                <Td className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                  {s.staffProfile?.salary ? inr(s.staffProfile.salary) : <span className="font-normal text-slate-400">—</span>}
                </Td>
                <Td className="text-slate-500">{fmtDate(s.staffProfile?.joinedAt)}</Td>
                <Td><StatusBadge status={s.staffProfile?.status} /></Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setForm({
                          _id: s._id, name: s.name, email: s.email, phone: s.phone || '',
                          staffType: s.staffProfile?.staffType || 'maintenance',
                          salary: s.staffProfile?.salary ?? '',
                        })
                      }
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-white/5 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {s.staffProfile?.status === 'active' && (
                      <button onClick={() => setConfirmOut(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-rose-500/15 transition-colors" title="Deactivate">
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Td>
              </TableRow>
            ))}
          </Table>
        )}
        {!loading && total > 0 && (
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
        )}
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? `Edit ${form.name}` : 'Add staff member'}>
        {form && (
          <form onSubmit={save} className="space-y-4">
            <Field label="Full name" required>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={form.email} disabled={!!form._id} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </Field>
              <Field label="Role" required>
                <Select value={form.staffType} onChange={(e) => setForm((f) => ({ ...f, staffType: e.target.value }))}>
                  {TYPES.map((t) => <option key={t} value={t}>{cap(t)}</option>)}
                </Select>
              </Field>
              <Field label="Salary (₹/month)">
                <Input type="number" min={0} value={form.salary} onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))} />
              </Field>
              {!form._id && (
                <Field label="Password" hint="Blank = default Staff@123">
                  <Input type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                </Field>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" loading={busy}>{form._id ? 'Save changes' : 'Add staff'}</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmOut}
        onClose={() => setConfirmOut(null)}
        onConfirm={deactivate}
        loading={busy}
        title="Deactivate staff member?"
        message={`${confirmOut?.name} will no longer be able to log in or receive task assignments.`}
        confirmLabel="Deactivate"
      />
    </div>
  );
}
