import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import { Button, Field, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { errMsg } from '../../api/client';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const DEMO = [
  { label: 'Admin', email: 'admin@hostelhub.com', password: 'Admin@123' },
  { label: 'Tenant', email: 'tenant@hostelhub.com', password: 'Tenant@123' },
  { label: 'Staff', email: 'staff@hostelhub.com', password: 'Staff@123' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const autoRan = useRef(false);
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const doLogin = async (email, password) => {
    setBusy(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(`/${user.role}`);
    } catch (e) {
      toast.error(errMsg(e, 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = ({ email, password }) => doLogin(email, password);

  // Dev convenience: /login?demo=tenant (or admin/staff) auto-logs in with a
  // demo account so a single link lands on that role's dashboard. Dev-only.
  useEffect(() => {
    if (!import.meta.env.DEV || autoRan.current) return;
    const role = params.get('demo');
    const d = role && DEMO.find((x) => x.label.toLowerCase() === role.toLowerCase());
    if (d) { autoRan.current = true; doLogin(d.email, d.password); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your HostelHub account"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-brand-600 font-medium hover:underline">Sign up</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Email address" error={errors.email?.message} required>
          <Input type="email" placeholder="you@example.com" autoComplete="email" error={errors.email} {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message} required>
          <Input type="password" placeholder="••••••••" autoComplete="current-password" error={errors.password} {...register('password')} />
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-brand-600 hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" loading={busy} className="w-full" size="lg">Log in</Button>
      </form>

      <div className="mt-7">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-slate-200" />
          <p className="text-xs text-slate-400">Quick demo login</p>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {DEMO.map((d) => (
            <button
              key={d.label}
              type="button"
              disabled={busy}
              onClick={() => doLogin(d.email, d.password)}
              className="h-10 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50/40 transition-colors disabled:opacity-50"
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}
