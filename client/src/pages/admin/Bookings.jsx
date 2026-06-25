import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CalendarPlus, CheckCircle2, LogIn, Ban, Trash2, Phone, DoorOpen, ArrowRight, Wallet,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Badge, Spinner, EmptyState, ConfirmDialog, PageHeader, inr, fmtDate,
} from '../../components/ui';

const COLS = [
  { id: 'reserved', label: 'Reserved', tone: 'yellow', hint: 'Bed held' },
  { id: 'confirmed', label: 'Confirmed', tone: 'blue', hint: 'Token paid' },
  { id: 'moved_in', label: 'Moved in', tone: 'green', hint: 'Bed filled' },
  { id: 'cancelled', label: 'Cancelled', tone: 'gray', hint: 'Released' },
];

function BookingCard({ b, onAdvance, onMoveIn, onDelete }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-card dark:border-white/10 dark:bg-surface2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900 dark:text-white">{b.name}</p>
          <p className="flex items-center gap-1 text-xs text-slate-400"><Phone className="h-3 w-3" />{b.phone}</p>
        </div>
        {b.roomId && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
            <DoorOpen className="h-3 w-3" /> {b.roomId.roomNumber}
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-1 text-xs text-slate-500 dark:text-slate-400">
        <p>Move-in: <span className="font-medium text-slate-700 dark:text-slate-200">{fmtDate(b.moveInDate)}</span></p>
        <p className="flex items-center gap-1"><Wallet className="h-3 w-3" /> {inr(b.rentAmount)}/mo
          {b.tokenAmount > 0 && <> · token {inr(b.tokenAmount)}</>}
        </p>
        {b.note && <p className="line-clamp-2 italic text-slate-400">“{b.note}”</p>}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {b.status === 'reserved' && (
          <>
            <Button size="sm" variant="secondary" onClick={() => onAdvance(b, 'confirmed')}><CheckCircle2 className="h-3.5 w-3.5" /> Confirm</Button>
            <Button size="sm" onClick={() => onMoveIn(b)}><LogIn className="h-3.5 w-3.5" /> Move in</Button>
            <Button size="sm" variant="ghost" onClick={() => onAdvance(b, 'cancelled')}><Ban className="h-3.5 w-3.5" /></Button>
          </>
        )}
        {b.status === 'confirmed' && (
          <>
            <Button size="sm" onClick={() => onMoveIn(b)}><LogIn className="h-3.5 w-3.5" /> Move in</Button>
            <Button size="sm" variant="ghost" onClick={() => onAdvance(b, 'cancelled')}><Ban className="h-3.5 w-3.5" /></Button>
          </>
        )}
        {b.status === 'moved_in' && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> {b.tenantId?.name ? `${b.tenantId.name} · resident` : 'Resident provisioned'}
          </span>
        )}
        {b.status === 'cancelled' && (
          <Button size="sm" variant="ghost" onClick={() => onDelete(b)}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
        )}
      </div>
    </div>
  );
}

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [moveIn, setMoveIn] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/bookings');
      setBookings(data.data.bookings);
      setCounts(data.data.counts || {});
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const advance = async (b, status) => {
    try {
      await api.put(`/bookings/${b._id}/status`, { status });
      toast.success(status === 'cancelled' ? 'Booking cancelled' : 'Moved to confirmed');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const doMoveIn = async () => {
    setBusy(true);
    try {
      await api.put(`/bookings/${moveIn._id}/status`, { status: 'moved_in' });
      toast.success(`${moveIn.name} moved in — bed filled & resident created 🎉`);
      setMoveIn(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/bookings/${del._id}`);
      toast.success('Booking deleted');
      setDel(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const byStatus = (s) => bookings.filter((b) => b.status === s);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        subtitle="Track reservations from token to move-in"
        action={<Button onClick={() => navigate('/admin/occupancy')}><CalendarPlus className="h-4 w-4" /> Reserve a bed</Button>}
      />

      {loading ? (
        <Spinner />
      ) : bookings.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarPlus}
            title="No bookings yet"
            message="Reserve a bed from the Occupancy board to start the move-in pipeline."
            action={<Button onClick={() => navigate('/admin/occupancy')}>Go to Occupancy <ArrowRight className="h-4 w-4" /></Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLS.map((col) => {
            const items = byStatus(col.id);
            return (
              <div key={col.id} className="flex flex-col rounded-2xl bg-slate-50/70 p-3 dark:bg-white/5">
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Badge tone={col.tone}>{col.label}</Badge>
                    <span className="text-xs text-slate-400">{col.hint}</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-300">{counts[col.id] ?? items.length}</span>
                </div>
                <div className="space-y-2.5">
                  {items.length === 0 ? (
                    <p className="px-1 py-6 text-center text-xs text-slate-400">Nothing here</p>
                  ) : (
                    items.map((b) => (
                      <BookingCard key={b._id} b={b} onAdvance={advance} onMoveIn={setMoveIn} onDelete={setDel} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!moveIn}
        onClose={() => setMoveIn(null)}
        onConfirm={doMoveIn}
        loading={busy}
        title="Move in resident?"
        message={moveIn ? `This fills a bed in Room ${moveIn.roomId?.roomNumber} and creates a resident account for ${moveIn.name}. They can be invited to set a password.` : ''}
        confirmLabel="Move in"
      />
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={doDelete}
        loading={busy}
        title="Delete booking?"
        message={del ? `${del.name}'s cancelled booking will be permanently removed.` : ''}
        confirmLabel="Delete"
      />
    </div>
  );
}
