import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
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

export default function Register() {
  const { register: signup } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

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
          <Link to="/login" className="text-brand-600 font-medium hover:underline">Log in</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Hostel / PG name" error={errors.hostelName?.message} required>
          <Input placeholder="e.g. Sunrise PG for Professionals" autoComplete="organization" error={errors.hostelName} {...register('hostelName')} />
        </Field>
        <Field label="Your full name" error={errors.name?.message} required>
          <Input placeholder="Owner / manager name" autoComplete="name" error={errors.name} {...register('name')} />
        </Field>
        <Field label="Email address" error={errors.email?.message} required>
          <Input type="email" placeholder="you@example.com" autoComplete="email" error={errors.email} {...register('email')} />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <Input placeholder="+91 98XXXXXXXX" autoComplete="tel" error={errors.phone} {...register('phone')} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Password" error={errors.password?.message} required>
            <PasswordInput placeholder="••••••••" autoComplete="new-password" error={errors.password} {...register('password')} />
          </Field>
          <Field label="Confirm" error={errors.confirm?.message} required>
            <PasswordInput placeholder="••••••••" autoComplete="new-password" error={errors.confirm} {...register('confirm')} />
          </Field>
        </div>
        <Button type="submit" loading={busy} className="w-full" size="lg">Start free trial</Button>
      </form>
    </AuthShell>
  );
}
