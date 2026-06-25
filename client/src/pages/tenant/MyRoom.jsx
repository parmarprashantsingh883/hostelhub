import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Home, Layers, DoorOpen, CheckCircle2, Calendar, Wallet, ShieldCheck,
  Wifi, Car, UtensilsCrossed, Droplets, Zap, Sparkles, Tv, Dumbbell, Flame, Wind, BedDouble,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import { Card, Spinner, EmptyState, StatusBadge, PageHeader, inr, fmtDate } from '../../components/ui';

// Friendly icon per facility keyword (falls back to a check).
const FACILITY_ICON = [
  [/wifi|internet/i, Wifi], [/park/i, Car], [/food|meal|mess/i, UtensilsCrossed],
  [/water|ro\b/i, Droplets], [/power|backup|electric/i, Zap], [/clean|housekeep/i, Sparkles],
  [/tv|television/i, Tv], [/gym|fitness/i, Dumbbell], [/geyser|hot water|heater/i, Flame],
  [/ac|air|cool/i, Wind], [/bed|mattress|furnish/i, BedDouble], [/secur|cctv|guard/i, ShieldCheck],
];
const iconFor = (f) => (FACILITY_ICON.find(([re]) => re.test(f)) || [null, CheckCircle2])[1];

export default function MyRoom() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/tenant');
      setData(res.data.data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;

  const room = data?.room;
  const profile = data?.profile?.tenantProfile;

  if (!room) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Room" subtitle="Your accommodation details" />
        <Card><EmptyState icon={DoorOpen} title="No room assigned yet" message="The admin will assign you a room shortly." /></Card>
      </div>
    );
  }

  const facts = [
    { icon: Layers, label: 'Floor', value: room.floor, tone: 'bg-blue-50 dark:bg-sky-500/15 text-blue-600 dark:text-sky-300' },
    { icon: DoorOpen, label: 'Room type', value: <span className="capitalize">{room.roomType}</span>, tone: 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300' },
    { icon: Wallet, label: 'Monthly rent', value: inr(room.rentAmount), tone: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' },
    profile?.securityDeposit != null
      ? { icon: ShieldCheck, label: 'Deposit', value: inr(profile.securityDeposit), tone: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300' }
      : { icon: Calendar, label: 'Move-in', value: profile?.moveInDate ? fmtDate(profile.moveInDate) : '—', tone: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="My Room" subtitle="Everything about your accommodation" />

      {/* ── Room hero ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 text-white shadow-soft">
        <div className="pointer-events-none absolute -top-16 -right-8 w-64 h-64 rounded-full bg-sun-400/25 blur-3xl" />
        <Home className="pointer-events-none absolute right-6 bottom-2 w-40 h-40 text-white/[0.04]" strokeWidth={1.5} />
        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(36,48,71,0.7)]">
              <DoorOpen className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Your room</p>
              <h2 className="text-3xl font-bold tracking-tight mt-0.5">Room {room.roomNumber}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                <span className="capitalize">{room.roomType}</span>
                <span className="w-1 h-1 rounded-full bg-slate-500" />
                <span>Floor {room.floor}</span>
                {profile?.status && <span className="w-1 h-1 rounded-full bg-slate-500" />}
                {profile?.status && <StatusBadge status={profile.status} />}
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/15 px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-300">Monthly rent</p>
            <p className="text-2xl font-bold tracking-tight mt-1">{inr(room.rentAmount)}</p>
          </div>
        </div>
      </div>

      {/* ── Quick facts ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {facts.map((f) => (
          <div key={f.label} className="bg-white dark:bg-night-900 rounded-2xl border border-slate-200/70 dark:border-white/10 shadow-card p-4 flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${f.tone}`}>
              <f.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{f.label}</p>
              <p className="text-base font-semibold text-slate-900 dark:text-white mt-0.5 truncate">{f.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Facilities */}
        <div className="lg:col-span-2">
          <Card title="Facilities & amenities">
            {room.facilities?.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-2.5">
                {room.facilities.map((fac) => {
                  const Icon = iconFor(fac);
                  return (
                    <div key={fac} className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-white/5 ring-1 ring-slate-100 dark:ring-white/10 px-3.5 py-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-night-900 ring-1 ring-slate-200 dark:ring-white/10 text-brand-600 dark:text-brand-300 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 capitalize">{fac}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={Sparkles} title="No amenities listed" message="Your room's amenities will show here once added." />
            )}
          </Card>
        </div>

        {/* Tenancy */}
        <Card title="Tenancy">
          <dl className="space-y-4">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Status</dt>
              <dd><StatusBadge status={profile?.status || 'active'} /></dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Move-in date</dt>
              <dd className="text-sm font-medium text-slate-900 dark:text-white">{profile?.moveInDate ? fmtDate(profile.moveInDate) : '—'}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Security deposit</dt>
              <dd className="text-sm font-medium text-slate-900 dark:text-white">{profile?.securityDeposit != null ? inr(profile.securityDeposit) : '—'}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/10 pt-4">
              <dt className="text-sm text-slate-500">Monthly rent</dt>
              <dd className="text-base font-bold text-slate-900 dark:text-white">{inr(room.rentAmount)}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
