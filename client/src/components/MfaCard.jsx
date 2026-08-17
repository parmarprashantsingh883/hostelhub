import { useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, Smartphone, KeyRound, Copy, Check } from 'lucide-react';
import { api, errMsg } from '../api/client';
import { Card, Button, Field, Input, PasswordInput, Modal, Badge } from './ui';

/**
 * Two-factor (TOTP) enable/disable for the current user. Drops into the
 * Profile → Security section. `enabled` reflects user.mfaEnabled; `onChange`
 * refreshes the account after a state change.
 */
export default function MfaCard({ enabled, onChange }) {
  const [setup, setSetup] = useState(null);       // { qr, secret } once setup starts
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [backupCodes, setBackupCodes] = useState(null); // shown once after enable
  const [copied, setCopied] = useState(false);
  const [disOpen, setDisOpen] = useState(false);
  const [disPwd, setDisPwd] = useState('');
  const [disCode, setDisCode] = useState('');

  const startSetup = async () => {
    setBusy(true);
    try { const { data } = await api.post('/auth/mfa/setup'); setSetup(data.data); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const enable = async () => {
    if (!code.trim()) return toast.error('Enter the 6-digit code');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/mfa/enable', { code: code.trim() });
      setBackupCodes(data.data.backupCodes);
      setSetup(null); setCode('');
      onChange?.();
      toast.success('Two-factor authentication enabled');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await api.post('/auth/mfa/disable', { password: disPwd, code: disCode.trim() });
      setDisOpen(false); setDisPwd(''); setDisCode('');
      onChange?.();
      toast.success('Two-factor authentication disabled');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const copyCodes = () => {
    navigator.clipboard?.writeText(backupCodes.join('\n')).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  return (
    <Card title="Two-factor authentication">
      <div className="mb-5 flex items-start gap-3 rounded-xl bg-brand-50 px-3.5 py-3 ring-1 ring-brand-600/10 dark:bg-brand-500/15">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-brand-600/15 dark:bg-surface"><ShieldCheck className="h-[18px] w-[18px]" /></div>
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          Add a second step to sign-in using an authenticator app (Google Authenticator, Authy, 1Password).
          Even if your password leaks, your account stays protected.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          Status <Badge tone={enabled ? 'green' : 'gray'}>{enabled ? 'Enabled' : 'Off'}</Badge>
        </span>
        {enabled ? (
          <Button variant="danger" onClick={() => { setDisPwd(''); setDisCode(''); setDisOpen(true); }}>Disable 2FA</Button>
        ) : !setup ? (
          <Button onClick={startSetup} loading={busy}><Smartphone className="h-4 w-4" /> Enable 2FA</Button>
        ) : null}
      </div>

      {/* setup flow */}
      {setup && !enabled && (
        <div className="mt-5 grid gap-5 border-t border-slate-100 pt-5 dark:border-white/10 sm:grid-cols-[auto_1fr]">
          <div className="mx-auto">
            <img src={setup.qr} alt="2FA QR code" className="h-40 w-40 rounded-xl ring-1 ring-slate-200 dark:ring-white/10" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">1. Scan the QR</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Or enter this key manually:</p>
            <code className="mt-1.5 block break-all rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-slate-600 dark:bg-white/5 dark:text-slate-300">{setup.secret}</code>
            <p className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-100">2. Enter the 6-digit code</p>
            <div className="mt-1.5 flex gap-2">
              <Input inputMode="numeric" placeholder="123 456" value={code} onChange={(e) => setCode(e.target.value)} className="tracking-[0.25em]" />
              <Button onClick={enable} loading={busy}>Verify</Button>
            </div>
            <button type="button" onClick={() => { setSetup(null); setCode(''); }} className="mt-3 text-xs text-slate-400 hover:text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      {/* backup codes — shown once */}
      <Modal open={!!backupCodes} onClose={() => setBackupCodes(null)} title="Save your backup codes">
        {backupCodes && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Store these somewhere safe. Each code works <span className="font-semibold">once</span> if you lose access to your authenticator. They won’t be shown again.
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-4 font-mono text-sm dark:bg-white/5">
              {backupCodes.map((c) => <span key={c} className="text-slate-700 dark:text-slate-200">{c}</span>)}
            </div>
            <div className="flex justify-between">
              <Button variant="secondary" onClick={copyCodes}>{copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy all</>}</Button>
              <Button onClick={() => setBackupCodes(null)}>I’ve saved them</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* disable confirmation */}
      <Modal open={disOpen} onClose={busy ? undefined : () => setDisOpen(false)} title="Disable two-factor authentication">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">Confirm with your password and a current code (or a backup code).</p>
          <Field label="Password" required><PasswordInput value={disPwd} onChange={(e) => setDisPwd(e.target.value)} autoComplete="current-password" /></Field>
          <Field label="Authentication code" required>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input inputMode="numeric" placeholder="123 456" value={disCode} onChange={(e) => setDisCode(e.target.value)} className="pl-10 tracking-[0.25em]" />
            </div>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDisOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="danger" onClick={disable} loading={busy}>Disable 2FA</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
