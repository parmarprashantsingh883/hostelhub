import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MailCheck } from 'lucide-react';
import AuthShell from './AuthShell';
import { Button, Field, Input } from '../../components/ui';
import { api, errMsg } from '../../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Enter your email');
    setBusy(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Forgot password"
      subtitle="We'll email you a secure link to reset it"
      footer={
        <Link to="/login" className="text-brand-600 font-medium hover:underline">← Back to login</Link>
      }
    >
      {sent ? (
        <div className="text-center py-8">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <MailCheck className="w-7 h-7" />
          </div>
          <p className="font-medium text-gray-800">Check your inbox</p>
          <p className="text-sm text-gray-500 mt-1.5">
            If <b>{email}</b> has an account, a reset link is on its way. The link is valid for 30 minutes.
          </p>
          <p className="text-xs text-gray-400 mt-4">
            Dev mode: the link is printed in the server console.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email address" required>
            <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" loading={busy} className="w-full" size="lg">Send reset link</Button>
        </form>
      )}
    </AuthShell>
  );
}
