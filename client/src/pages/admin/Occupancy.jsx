import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  BedDouble, Layers, DoorClosed, TrendingDown, CalendarClock, UserPlus, Percent, Wrench,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Badge, Modal, Field, Input, Select, Spinner, EmptyState,
  PageHeader, StatCard, inr, fmtDate,
} from '../../components/ui';

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

const TYPE_TONE = { single: 'blue', double: 'indigo', triple: 'yellow', dormitory: 'green' };

/** A row of bed pills: filled (occupant initials) · reserved (held) · vacant. */
function BedPills({ room }) {
  const pills = [];
  for (let i = 0; i < room.occupiedBeds; i++) pills.push({ k: 'occ', name: room.occupants[i]?.name });
  for (let i = 0; i < room.reservedBeds; i++) pills.push({ k: 'res', name: room.reserved[i]?.name });
  for (let i = 0; i < room.vacantBeds; i++) pills.push({ k: 'vac' });
  return (
    <div className="flex flex-wrap gap-1.5">
      {pills.map((p, i) => {
        if (p.k === 'occ') {
          return (
            <span key={i} title={p.name} className="grid h-7 w-7 place-items-center rounded-md bg-brand-600 text-[10px] font-bold text-white">
              {initials(p.name)}
            </span>
          );
        }
        if (p.k === 'res') {
          return (
            <span key={i} title={`Reserved · ${p.name || ''}`} className="grid h-7 w-7 place-items-center rounded-md border border-dashed border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
              <CalendarClock className="h-3.5 w-3.5" />
            </span>
          );
        }
        return <span key={i} title="Vacant" className="h-7 w-7 rounded-md border-2 border-dashed border-slate-200 dark:border-white/15" />;
      })}
    </div>
  );
}

function RoomCard({ room }) {
  const maint = room.status === 'maintenance';
  return (
    <div className={`rounded-2xl border p-4 transition-colors ${
      maint
        ? 'border-slate-200 bg-slate-50/60 dark:border-white/10 dark:bg-white/5'
        : 'border-slate-200 bg-white hover:border-brand-200 dark:border-white/10 dark:bg-surface dark:hover:border-white/20'
    }`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-slate-900 dark:text-white">Room {room.roomNumber}</p>
          <Badge tone={TYPE_TONE[room.roomType] || 'gray'}>{room.roomType}</Badge>
        </div>
        <p className="text-right text-xs text-slate-400">
          <span className="block font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{inr(room.rentAmount)}</span>
          per bed
        </p>
      </div>

      <div className="mt-3">
        {maint ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Wrench className="h-3.5 w-3.5" /> Under maintenance
          </span>
        ) : (
          <BedPills room={room} />
        )}
      </div>

      {!maint && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-200">{room.occupiedBeds}/{room.capacity}</span> filled
          {room.reservedBeds > 0 && <> · <span className="text-amber-600">{room.reservedBeds} reserved</span></>}
          {room.vacantBeds > 0 && <> · <span className="text-emerald-600">{room.vacantBeds} vacant</span></>}
        </p>
      )}
    </div>
  );
}

const EMPTY = { name: '', phone: '', email: '', roomId: '', moveInDate: '', securityDeposit: '', tokenAmount: '', note: '' };

export default function Occupancy() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/occupancy');
      setData(res.data.data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const reserve = async () => {
    if (!form.name || !form.phone || !form.roomId || !form.moveInDate) {
      return toast.error('Name, phone, room and move-in date are required');
    }
    setBusy(true);
    try {
      await api.post('/bookings', {
        name: form.name, phone: form.phone, email: form.email,
        roomId: form.roomId, moveInDate: form.moveInDate,
        securityDeposit: Number(form.securityDeposit) || 0,
        tokenAmount: Number(form.tokenAmount) || 0,
        note: form.note,
      });
      toast.success('Bed reserved');
      setForm(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const k = data?.kpis;
  const vacancies = data?.vacancies || [];
  const openReserve = (roomId = '') => {
    const room = vacancies.find((v) => v._id === roomId);
    setForm({ ...EMPTY, roomId, securityDeposit: room ? String(room.rentAmount) : '' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Occupancy"
        subtitle="Live bed map across your property"
        action={<Button onClick={() => openReserve()} disabled={!vacancies.length}><UserPlus className="h-4 w-4" /> Reserve a bed</Button>}
      />

      {loading ? (
        <Spinner />
      ) : !data ? (
        <Card><EmptyState icon={BedDouble} title="No occupancy data" message="Add rooms to see the occupancy board." /></Card>
      ) : (
        <>
          {/* KPI strip — the money story */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Percent} accent label="Occupancy" value={`${k.occupancyPct}%`} sub={`${k.occupiedBeds}/${k.totalBeds} beds filled`} />
            <StatCard icon={DoorClosed} tone="green" label="Vacant beds" value={k.vacantBeds} sub={`${k.reservedBeds} reserved`} />
            <StatCard icon={TrendingDown} tone={k.leakage > 0 ? 'red' : 'green'} label="Revenue leakage" value={inr(k.leakage)} sub="Lost to empty beds / mo" />
            <StatCard icon={CalendarClock} tone="amber" label="Moving out soon" value={k.upcomingMoveOuts} sub="Beds freeing up" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Floor map */}
            <div className="space-y-6 lg:col-span-2">
              {data.floors.map((fl) => (
                <Card key={fl.floor}>
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                      <Layers className="h-4 w-4" />
                    </span>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Floor {fl.floor}</h3>
                    <span className="text-xs text-slate-400">{fl.rooms.length} room{fl.rooms.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {fl.rooms.map((room) => <RoomCard key={room._id} room={room} />)}
                  </div>
                </Card>
              ))}
            </div>

            {/* Side rail */}
            <div className="space-y-6">
              <Card title="Vacancies">
                {vacancies.length === 0 ? (
                  <p className="text-sm text-slate-400">Fully booked — no vacant beds.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {vacancies.map((v) => (
                      <li key={v._id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-white/5">
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Room {v.roomNumber}</p>
                          <p className="text-xs text-slate-400">{v.roomType} · {inr(v.rentAmount)}/bed</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">{v.vacantBeds} free</span>
                          <Button size="sm" variant="secondary" onClick={() => openReserve(v._id)}>Reserve</Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Moving out soon">
                {data.upcomingMoveOuts.length === 0 ? (
                  <p className="text-sm text-slate-400">No scheduled move-outs.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {data.upcomingMoveOuts.map((m) => (
                      <li key={m.tenantId} className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{m.name}</p>
                          <p className="text-xs text-slate-400">Room {m.room || '—'}</p>
                        </div>
                        <span className="text-xs font-medium text-amber-600">{fmtDate(m.moveOutDate)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Reserve a bed */}
      <Modal open={!!form} onClose={() => setForm(null)} title="Reserve a bed">
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Resident name" required><Input value={form.name} onChange={set('name')} placeholder="e.g. Ananya Roy" /></Field>
              <Field label="Phone" required><Input value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" /></Field>
            </div>
            <Field label="Email" hint="Optional — used for the move-in invite"><Input value={form.email} onChange={set('email')} placeholder="resident@example.com" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Room" required>
                <Select value={form.roomId} onChange={set('roomId')}>
                  <option value="">Select a room</option>
                  {vacancies.map((v) => <option key={v._id} value={v._id}>Room {v.roomNumber} · {v.roomType} ({v.vacantBeds} free)</option>)}
                </Select>
              </Field>
              <Field label="Move-in date" required><Input type="date" value={form.moveInDate} onChange={set('moveInDate')} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Security deposit (₹)"><Input type="number" min={0} value={form.securityDeposit} onChange={set('securityDeposit')} /></Field>
              <Field label="Token paid (₹)" hint="Optional"><Input type="number" min={0} value={form.tokenAmount} onChange={set('tokenAmount')} /></Field>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button onClick={reserve} loading={busy}><UserPlus className="h-4 w-4" /> Reserve bed</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
