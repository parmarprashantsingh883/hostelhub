import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Mail, Lock, ShieldCheck, User, Wrench, ArrowRight } from 'lucide-react';
import AuthShell from './AuthShell';
import { Button, Field, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { errMsg } from '../../api/client';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const DEMO = [
  { label: 'Admin',  email: 'admin@hostelhub.com',  password: 'Admin@123',  icon: ShieldCheck, tone: 'from-emerald-500 to-emerald-700', ring: 'ring-emerald-200', text: 'text-emerald-700', bg: 'hover:bg-emerald-50' },
  { label: 'Tenant', email: 'tenant@hostelhub.com', password: 'Tenant@123', icon: User,        tone: 'from-sky-500 to-indigo-600',     ring: 'ring-sky-200',     text: 'text-sky-700',     bg: 'hover:bg-sky-50' },
  { label: 'Staff',  email: 'staff@hostelhub.com',  password: 'Staff@123',  icon: Wrench,      tone: 'from-amber-500 to-orange-600',   ring: 'ring-amber-200',   text: 'text-amber-700',   bg: 'hover:bg-amber-50' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const autoRan = useRef(false);
  const [busy, setBusy] = useState(false);
  const [activeDemo, setActiveDemo] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const doLogin = async (email, password, demoLabel) => {
    setBusy(true);
    if (demoLabel) setActiveDemo(demoLabel);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(`/${user.role}`);
    } catch (e) {
      toast.error(errMsg(e, 'Login failed'));
    } finally {
      setBusy(false);
      setActiveDemo(null);
    }
  };

  const onSubmit = ({ email, password }) => doLogin(email, password);

  // Dev convenience: /login?demo=tenant (or admin/staff) auto-logs in with a
  // demo account so a single link lands on that role's dashboard. Dev-only.
  useEffect(() => {
    if (!import.meta.env.DEV || autoRan.current) return;
    const role = params.get('demo');
    const d = role && DEMO.find((x) => x.label.toLowerCase() === role.toLowerCase());
    if (d) { autoRan.current = true; doLogin(d.email, d.password, d.label); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your properties"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-brand-600 font-semibold hover:underline">Create one</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Email address" error={errors.email?.message} required>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input type="email" placeholder="you@example.com" autoComplete="email" error={errors.email} className="pl-10" {...register('email')} />
          </div>
        </Field>
        <Field label="Password" error={errors.password?.message} required>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input type="password" placeholder="••••••••" autoComplete="current-password" error={errors.password} className="pl-10" {...register('password')} />
          </div>
        </Field>
        <div className="flex justify-end -mt-1">
          <Link to="/forgot-password" className="text-sm text-brand-600 hover:underline font-medium">Forgot password?</Link>
        </div>
        <Button type="submit" loading={busy && !activeDemo} className="w-full group" size="lg">
          Log in
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </form>

      <div className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          <p className="text-[11px] text-slate-400 font-semibold tracking-widest uppercase">Quick demo login</p>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {DEMO.map((d) => {
            const isActive = activeDemo === d.label;
            return (
              <button
                key={d.label}
                type="button"
                disabled={busy}
                onClick={() => doLogin(d.email, d.password, d.label)}
                className={`group relative h-[58px] rounded-xl border border-slate-200 bg-white px-2 flex flex-col items-center justify-center gap-1 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-soft hover:border-transparent hover:ring-2 ${d.ring} ${d.bg} disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed`}
              >
                <span className={`w-7 h-7 rounded-lg bg-gradient-to-br ${d.tone} flex items-center justify-center text-white shadow-sm`}>
                  <d.icon className="w-3.5 h-3.5" strokeWidth={2.4} />
                </span>
                <span className={`text-[11px] font-semibold ${d.text}`}>{d.label}</span>
                {isActive && (
                  <span className="absolute inset-0 rounded-xl bg-white/60 flex items-center justify-center">
                    <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 text-center mt-3">One click — no password needed for demo accounts</p>
      </div>
    </AuthShell>
  );
}
