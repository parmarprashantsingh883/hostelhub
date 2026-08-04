import { useEffect, useState } from 'react';
import { UserPlus, DoorOpen, IndianRupee, CheckCircle2, Wrench, CalendarCheck, Megaphone, Activity } from 'lucide-react';
import { api } from '../../api/client';
import { Card, EmptyState, Skeleton } from '../ui';

const ICONS = {
  user: { Icon: UserPlus, cls: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300' },
  door: { Icon: DoorOpen, cls: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300' },
  rupee: { Icon: IndianRupee, cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
  check: { Icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
  wrench: { Icon: Wrench, cls: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
  calendar: { Icon: CalendarCheck, cls: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300' },
  megaphone: { Icon: Megaphone, cls: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' },
};

function ago(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ActivityFeed() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get('/dashboard/activity').then(({ data }) => setItems(data.data.items || [])).catch(() => setItems([]));
  }, []);

  return (
    <Card title="Recent activity" action={<Activity className="h-4 w-4 text-slate-300" />}>
      {items === null ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet" message="Actions across your property will show up here." />
      ) : (
        <ul className="relative space-y-1">
          {/* connecting rail */}
          <span className="absolute bottom-2 left-[18px] top-2 w-px bg-slate-100 dark:bg-white/10" />
          {items.map((it, i) => {
            const { Icon, cls } = ICONS[it.icon] || { Icon: Activity, cls: 'bg-slate-100 text-slate-500' };
            return (
              <li key={i} className="relative flex items-start gap-3 rounded-lg px-1 py-2">
                <span className={`z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-surface ${cls}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-sm leading-snug text-slate-700 dark:text-slate-200">{it.text}</p>
                </div>
                <span className="shrink-0 whitespace-nowrap pt-1 font-mono text-[10px] uppercase tracking-wide text-slate-400">{ago(it.at)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
