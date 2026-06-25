import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Megaphone, Pin, Info, Wrench, CalendarDays, Banknote, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Card, Badge, Spinner, EmptyState, StatusBadge, PageHeader,
  Stagger, StaggerItem, fmtDateTime,
} from '../../components/ui';

/* Per-category colour + icon so the feed scans at a glance. */
const CATEGORY = {
  general:     { icon: Info,          tile: 'bg-blue-50 dark:bg-sky-500/15 text-blue-600 dark:text-sky-300',          badge: 'blue' },
  maintenance: { icon: Wrench,        tile: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300',  badge: 'yellow' },
  event:       { icon: CalendarDays,  tile: 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300',  badge: 'indigo' },
  payment:     { icon: Banknote,      tile: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300', badge: 'green' },
  emergency:   { icon: AlertTriangle, tile: 'bg-red-50 dark:bg-rose-500/15 text-red-600 dark:text-rose-300',         badge: 'red' },
  rules:       { icon: ShieldCheck,   tile: 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300',     badge: 'gray' },
};
const catStyle = (c) => CATEGORY[c] || { icon: Megaphone, tile: 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300', badge: 'indigo' };
const initials = (name) => (name || 'A').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function Notices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notices');
      setNotices(data.data.notices);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Pinned first, then newest.
  const sorted = [...notices].sort((a, b) => {
    if (!!b.isPinned !== !!a.isPinned) return b.isPinned ? 1 : -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Notices" subtitle="Announcements from the hostel administration" />

      {loading ? (
        <Spinner />
      ) : sorted.length === 0 ? (
        <Card><EmptyState icon={Megaphone} title="No notices" message="Announcements from the admin will appear here." /></Card>
      ) : (
        <Stagger className="space-y-4">
          {sorted.map((n) => {
            const { icon: Icon, tile, badge } = catStyle(n.category);
            return (
              <StaggerItem key={n._id}>
                <Card className={n.isPinned ? 'ring-2 ring-brand-200 bg-brand-50/30' : ''}>
                  <div className="flex gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tile}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {n.isPinned && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 text-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                            <Pin className="w-3 h-3" /> Pinned
                          </span>
                        )}
                        <h3 className="font-semibold text-slate-900 dark:text-white">{n.title}</h3>
                        <Badge tone={badge}>{n.category}</Badge>
                        {n.priority && n.priority !== 'normal' && <StatusBadge status={n.priority} />}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed">{n.content}</p>
                      <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
                        <span className="inline-flex w-5 h-5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 items-center justify-center text-[9px] font-bold">
                          {initials(n.createdBy?.name)}
                        </span>
                        {n.createdBy?.name || 'Admin'} · {fmtDateTime(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </div>
  );
}
