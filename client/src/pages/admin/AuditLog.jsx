import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ScrollText, Globe } from 'lucide-react';
import { api, errMsg } from '../../api/client';
import { Card, Badge, Spinner, EmptyState, PageHeader, Avatar, Select, Pagination, fmtDateTime } from '../../components/ui';

const ACTIONS = {
  login: { label: 'Signed in', tone: 'green' },
  login_failed: { label: 'Failed sign-in', tone: 'yellow' },
  login_blocked_locked: { label: 'Blocked (locked)', tone: 'red' },
  login_mfa_failed: { label: 'Failed 2FA code', tone: 'yellow' },
  mfa_enabled: { label: 'Enabled 2FA', tone: 'green' },
  mfa_disabled: { label: 'Disabled 2FA', tone: 'yellow' },
  password_changed: { label: 'Changed password', tone: 'blue' },
  permissions_changed: { label: 'Changed staff access', tone: 'blue' },
  staff_removed: { label: 'Removed staff', tone: 'red' },
  resident_removed: { label: 'Removed resident', tone: 'red' },
  plan_activated: { label: 'Activated plan', tone: 'green' },
  plan_canceled: { label: 'Canceled plan', tone: 'yellow' },
  data_exported: { label: 'Exported data', tone: 'blue' },
};
const pretty = (a) => ACTIONS[a] || { label: a.replace(/_/g, ' '), tone: 'gray' };

export default function AuditLog() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/audit-logs', { params: { page, limit: 25, action: action || undefined } });
      setData(res.data);
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  }, [page, action]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" subtitle="A trail of security- and money-sensitive actions in your organization" />

      <Card
        title="Recent events"
        action={
          <div className="w-56">
            <Select value={action} onChange={(e) => { setPage(1); setAction(e.target.value); }} placeholder="All actions">
              <option value="">All actions</option>
              {Object.keys(ACTIONS).map((a) => <option key={a} value={a}>{ACTIONS[a].label}</option>)}
            </Select>
          </div>
        }
      >
        {loading ? (
          <Spinner />
        ) : !data || data.logs.length === 0 ? (
          <EmptyState icon={ScrollText} title="No events yet" message="Sensitive actions like sign-ins, access changes and billing will appear here." />
        ) : (
          <>
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {data.logs.map((l) => {
                const p = pretty(l.action);
                const actor = l.actorId?.name || l.actorName || 'Someone';
                return (
                  <li key={l._id} className="flex items-center gap-3 py-3">
                    <Avatar name={actor} size="sm" src={l.actorId?.profileImage} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-800 dark:text-slate-100">
                        <span className="font-semibold">{actor}</span>
                        {l.meta?.name ? <span className="text-slate-500"> · {l.meta.name}</span> : null}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-slate-400">
                        {l.actorId?.role || l.actorRole || '—'}
                        {l.ip ? <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /> {l.ip}</span> : null}
                      </p>
                    </div>
                    <Badge tone={p.tone}>{p.label}</Badge>
                    <span className="w-32 shrink-0 text-right font-mono text-[11px] text-slate-400">{fmtDateTime(l.createdAt)}</span>
                  </li>
                );
              })}
            </ul>
            <Pagination page={data.page} totalPages={data.pages} total={data.total} pageSize={25} onPage={setPage} className="mt-4" />
          </>
        )}
      </Card>
    </div>
  );
}
