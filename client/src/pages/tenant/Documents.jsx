import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FileText, Download, FileBadge, FileSignature, Receipt, ShieldCheck,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Card, Badge, Spinner, EmptyState, PageHeader, Stagger, StaggerItem, fmtDate,
} from '../../components/ui';

const TYPE = {
  id_proof:            { label: 'ID Proof',            icon: FileBadge,     tile: 'bg-blue-50 dark:bg-sky-500/15 text-blue-600 dark:text-sky-300',       badge: 'blue' },
  agreement:           { label: 'Agreement',           icon: FileSignature, tile: 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300',     badge: 'indigo' },
  payment_proof:       { label: 'Payment Proof',       icon: Receipt,       tile: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300',     badge: 'yellow' },
  police_verification: { label: 'Police Verification', icon: ShieldCheck,   tile: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300', badge: 'green' },
  other:               { label: 'Other',               icon: FileText,      tile: 'bg-slate-100 dark:bg-white/10 text-slate-500',    badge: 'gray' },
};
const typeStyle = (t) => TYPE[t] || { label: t, icon: FileText, tile: 'bg-slate-100 dark:bg-white/10 text-slate-500', badge: 'gray' };

export default function TenantDocuments() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/documents');
      setDocs(data.data.documents);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Documents"
        subtitle={loading ? 'Agreements and verification documents shared by the admin'
          : `${docs.length} document${docs.length === 1 ? '' : 's'} shared by the admin`}
      />

      {loading ? (
        <Card><Spinner /></Card>
      ) : docs.length === 0 ? (
        <Card><EmptyState icon={FileText} title="No documents yet" message="Documents uploaded by the admin will appear here." /></Card>
      ) : (
        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((d) => {
            const { label, icon: Icon, tile, badge } = typeStyle(d.documentType);
            return (
              <StaggerItem key={d._id} className="h-full">
                <div className="group h-full bg-white dark:bg-surface rounded-2xl border border-slate-200/70 dark:border-white/10 shadow-card hover:shadow-soft hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col">
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${tile}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white truncate" title={d.fileName}>{d.fileName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Added {fmtDate(d.createdAt)}</p>
                    </div>
                  </div>
                  <div className="mt-3"><Badge tone={badge}>{label}</Badge></div>
                  <a
                    href={d.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-slate-300 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-white/5 hover:border-brand-300 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download
                  </a>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </div>
  );
}
