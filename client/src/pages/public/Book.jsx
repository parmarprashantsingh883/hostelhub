import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, CheckCircle2, BedDouble, Receipt, ShieldCheck, Sparkles,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import { LogoMark } from '../../components/brand/Logo';

const EASE = [0.16, 1, 0.3, 1];

const PERKS = [
  { icon: BedDouble, text: 'Rooms & beds ready to move into' },
  { icon: Receipt, text: 'Transparent rent with instant receipts' },
  { icon: ShieldCheck, text: 'Secure, no-obligation enquiry' },
];

const EMPTY = { name: '', phone: '', email: '', budget: '', note: '' };

/* ── Shared field styling (kept local so this page has no auth deps) ── */
const fieldCls =
  'w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all hover:border-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10';

function Label({ children, required }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-slate-700">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

export default function Book() {
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone are required.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/leads/public', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        budget: form.budget === '' ? undefined : Number(form.budget),
        note: form.note.trim() || undefined,
      });
      setDone(true);
    } catch (err) {
      setError(errMsg(err, 'Could not send your enquiry. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      {/* ─────────────  NAVY HERO  ───────────── */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex xl:p-14">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(140%_120%_at_0%_0%,#41506a_0%,#243047_45%,#0e1420_100%)]" />
        <div className="pointer-events-none absolute -left-28 -top-32 z-0 h-[30rem] w-[30rem] rounded-full bg-slate-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-1/3 z-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '28px 28px' }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-48 bg-gradient-to-b from-white/12 to-transparent" />

        <Link to="/" className="group relative z-10 flex w-fit items-center gap-3">
          <LogoMark size={46} className="drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-transform group-hover:scale-105" />
          <div>
            <div className="text-[22px] font-extrabold leading-none tracking-tight">HostelHub</div>
            <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-slate-300/80">Book your stay</div>
          </div>
        </Link>

        <div className="relative z-10">
          <motion.span
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white/95 ring-1 ring-white/25 backdrop-blur-md"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            NOW ACCEPTING ENQUIRIES
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }}
            className="text-[2.75rem] font-extrabold leading-[1.05] tracking-tight xl:text-5xl"
          >
            Find your room,
            <br />
            <span className="bg-gradient-to-r from-white via-slate-300 to-white bg-clip-text text-transparent">
              make it home.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }}
            className="mt-5 max-w-md text-[15px] leading-relaxed text-white/80"
          >
            Tell us a little about what you need and our team will reach out with availability,
            pricing and a tour — usually within a day.
          </motion.p>

          <ul className="mt-8 space-y-3.5">
            {PERKS.map((p, i) => (
              <motion.li
                key={p.text}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.18 + i * 0.06 }}
                className="flex items-center gap-3.5 text-[14.5px] text-white/95"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/25 backdrop-blur-sm">
                  <p.icon className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
                </span>
                {p.text}
              </motion.li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-[11px] text-white/45">© {new Date().getFullYear()} HostelHub · All rights reserved</p>
      </div>

      {/* ─────────────  FORM PANE  ───────────── */}
      <div className="flex items-center justify-center bg-gradient-to-b from-white to-cream-100 p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark size={40} />
            <span className="text-lg font-extrabold tracking-tight text-slate-900">HostelHub</span>
          </Link>

          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: EASE }}
              className="text-center"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h1 className="mt-6 text-[26px] font-extrabold leading-tight tracking-tight text-slate-900">Enquiry received!</h1>
              <p className="mt-2 text-sm text-slate-500">
                Thanks, {form.name.split(' ')[0] || 'there'}. Our team will get in touch with you shortly on{' '}
                <span className="font-semibold text-slate-700">{form.phone}</span>.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  onClick={() => { setForm({ ...EMPTY }); setDone(false); }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-300 px-6 text-sm font-semibold text-slate-700 transition-colors hover:border-night-900 hover:bg-white"
                >
                  Send another enquiry
                </button>
                <Link
                  to="/"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Back to home <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          ) : (
            <>
              <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-slate-900">Book a room</h1>
              <p className="mt-1.5 text-sm text-slate-500">No account needed. It takes under a minute.</p>

              <form onSubmit={submit} className="mt-8 space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
                )}
                <div>
                  <Label required>Full name</Label>
                  <input className={fieldCls} value={form.name} onChange={set('name')} placeholder="e.g. Aarav Sharma" required />
                </div>
                <div>
                  <Label required>Phone</Label>
                  <input className={fieldCls} value={form.phone} onChange={set('phone')} placeholder="10-digit mobile number" required />
                </div>
                <div>
                  <Label>Email</Label>
                  <input type="email" className={fieldCls} value={form.email} onChange={set('email')} placeholder="you@email.com" />
                </div>
                <div>
                  <Label>Monthly budget (₹)</Label>
                  <input type="number" min={0} className={fieldCls} value={form.budget} onChange={set('budget')} placeholder="e.g. 8000" />
                </div>
                <div>
                  <Label>Message</Label>
                  <textarea
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all hover:border-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                    value={form.note}
                    onChange={set('note')}
                    placeholder="Sharing / single? Move-in date? Anything else we should know?"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white shadow-[0_14px_30px_-10px_rgba(36,48,71,0.7)] transition-all hover:-translate-y-0.5 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {busy ? 'Sending…' : <>Send enquiry <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Already a resident?{' '}
                <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">Sign in</Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
