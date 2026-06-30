import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FileSignature, FileDown, CheckCircle2, PenLine, ShieldCheck, Clock } from 'lucide-react';
import { api, errMsg, assetUrl } from '../../api/client';
import { Button, Card, Badge, Field, Input, Spinner, EmptyState, PageHeader, inr, fmtDate } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

const cap = (s) => String(s || '').replace(/\b\w/g, (m) => m.toUpperCase());

export default function Agreement() {
  const { user } = useAuth();
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signer, setSigner] = useState(user?.name || '');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/agreements/me');
      setAgreement(data.data.agreement);
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const download = async () => {
    try { const { data } = await api.get(`/agreements/${agreement._id}/pdf`); window.open(assetUrl(data.data.pdfUrl), '_blank', 'noopener'); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const sign = async () => {
    if (!agreed) return toast.error('Please tick the box to confirm you agree');
    if (!signer.trim()) return toast.error('Type your full name to sign');
    setBusy(true);
    try {
      const { data } = await api.put(`/agreements/${agreement._id}/sign`, { signerName: signer.trim() });
      setAgreement(data.data.agreement);
      toast.success('Agreement signed 🎉');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const a = agreement;
  const term = a ? [
    { label: 'Room', value: a.roomId?.roomNumber ? `Room ${a.roomId.roomNumber}` : '—' },
    { label: 'Monthly rent', value: inr(a.rentAmount) },
    { label: 'Security deposit', value: inr(a.depositAmount) },
    { label: 'Term', value: `${a.durationMonths} months` },
    { label: 'Starts', value: a.startDate ? fmtDate(a.startDate) : '—' },
    { label: 'Rent due', value: `${a.dueDay}th of each month` },
  ] : [];

  return (
    <div className="space-y-6">
      <PageHeader title="My Agreement" subtitle="Review and e-sign your rental agreement" />

      {loading ? <Spinner /> : !a ? (
        <Card><EmptyState icon={FileSignature} title="No agreement yet" message="Your rental agreement will appear here once the property shares it." /></Card>
      ) : (
        <>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><FileSignature className="h-5 w-5" /></span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Rental agreement</p>
                  <p className="text-xs text-slate-400">No. AG-{String(a._id).slice(-8).toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={a.status === 'signed' ? 'green' : 'yellow'}>{cap(a.status)}</Badge>
                <Button variant="secondary" onClick={download}><FileDown className="h-4 w-4" /> View PDF</Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {term.map((t) => (
                <div key={t.label} className="rounded-xl border border-slate-200 dark:border-white/10 px-3.5 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">{t.label}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.value}</p>
                </div>
              ))}
            </div>
            {a.terms && <p className="mt-4 rounded-xl bg-slate-50 dark:bg-white/5 px-3.5 py-3 text-sm text-slate-600 dark:text-slate-300"><span className="font-medium">Extra clauses:</span> {a.terms}</p>}
          </Card>

          {a.status === 'signed' ? (
            <Card>
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 px-4 py-3.5">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-200">Signed by {a.signerName || user?.name}</p>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">Electronically signed on {fmtDate(a.signedAt)}. A copy is in the PDF above.</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card title="E-sign your agreement">
              <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-brand-50 dark:bg-brand-500/15 px-3.5 py-3 text-xs text-brand-700 dark:text-brand-200">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" /> Please read the agreement (View PDF) before signing. Typing your name below is your legally-binding electronic signature.
              </div>
              <Field label="Type your full name to sign" required>
                <Input value={signer} onChange={(e) => setSigner(e.target.value)} placeholder="Your full legal name" className="font-display text-lg" />
              </Field>
              <label className="mt-3 flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-white/15 accent-brand-600" />
                I have read and agree to the terms of this rental agreement.
              </label>
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 dark:border-white/10 pt-4">
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-500"><Clock className="h-3.5 w-3.5" /> Awaiting your signature</span>
                <Button onClick={sign} loading={busy} disabled={!agreed || !signer.trim()}><PenLine className="h-4 w-4" /> E-sign agreement</Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
