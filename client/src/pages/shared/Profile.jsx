import { useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound, Mail, Phone, UserRound, ShieldCheck, Lock } from 'lucide-react';
import { api, errMsg } from '../../api/client';
import { Button, Card, Field, Input, Badge, PageHeader, Avatar } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  const saveProfile = async () => {
    if (!profile.name || profile.name.trim().length < 2) return toast.error('Name is required');
    setSavingProfile(true);
    try {
      const { data } = await api.put('/auth/profile', { name: profile.name.trim(), phone: profile.phone.trim() });
      setUser?.(data.data.user);
      toast.success('Profile updated');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!pwd.currentPassword || !pwd.newPassword) return toast.error('Fill both password fields');
    if (pwd.newPassword.length < 8) return toast.error('New password must be at least 8 characters');
    if (pwd.newPassword !== pwd.confirm) return toast.error('Passwords do not match');
    setSavingPwd(true);
    try {
      await api.put('/auth/change-password', { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      toast.success('Password changed');
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Manage your account details and security" />

      {/* ── Identity hero ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 text-white shadow-soft">
        <div className="pointer-events-none absolute -top-16 -right-8 w-64 h-64 rounded-full bg-sun-400/25 blur-3xl" />
        <UserRound className="pointer-events-none absolute right-6 bottom-2 w-40 h-40 text-white/[0.04]" strokeWidth={1.5} />
        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar name={user?.name} size="lg" className="ring-2 ring-white/25 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.4)]" />
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{user?.name || '—'}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-200">
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <Mail className="w-4 h-4 text-slate-300 shrink-0" />
                <span className="truncate">{user?.email || '—'}</span>
              </span>
              {user?.role && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 ring-1 ring-white/20 px-2.5 py-0.5 text-xs font-medium capitalize backdrop-blur">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {String(user.role).replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Details + security ────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Account details (spans 2) */}
        <div className="lg:col-span-2">
          <Card title="Account details">
            <div className="space-y-4">
              <Field label="Name" required>
                <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
              </Field>

              {/* Read-only email row */}
              <Field label="Email" hint="Email cannot be changed">
                <div className="flex items-center gap-2.5 h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{user?.email || '—'}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-300 ml-auto shrink-0" />
                </div>
              </Field>

              <Field label="Phone">
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="10-digit mobile"
                />
              </Field>

              {/* Read-only role row */}
              <Field label="Role">
                <div className="flex items-center h-10 px-3 rounded-lg border border-slate-200 bg-slate-50">
                  <Badge tone="indigo">{String(user?.role || '—').replace(/_/g, ' ')}</Badge>
                </div>
              </Field>

              <div className="flex justify-end pt-1">
                <Button onClick={saveProfile} loading={savingProfile}>Save changes</Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Change password */}
        <Card title="Change password">
          <div className="flex items-start gap-3 rounded-xl bg-brand-50 ring-1 ring-brand-600/10 px-3.5 py-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-white ring-1 ring-brand-600/15 text-brand-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Use at least 8 characters with a mix of letters and numbers for a stronger password.
            </p>
          </div>
          <div className="space-y-4">
            <Field label="Current password" required>
              <Input type="password" value={pwd.currentPassword} onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))} autoComplete="current-password" />
            </Field>
            <Field label="New password" required hint="At least 8 characters">
              <Input type="password" value={pwd.newPassword} onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))} autoComplete="new-password" />
            </Field>
            <Field label="Confirm new password" required>
              <Input type="password" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" />
            </Field>
            <div className="flex justify-end pt-1">
              <Button onClick={changePassword} loading={savingPwd}><KeyRound className="w-4 h-4" /> Update password</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
