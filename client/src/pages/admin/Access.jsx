import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, Check, Users } from 'lucide-react';
import { api, errMsg, assetUrl } from '../../api/client';
import { Card, Badge, Spinner, EmptyState, PageHeader, StatCard, Avatar } from '../../components/ui';

const cap = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

export default function Access() {
  const [staff, setStaff] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null); // `${staffId}:${permKey}`

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        api.get('/staff', { params: { limit: 200, status: 'active' } }),
        api.get('/staff/permissions'),
      ]);
      setStaff((s.data.data.staff || []).filter((x) => x.staffProfile?.status !== 'inactive'));
      setCatalog(c.data.data.permissions || []);
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (member, key) => {
    const current = member.staffProfile?.permissions || [];
    const has = current.includes(key);
    const next = has ? current.filter((p) => p !== key) : [...current, key];
    // optimistic
    setStaff((list) => list.map((m) => (m._id === member._id ? { ...m, staffProfile: { ...m.staffProfile, permissions: next } } : m)));
    setSavingKey(`${member._id}:${key}`);
    try {
      await api.put(`/staff/${member._id}/permissions`, { permissions: next });
    } catch (e) {
      toast.error(errMsg(e));
      load(); // revert to server truth
    } finally { setSavingKey(null); }
  };

  const grantedCount = (m) => (m.staffProfile?.permissions || []).filter((p) => catalog.some((c) => c.key === p)).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Staff Access" subtitle="Grant each staff member only the permissions they need" />

      {loading ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={Users} accent label="Staff" value={staff.length} sub="Active members" />
            <StatCard icon={ShieldCheck} tone="indigo" label="Permissions" value={catalog.length} sub="Grantable capabilities" />
            <StatCard icon={Check} tone="green" label="Granted" value={staff.reduce((n, m) => n + grantedCount(m), 0)} sub="Across all staff" />
          </div>

          {staff.length === 0 ? (
            <Card><EmptyState icon={Users} title="No staff yet" message="Add staff members to manage their access." /></Card>
          ) : (
            <div className="space-y-4">
              {staff.map((m) => {
                const perms = m.staffProfile?.permissions || [];
                return (
                  <Card key={m._id}>
                    <div className="flex items-center gap-3">
                      <Avatar name={m.name} src={assetUrl(m.profileImage)} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">{m.name}</p>
                        <p className="text-xs text-slate-400">{cap(m.staffProfile?.staffType || 'staff')}</p>
                      </div>
                      <Badge tone={perms.length ? 'green' : 'gray'}>{perms.length} of {catalog.length}</Badge>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {catalog.map((p) => {
                        const on = perms.includes(p.key);
                        const saving = savingKey === `${m._id}:${p.key}`;
                        return (
                          <button
                            key={p.key}
                            onClick={() => toggle(m, p.key)}
                            disabled={saving}
                            className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors disabled:opacity-60 ${
                              on
                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/15'
                                : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'
                            }`}
                          >
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 dark:border-white/20'}`}>
                              {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                            </span>
                            <span className="min-w-0">
                              <span className={`block text-sm font-semibold ${on ? 'text-brand-700 dark:text-brand-200' : 'text-slate-700 dark:text-slate-200'}`}>{p.label}</span>
                              <span className="block text-[11px] text-slate-400">{p.desc}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
