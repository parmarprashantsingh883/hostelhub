import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Wrench, Droplets, Zap, Sparkles, ShieldAlert, Wifi, Bug, DoorOpen,
  ClipboardList, Loader2, CheckCircle2, User, MapPin, Clock, ArrowRight,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Field, Textarea, Modal, Spinner, EmptyState,
  StatusBadge, StatCard, PageHeader, Stagger, StaggerItem, fmtDateTime,
} from '../../components/ui';

/* Per-category icon + tile colour so each task scans at a glance. */
const CATEGORY = {
  plumbing:     { icon: Droplets,   tile: 'bg-blue-50 text-blue-600' },
  electrical:   { icon: Zap,        tile: 'bg-amber-50 text-amber-600' },
  cleaning:     { icon: Sparkles,   tile: 'bg-emerald-50 text-emerald-600' },
  security:     { icon: ShieldAlert,tile: 'bg-red-50 text-red-600' },
  internet:     { icon: Wifi,       tile: 'bg-indigo-50 text-indigo-500' },
  pest:         { icon: Bug,        tile: 'bg-lime-50 text-lime-600' },
  furniture:    { icon: DoorOpen,   tile: 'bg-orange-50 text-orange-500' },
};
const catStyle = (c) => CATEGORY[c] || { icon: Wrench, tile: 'bg-slate-100 text-slate-600' };

/* Priority drives the left accent strip. */
const PRIORITY = {
  urgent: 'bg-red-500',
  high:   'bg-orange-400',
  medium: 'bg-sun-400',
  low:    'bg-brand-400',
};
const priorityStrip = (p) => PRIORITY[p] || 'bg-slate-300';

const titleCase = (s) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

export default function StaffComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/complaints');
      setComplaints(data.data.complaints);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (status) => {
    setBusy(true);
    try {
      await api.put(`/complaints/${detail._id}/status`, { status, note: note || undefined });
      toast.success(`Updated to ${status.replace('_', ' ')}`);
      setDetail(null);
      setNote('');
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  // KPI counts computed from already-loaded data.
  const assignedCount = complaints.filter((c) => c.status === 'assigned').length;
  const inProgressCount = complaints.filter((c) => c.status === 'in_progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved').length;

  return (
    <div className="space-y-6">
      <PageHeader title="My Tasks" subtitle="Complaints assigned to you" />

      {loading ? (
        <Spinner />
      ) : complaints.length === 0 ? (
        <Card>
          <EmptyState icon={Wrench} title="No tasks assigned" message="When the admin assigns a complaint to you, it appears here." />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={ClipboardList} label="Assigned" value={assignedCount} tone="blue" sub="Awaiting start" />
            <StatCard icon={Loader2} label="In progress" value={inProgressCount} tone="amber" sub="Being worked on" />
            <StatCard icon={CheckCircle2} label="Resolved" value={resolvedCount} tone="green" sub="Completed by you" />
          </div>

          <Stagger className="grid sm:grid-cols-2 gap-4">
            {complaints.map((c) => {
              const { icon: Icon, tile } = catStyle(c.category);
              const canUpdate = ['assigned', 'in_progress'].includes(c.status);
              return (
                <StaggerItem key={c._id} className="h-full">
                  <div className="group relative h-full bg-white rounded-2xl border border-slate-200/70 shadow-card hover:shadow-soft hover:-translate-y-0.5 transition-all duration-200 flex overflow-hidden">
                    <span className={`w-1.5 shrink-0 ${priorityStrip(c.priority)}`} aria-hidden />
                    <div className="flex-1 min-w-0 p-5 flex flex-col">
                      <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${tile}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-slate-900 leading-snug truncate">{c.title}</h3>
                            <StatusBadge status={c.status} />
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                              {titleCase(c.category)}
                            </span>
                            <StatusBadge status={c.priority} />
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-slate-500 line-clamp-2 mt-3 leading-relaxed">{c.description}</p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" /> {c.tenantId?.name || '—'}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" /> {c.roomId ? `Room ${c.roomId.roomNumber}` : '—'}
                        </span>
                      </div>

                      {canUpdate && (
                        <div className="mt-auto pt-4">
                          <Button size="sm" onClick={() => setDetail(c)}>
                            Update status <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title}>
        {detail && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">{detail.description}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> {detail.tenantId?.name} {detail.tenantId?.phone ? `(${detail.tenantId.phone})` : ''}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> {detail.roomId ? `Room ${detail.roomId.roomNumber}` : '—'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> {fmtDateTime(detail.createdAt)}
              </span>
            </div>
            {detail.adminRemarks && (
              <div className="rounded-xl bg-sun-50 border border-sun-200 p-3 text-sm text-amber-800">
                <b>Admin:</b> {detail.adminRemarks}
              </div>
            )}
            <Field label="Work note" hint="Visible to the admin and tenant">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you do / find?" />
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              {detail.status === 'assigned' && (
                <Button onClick={() => setStatus('in_progress')} loading={busy}>Start work</Button>
              )}
              <Button variant="success" onClick={() => setStatus('resolved')} loading={busy}>Mark resolved</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
