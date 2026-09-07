import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Building2, User, Mail, Phone, Lock, Check } from 'lucide-react';
import AuthShell from './AuthShell';
import { Button, Field, Input, PasswordInput } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { errMsg } from '../../api/client';

const schema = z
  .object({
    hostelName: z.string().min(2, 'Hostel / PG name is required'),
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Enter a valid email'),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Add an uppercase letter')
      .regex(/[a-z]/, 'Add a lowercase letter')
      .regex(/[0-9]/, 'Add a digit'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' });

/** Small uppercase eyebrow that groups the form into sections. */
function GroupLabel({ children }) {
  return (
    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
      {children}
    </p>
  );
}

/** Leading-icon wrapper so every field matches the login form. */
function IconField({ icon: Icon, children }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
      {children}
    </div>
  );
}

/** Live password strength — 4 segments + label + requirement checklist. */
function PasswordStrength({ value = '' }) {
  const checks = [
    { key: 'len', label: '8+ chars', ok: value.length >= 8 },
    { key: 'upper', label: 'Uppercase', ok: /[A-Z]/.test(value) },
    { key: 'lower', label: 'Lowercase', ok: /[a-z]/.test(value) },
    { key: 'digit', label: 'Number', ok: /[0-9]/.test(value) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const meta = [
    { label: 'Too short', color: '#e4e4e7' },
    { label: 'Weak', color: '#ef4444' },
    { label: 'Fair', color: '#f59e0b' },
    { label: 'Good', color: '#eab308' },
    { label: 'Strong', color: '#10b981' },
  ][value ? score : 0];

  if (!value) return null;
  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors duration-300"
            style={{ backgroundColor: i < score ? meta.color : 'var(--ring-track)' }}
          />
        ))}
        <span className="ml-1 w-12 text-right text-[11px] font-semibold" style={{ color: meta.color }}>{meta.label}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {checks.map((c) => (
          <span key={c.key} className={`inline-flex items-center gap-1 text-[11px] ${c.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
            <span className={`flex h-3 w-3 items-center justify-center rounded-full ${c.ok ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-white/10'}`}>
              {c.ok && <Check className="h-2 w-2" strokeWidth={3.5} />}
            </span>
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Register() {
  const { register: signup } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const pwd = watch('password') || '';

  const onSubmit = async ({ hostelName, name, email, phone, password }) => {
    setBusy(true);
    try {
      await signup({ hostelName, name, email, phone, password });
      toast.success('Your hostel is ready — welcome to Quarters!');
      navigate('/admin');
    } catch (e) {
      toast.error(errMsg(e, 'Registration failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Start your free trial"
      subtitle="Create your hostel on Quarters — full Pro access for 14 days, no card needed"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">Log in</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* ── Your property ── */}
        <div className="space-y-4">
          <GroupLabel>Your property</GroupLabel>
          <Field label="Hostel / PG name" error={errors.hostelName?.message} required>
            <IconField icon={Building2}>
              <Input placeholder="e.g. Sunrise PG for Professionals" autoComplete="organization" error={errors.hostelName} className="pl-10" {...register('hostelName')} />
            </IconField>
          </Field>
        </div>

        {/* ── Your account ── */}
        <div className="space-y-4 border-t border-slate-100 pt-5 dark:border-white/10">
          <GroupLabel>Your account</GroupLabel>
          <Field label="Your full name" error={errors.name?.message} required>
            <IconField icon={User}>
              <Input placeholder="Owner / manager name" autoComplete="name" error={errors.name} className="pl-10" {...register('name')} />
            </IconField>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email address" error={errors.email?.message} required>
              <IconField icon={Mail}>
                <Input type="email" placeholder="you@example.com" autoComplete="email" error={errors.email} className="pl-10" {...register('email')} />
              </IconField>
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <IconField icon={Phone}>
                <Input placeholder="+91 98XXXXXXXX" autoComplete="tel" error={errors.phone} className="pl-10" {...register('phone')} />
              </IconField>
            </Field>
          </div>
          <Field label="Password" error={errors.password?.message} required>
            <IconField icon={Lock}>
              <PasswordInput placeholder="••••••••" autoComplete="new-password" error={errors.password} className="pl-10" {...register('password')} />
            </IconField>
            <PasswordStrength value={pwd} />
          </Field>
          <Field label="Confirm password" error={errors.confirm?.message} required>
            <IconField icon={Lock}>
              <PasswordInput placeholder="••••••••" autoComplete="new-password" error={errors.confirm} className="pl-10" {...register('confirm')} />
            </IconField>
          </Field>
        </div>

        <Button type="submit" loading={busy} className="w-full" size="lg">Start free trial</Button>
        <p className="text-center text-xs leading-relaxed text-slate-400">
          By creating an account you agree to our{' '}
          <Link to="/terms" className="text-brand-600 hover:underline">Terms</Link> and{' '}
          <Link to="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>.
        </p>
      </form>
    </AuthShell>
  );
}
