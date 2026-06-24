import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  KeyRound, Mail, ShieldCheck, UserRound, Lock, Phone, CalendarDays, Hash, Check,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import { Button, Card, Field, Input, PasswordInput, Badge, PageHeader, Avatar, fmtDate } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

const SECTIONS = [
  { id: 'account', label: 'Account', icon: UserRound, hint: 'Your personal details' },
  { id: 'security', label: 'Security', icon: ShieldCheck, hint: 'Password & sign-in' },
];

export default function Profile() {
  const { user, setUser } = useAuth();
  const [section, setSection] = useState('account');
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  const dirty = profile.name !== (user?.name || '') || profile.phone !== (user?.phone || '');

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

  const roleLabel = String(user?.role || '—').replace(/_/g, ' ');
  const meta = [
    { icon: ShieldCheck, label: 'Role', value: roleLabel, cap: true },
    { icon: CalendarDays, label: 'Member since', value: user?.createdAt ? fmtDate(user.createdAt) : '—' },
    { icon: Hash, label: 'Account ID', value: user?._id ? `#${String(user._id).slice(-8).toUpperCase()}` : '—' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage your account details and security" />

      {/* ── Identity header ─────────────────────────────────────── */}
      <div className="surface-hero relative overflow-hidden rounded-2xl p-6 text-white shadow-hero sm:p-7">
        <div className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={user?.name} size="lg" className="h-16 w-16 text-lg ring-2 ring-white/20 shadow-[0_8px_22px_-6px_rgba(0,0,0,0.5)]" />
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-bold tracking-tight">{user?.name || '—'}</h2>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-white/70">
              <Mail className="h-4 w-4 shrink-0 text-white/55" />
              <span className="truncate">{user?.email || '—'}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {meta.map((m) => (
                <span key={m.label} className="inline-flex items-center gap-2 text-xs text-white/60">
                  <m.icon className="h-3.5 w-3.5 text-white/45" />
                  <span className="uppercase tracking-wide">{m.label}</span>
                  <span className={`font-semibold text-white/90 ${m.cap ? 'capitalize' : ''}`}>{m.value}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Settings: left rail + content ───────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
        {/* Section nav */}
        <nav className="flex gap-2 lg:flex-col lg:gap-1">
          {SECTIONS.map((s) => {
            const active = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`group flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors lg:flex-none ${
                  active ? 'bg-brand-600 text-white shadow-[0_8px_18px_-6px_rgba(36,48,71,0.5)]' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                }`}
              >
                <s.icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-brand-600'}`} strokeWidth={2.1} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight">{s.label}</span>
                  <span className={`hidden text-[11px] lg:block ${active ? 'text-white/70' : 'text-slate-400'}`}>{s.hint}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Section content */}
        <div className="min-w-0">
          {section === 'account' && (
            <Card title="Account details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" required>
                  <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} placeholder="Your full name" />
                </Field>
                <Field label="Phone">
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input className="pl-10" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="+91 98XXXXXXXX" />
                  </div>
                </Field>
                <Field label="Email" hint="Email can't be changed — contact your admin">
                  <div className="flex h-10 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                    <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate">{user?.email || '—'}</span>
                    <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300" />
                  </div>
                </Field>
                <Field label="Role">
                  <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
                    <Badge tone="indigo">{roleLabel}</Badge>
                  </div>
                </Field>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                {dirty && <span className="text-xs text-slate-400">Unsaved changes</span>}
                <Button onClick={saveProfile} loading={savingProfile} disabled={!dirty}>
                  <Check className="h-4 w-4" /> Save changes
                </Button>
              </div>
            </Card>
          )}

          {section === 'security' && (
            <Card title="Password">
              <div className="mb-5 flex items-start gap-3 rounded-xl bg-brand-50 px-3.5 py-3 ring-1 ring-brand-600/10">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-brand-600/15">
                  <ShieldCheck className="h-[18px] w-[18px]" />
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  Choose a strong password — at least 8 characters with a mix of letters and numbers.
                  You'll stay signed in on this device after changing it.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Current password" required className="sm:col-span-2">
                  <PasswordInput value={pwd.currentPassword} onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))} autoComplete="current-password" />
                </Field>
                <Field label="New password" required hint="At least 8 characters">
                  <PasswordInput value={pwd.newPassword} onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))} autoComplete="new-password" />
                </Field>
                <Field label="Confirm new password" required>
                  <PasswordInput value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" />
                </Field>
              </div>
              <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
                <Button onClick={changePassword} loading={savingPwd}><KeyRound className="h-4 w-4" /> Update password</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
