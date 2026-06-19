import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import { Button, Field, Input } from '../../components/ui';
import { api, errMsg } from '../../api/client';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match');
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password reset! Log in with your new password.');
      navigate('/login');
    } catch (err) {
      toast.error(errMsg(err, 'Reset failed — the link may have expired'));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="Invalid link" subtitle="This reset link is missing its token.">
        <Link to="/forgot-password" className="text-brand-600 font-medium hover:underline">
          Request a new link →
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" subtitle="Use at least 8 characters with upper, lower and a digit">
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password" required>
          <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Confirm password" required>
          <Input type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </Field>
        <Button type="submit" loading={busy} className="w-full" size="lg">Reset password</Button>
      </form>
    </AuthShell>
  );
}
