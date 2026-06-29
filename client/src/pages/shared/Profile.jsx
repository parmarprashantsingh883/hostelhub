import { useState, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  KeyRound, Mail, ShieldCheck, UserRound, Lock, Phone, CalendarDays, Hash, Check,
  Camera, Home, Wallet, Briefcase, Sun, Moon, BadgeCheck, FileCheck, Users, Heart, Loader2, IndianRupee,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import { Button, Card, Field, Input, PasswordInput, Badge, PageHeader, Avatar, fmtDate, inr } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { currentTheme, setTheme as applyTheme } from '../../lib/theme';

const ASSET_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
const assetUrl = (p) => (!p ? '' : p.startsWith('http') ? p : `${ASSET_BASE}${p}`);
const cap = (s) => String(s || '—').replace(/_/g, ' ');

const KYC_TONE = { verified: 'green', submitted: 'yellow', pending: 'gray', signed: 'green', sent: 'yellow', not_sent: 'gray' };

export default function Profile() {
  const { user, setUser } = useAuth();
  const [me, setMe] = useState(user);
  const [section, setSection] = useState('account');
  const fileRef = useRef(null);

  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);
  const [contacts, setContacts] = useState({ emergencyContact: { name: '', phone: '', relation: '' }, guardianDetails: { name: '', phone: '', address: '' } });
  const [savingContacts, setSavingContacts] = useState(false);
  const [theme, setThemeState] = useState(currentTheme());

  // Pull the full account (tenantProfile + populated room) on mount.
  useEffect(() => {
    api.get('/auth/me').then(({ data }) => {
      const u = data.data.user;
      setMe(u);
      setProfile({ name: u.name || '', phone: u.phone || '' });
      if (u.role === 'tenant') {
        setContacts({
          emergencyContact: { name: u.tenantProfile?.emergencyContact?.name || '', phone: u.tenantProfile?.emergencyContact?.phone || '', relation: u.tenantProfile?.emergencyContact?.relation || '' },
          guardianDetails: { name: u.tenantProfile?.guardianDetails?.name || '', phone: u.tenantProfile?.guardianDetails?.phone || '', address: u.tenantProfile?.guardianDetails?.address || '' },
        });
      }
    }).catch(() => {});
  }, []);

  const role = me?.role;
  const tp = me?.tenantProfile;
  const sp = me?.staffProfile;
  const dirty = profile.name !== (me?.name || '') || profile.phone !== (me?.phone || '');

  const completeness = useMemo(() => {
    if (!me) return 0;
    const checks = [!!me.name, !!me.phone, !!me.profileImage];
    if (role === 'tenant') {
      checks.push(!!tp?.emergencyContact?.name, !!tp?.emergencyContact?.phone, !!tp?.guardianDetails?.name);
    }
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [me, role, tp]);

  const sync = (u) => { setMe(u); setUser?.(u); };

  const saveProfile = async () => {
    if (!profile.name || profile.name.trim().length < 2) return toast.error('Name is required');
    setSavingProfile(true);
    try {
      const { data } = await api.put('/auth/profile', { name: profile.name.trim(), phone: profile.phone.trim() });
      sync(data.data.user);
      toast.success('Profile updated');
    } catch (e) { toast.error(errMsg(e)); } finally { setSavingProfile(false); }
  };

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5 MB');
    const fd = new FormData();
    fd.append('avatar', file);
    setUploading(true);
    try {
      const { data } = await api.put('/auth/avatar', fd);
      sync(data.data.user);
      toast.success('Photo updated');
    } catch (err) { toast.error(errMsg(err)); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const saveContacts = async () => {
    setSavingContacts(true);
    try {
      const { data } = await api.put('/auth/profile', { emergencyContact: contacts.emergencyContact, guardianDetails: contacts.guardianDetails });
      sync(data.data.user);
      toast.success('Contacts saved');
    } catch (e) { toast.error(errMsg(e)); } finally { setSavingContacts(false); }
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
    } catch (e) { toast.error(errMsg(e)); } finally { setSavingPwd(false); }
  };

  const pickTheme = (t) => { applyTheme(t); setThemeState(t); };

  const roleLabel = cap(role);
  const meta = [
    { icon: ShieldCheck, label: 'Role', value: roleLabel, cap: true },
    { icon: CalendarDays, label: 'Member since', value: me?.createdAt ? fmtDate(me.createdAt) : '—' },
    { icon: Hash, label: 'Account ID', value: me?._id ? `#${String(me._id).slice(-8).toUpperCase()}` : '—' },
  ];

  const SECTIONS = [
    { id: 'account', label: 'Account', icon: UserRound, hint: 'Your personal details' },
    ...(role === 'tenant' ? [{ id: 'stay', label: 'My Stay', icon: Home, hint: 'Room, deposit & contacts' }] : []),
    ...(role === 'staff' ? [{ id: 'employment', label: 'Employment', icon: Briefcase, hint: 'Your role & pay' }] : []),
    { id: 'security', label: 'Security', icon: ShieldCheck, hint: 'Password & sign-in' },
    { id: 'preferences', label: 'Preferences', icon: Sun, hint: 'Appearance' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" subtitle="Manage your account, details and security" />

      {/* ── Identity header ─────────────────────────────────────── */}
      <div className="surface-hero relative overflow-hidden rounded-2xl p-6 text-white shadow-hero sm:p-7">
        <div className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <Avatar name={me?.name} src={assetUrl(me?.profileImage)} size="lg" className="h-20 w-20 text-xl ring-2 ring-white/25 shadow-[0_8px_22px_-6px_rgba(0,0,0,0.5)]" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand-600 shadow-md ring-2 ring-brand-600/10 transition-transform hover:scale-105 disabled:opacity-60"
              title="Change photo"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPickAvatar} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-bold tracking-tight">{me?.name || '—'}</h2>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-white/70">
              <Mail className="h-4 w-4 shrink-0 text-white/55" /><span className="truncate">{me?.email || '—'}</span>
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
          {/* Completeness */}
          <div className="w-full sm:w-44">
            <div className="flex items-center justify-between text-xs text-white/70"><span>Profile complete</span><span className="font-bold text-white">{completeness}%</span></div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${completeness}%` }} />
            </div>
            {completeness < 100 && <p className="mt-1.5 text-[11px] text-white/55">Add a photo & contacts to complete it.</p>}
          </div>
        </div>
      </div>

      {/* ── Section nav + content ───────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
        <nav className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          {SECTIONS.map((s) => {
            const active = section === s.id;
            return (
              <button key={s.id} onClick={() => setSection(s.id)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors lg:flex-none ${active ? 'bg-brand-600 text-white shadow-[0_8px_18px_-6px_rgba(36,48,71,0.5)]' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700 dark:text-slate-300 dark:hover:bg-white/5'}`}>
                <s.icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-brand-600'}`} strokeWidth={2.1} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight">{s.label}</span>
                  <span className={`hidden text-[11px] lg:block ${active ? 'text-white/70' : 'text-slate-400'}`}>{s.hint}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-6">
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
                  <div className="flex h-10 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5">
                    <Mail className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{me?.email || '—'}</span>
                    <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300" />
                  </div>
                </Field>
                <Field label="Role">
                  <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-white/10 dark:bg-white/5"><Badge tone="indigo">{roleLabel}</Badge></div>
                </Field>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-white/10 pt-4">
                {dirty && <span className="text-xs text-slate-400">Unsaved changes</span>}
                <Button onClick={saveProfile} loading={savingProfile} disabled={!dirty}><Check className="h-4 w-4" /> Save changes</Button>
              </div>
            </Card>
          )}

          {section === 'stay' && role === 'tenant' && (
            <>
              <Card title="My stay">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: Home, label: 'Room', value: tp?.roomId?.roomNumber ? `Room ${tp.roomId.roomNumber} · ${cap(tp.roomId.roomType)}` : 'Not assigned' },
                    { icon: CalendarDays, label: 'Joined', value: tp?.joiningDate ? fmtDate(tp.joiningDate) : '—' },
                    { icon: IndianRupee, label: 'Monthly rent', value: tp?.rentAmount ? inr(tp.rentAmount) : '—' },
                    { icon: Wallet, label: 'Security deposit', value: tp?.securityDeposit ? inr(tp.securityDeposit) : '—' },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 px-3.5 py-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><r.icon className="h-4 w-4" /></span>
                      <div><p className="text-[11px] uppercase tracking-wide text-slate-400">{r.label}</p><p className="text-sm font-semibold text-slate-900 dark:text-white">{r.value}</p></div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-white/10 pt-4">
                  <span className="text-xs font-medium text-slate-500">Verification:</span>
                  <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-slate-400" /><Badge tone={KYC_TONE[tp?.policeVerification] || 'gray'}>Police: {cap(tp?.policeVerification)}</Badge></span>
                  <span className="inline-flex items-center gap-1.5"><FileCheck className="h-3.5 w-3.5 text-slate-400" /><Badge tone={KYC_TONE[tp?.agreementStatus] || 'gray'}>Agreement: {cap(tp?.agreementStatus)}</Badge></span>
                  {tp?.idProof?.type && <Badge tone="blue">{cap(tp.idProof.type)}{tp.idProof.number ? ` · ${tp.idProof.number}` : ''}</Badge>}
                </div>
              </Card>

              <Card title="Emergency & guardian contacts">
                <p className="-mt-1 mb-4 flex items-center gap-2 text-xs text-slate-400"><Heart className="h-3.5 w-3.5" /> Who we contact in an emergency. Keep this up to date.</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Emergency contact name"><Input value={contacts.emergencyContact.name} onChange={(e) => setContacts((c) => ({ ...c, emergencyContact: { ...c.emergencyContact, name: e.target.value } }))} placeholder="Full name" /></Field>
                  <Field label="Phone"><Input value={contacts.emergencyContact.phone} onChange={(e) => setContacts((c) => ({ ...c, emergencyContact: { ...c.emergencyContact, phone: e.target.value } }))} placeholder="+91 98XXXXXXXX" /></Field>
                  <Field label="Relation"><Input value={contacts.emergencyContact.relation} onChange={(e) => setContacts((c) => ({ ...c, emergencyContact: { ...c.emergencyContact, relation: e.target.value } }))} placeholder="e.g. Parent" /></Field>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <Field label="Guardian name"><Input value={contacts.guardianDetails.name} onChange={(e) => setContacts((c) => ({ ...c, guardianDetails: { ...c.guardianDetails, name: e.target.value } }))} placeholder="Full name" /></Field>
                  <Field label="Guardian phone"><Input value={contacts.guardianDetails.phone} onChange={(e) => setContacts((c) => ({ ...c, guardianDetails: { ...c.guardianDetails, phone: e.target.value } }))} placeholder="+91 98XXXXXXXX" /></Field>
                  <Field label="Guardian address"><Input value={contacts.guardianDetails.address} onChange={(e) => setContacts((c) => ({ ...c, guardianDetails: { ...c.guardianDetails, address: e.target.value } }))} placeholder="City / address" /></Field>
                </div>
                <div className="mt-6 flex justify-end border-t border-slate-100 dark:border-white/10 pt-4">
                  <Button onClick={saveContacts} loading={savingContacts}><Users className="h-4 w-4" /> Save contacts</Button>
                </div>
              </Card>
            </>
          )}

          {section === 'employment' && role === 'staff' && (
            <Card title="Employment">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Briefcase, label: 'Role', value: cap(sp?.staffType || 'staff') },
                  { icon: IndianRupee, label: 'Monthly salary', value: sp?.salary ? inr(sp.salary) : '—' },
                  { icon: CalendarDays, label: 'Joined', value: sp?.joinedAt ? fmtDate(sp.joinedAt) : '—' },
                  { icon: BadgeCheck, label: 'Status', value: cap(sp?.status || 'active') },
                ].map((r) => (
                  <div key={r.label} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 px-3.5 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><r.icon className="h-4 w-4" /></span>
                    <div><p className="text-[11px] uppercase tracking-wide text-slate-400">{r.label}</p><p className="text-sm font-semibold text-slate-900 dark:text-white capitalize">{r.value}</p></div>
                  </div>
                ))}
              </div>
              <p className="mt-4 border-t border-slate-100 dark:border-white/10 pt-4 text-xs text-slate-400">Employment details are managed by your admin.</p>
            </Card>
          )}

          {section === 'security' && (
            <Card title="Password">
              <div className="mb-5 flex items-start gap-3 rounded-xl bg-brand-50 dark:bg-brand-500/15 px-3.5 py-3 ring-1 ring-brand-600/10">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-surface text-brand-600 ring-1 ring-brand-600/15"><ShieldCheck className="h-[18px] w-[18px]" /></div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">Choose a strong password — at least 8 characters with a mix of letters and numbers. Changing it signs out your other devices.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Current password" required className="sm:col-span-2"><PasswordInput value={pwd.currentPassword} onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))} autoComplete="current-password" /></Field>
                <Field label="New password" required hint="At least 8 characters"><PasswordInput value={pwd.newPassword} onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))} autoComplete="new-password" /></Field>
                <Field label="Confirm new password" required><PasswordInput value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" /></Field>
              </div>
              <div className="mt-6 flex justify-end border-t border-slate-100 dark:border-white/10 pt-4"><Button onClick={changePassword} loading={savingPwd}><KeyRound className="h-4 w-4" /> Update password</Button></div>
            </Card>
          )}

          {section === 'preferences' && (
            <Card title="Appearance">
              <p className="-mt-1 mb-4 text-xs text-slate-400">Choose how Quarters looks on this device.</p>
              <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                {[{ id: 'light', label: 'Light', icon: Sun }, { id: 'dark', label: 'Dark', icon: Moon }].map((t) => {
                  const active = theme === t.id;
                  return (
                    <button key={t.id} onClick={() => pickTheme(t.id)} className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-colors ${active ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/15' : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}><t.icon className="h-4 w-4" /></span>
                      <span className={`text-sm font-semibold ${active ? 'text-brand-700 dark:text-brand-200' : 'text-slate-700 dark:text-slate-200'}`}>{t.label}</span>
                      {active && <Check className="ml-auto h-4 w-4 text-brand-600 dark:text-brand-300" />}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
