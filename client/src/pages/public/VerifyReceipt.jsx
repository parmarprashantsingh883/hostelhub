import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../api/client';
import { LogoWordmark } from '../../components/brand/Logo';
import { inr, fmtDateTime } from '../../components/ui';

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-sm font-semibold text-slate-900 dark:text-white text-right">{value}</dd>
    </div>
  );
}

export default function VerifyReceipt() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, data: null });

  useEffect(() => {
    let on = true;
    api.get(`/public/verify/${id}`)
      .then(({ data }) => on && setState({ loading: false, data: data.data }))
      .catch(() => on && setState({ loading: false, data: { valid: false } }));
    return () => { on = false; };
  }, [id]);

  const { loading, data } = state;
  const valid = data?.valid;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-12 dark:from-night-950 dark:to-[#0c0f15]">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <Link to="/" className="mb-8"><LogoWordmark height={34} showTagline={false} /></Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft dark:border-white/10 dark:bg-surface"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 px-8 py-20 text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
              <p className="text-sm">Verifying receipt…</p>
            </div>
          ) : valid ? (
            <>
              <div className="flex flex-col items-center bg-emerald-50/80 px-8 py-8 text-center dark:bg-emerald-500/10">
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_10px_24px_-8px_rgba(16,185,129,0.7)]"
                >
                  <ShieldCheck className="h-7 w-7" />
                </motion.span>
                <h1 className="mt-4 text-lg font-bold text-emerald-900 dark:text-emerald-200">Receipt verified</h1>
                <p className="mt-1 text-sm text-emerald-700/90 dark:text-emerald-300/80">
                  This is a genuine receipt issued by {data.business}.
                </p>
              </div>
              <dl className="divide-y divide-slate-100 px-8 py-5 dark:divide-white/10">
                <Row label="Receipt no." value={<span className="font-mono">{data.receiptNo}</span>} />
                <Row label="Amount paid" value={<span className="tabular-nums">{inr(data.amount)}</span>} />
                <Row label="Period" value={data.period} />
                <Row label="Paid on" value={fmtDateTime(data.paidAt)} />
                <Row label="Resident" value={data.tenant} />
                {data.room && <Row label="Room" value={data.room} />}
                {data.method && <Row label="Method" value={<span className="uppercase">{String(data.method).replace(/_/g, ' ')}</span>} />}
              </dl>
            </>
          ) : (
            <div className="flex flex-col items-center px-8 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                <ShieldAlert className="h-7 w-7" />
              </span>
              <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Receipt not found</h1>
              <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                We couldn’t verify this receipt. The link may be invalid, or the rent is not yet paid.
              </p>
            </div>
          )}
        </motion.div>

        <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
          Go to {''}<span className="font-semibold">Quarters</span> <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
