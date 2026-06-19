import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Wrench, Star, Inbox, Loader2, CheckCircle2, AlertTriangle,
  MapPin, Clock, MessageSquare, ImageIcon, UserCog,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Field, Select, Textarea, Modal, Spinner, EmptyState,
  StatusBadge, StatCard, Avatar, Table, TableRow, Td, PageHeader, fmtDateTime,
} from '../../components/ui';

const CATEGORIES = ['electricity', 'water', 'cleaning', 'wifi', 'food', 'furniture', 'security', 'maintenance', 'other'];
const STATUSES = ['pending', 'assigned', 'in_progress', 'resolved', 'rejected'];

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const humanize = (s) => (s ? cap(String(s).replace(/_/g, ' ')) : '');

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', category: '', priority: '' });
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [assignStaffId, setAssignStaffId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [priority, setPriority] = useState('medium');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        api.get('/complaints', { params: filter }),
        api.get('/staff', { params: { status: 'active' } }),
      ]);
      setComplaints(c.data.data.complaints);
      setStaff(s.data.data.staff);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openDetail = (c) => {
    setDetail(c);
    setAssignStaffId(c.assignedStaffId?._id || '');
    setRemarks(c.adminRemarks || '');
    setPriority(c.priority);
  };

  const assign = async () => {
    if (!assignStaffId) return toast.error('Pick a staff member');
    setBusy(true);
    try {
      await api.put(`/complaints/${detail._id}/assign`, { staffId: assignStaffId });
      toast.success('Assigned');
      setDetail(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const saveMeta = async () => {
    setBusy(true);
    try {
      await api.put(`/complaints/${detail._id}`, { priority, adminRemarks: remarks });
      toast.success('Saved');
      setDetail(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status) => {
    setBusy(true);
    try {
      await api.put(`/complaints/${detail._id}/status`, { status });
      toast.success(`Status → ${status.replace('_', ' ')}`);
      setDetail(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  // KPI counts computed from already-loaded data
  const openCount = complaints.filter((c) => c.status === 'pending' || c.status === 'assigned').length;
  const inProgressCount = complaints.filter((c) => c.status === 'in_progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved').length;
  const criticalCount = complaints.filter((c) => c.priority === 'high' || c.priority === 'urgent').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Complaints" subtitle={`${complaints.length} total`} />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Inbox} tone="amber" label="Open" value={openCount} sub="Awaiting action" />
        <StatCard icon={Loader2} tone="blue" label="In progress" value={inProgressCount} sub="Being worked on" />
        <StatCard icon={CheckCircle2} tone="green" label="Resolved" value={resolvedCount} sub="Closed out" />
        <StatCard icon={AlertTriangle} tone="red" label="High / Urgent" value={criticalCount} sub="Needs priority" />
      </div>

      <Card>
        <div className="grid sm:grid-cols-3 gap-3">
          <Select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
          </Select>
          <Select value={filter.category} onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value }))}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{cap(c)}</option>)}
          </Select>
          <Select value={filter.priority} onChange={(e) => setFilter((f) => ({ ...f, priority: e.target.value }))}>
            <option value="">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <Spinner />
        ) : complaints.length === 0 ? (
          <EmptyState icon={Wrench} title="No complaints" message="Nothing matches the current filters." />
        ) : (
          <Table headers={['Complaint', 'Tenant', 'Category', 'Priority', 'Assigned to', 'Status', 'Raised']}>
            {complaints.map((c) => (
              <TableRow
                key={c._id}
                onClick={() => openDetail(c)}
                className="hover:bg-brand-50/40 transition-colors cursor-pointer"
              >
                <Td className="max-w-xs">
                  <p className="font-semibold text-slate-900 line-clamp-1">{c.title}</p>
                  {c.roomId && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                      <MapPin className="w-3 h-3" /> Room {c.roomId.roomNumber}
                    </span>
                  )}
                </Td>
                <Td>
                  {c.tenantId?.name ? (
                    <div className="flex items-center gap-2.5">
                      <Avatar name={c.tenantId.name} size="sm" />
                      <span className="font-medium text-slate-700 truncate">{c.tenantId.name}</span>
                    </div>
                  ) : <span className="text-slate-400">—</span>}
                </Td>
                <Td>
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    {cap(c.category)}
                  </span>
                </Td>
                <Td><StatusBadge status={c.priority} /></Td>
                <Td>
                  {c.assignedStaffId?.name ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={c.assignedStaffId.name} size="xs" />
                      <span className="text-slate-700 truncate">{c.assignedStaffId.name}</span>
                    </div>
                  ) : <span className="text-slate-400">Unassigned</span>}
                </Td>
                <Td><StatusBadge status={c.status} /></Td>
                <Td className="text-xs text-slate-400 whitespace-nowrap">{fmtDateTime(c.createdAt)}</Td>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title} wide>
        {detail && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detail.status} />
              <StatusBadge status={detail.priority} />
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {cap(detail.category)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
              {detail.tenantId?.name && (
                <span className="inline-flex items-center gap-1.5">
                  <Avatar name={detail.tenantId.name} size="xs" />
                  {detail.tenantId.name}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {detail.roomId ? `Room ${detail.roomId.roomNumber}` : 'No room'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {fmtDateTime(detail.createdAt)}
              </span>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{detail.description}</p>

            {detail.images?.length > 0 && (
              <div className="space-y-2">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <ImageIcon className="w-3.5 h-3.5" /> Attachments
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {detail.images.map((src) => (
                    <a key={src} href={src} target="_blank" rel="noreferrer" className="group block">
                      <img
                        src={src}
                        alt="complaint"
                        className="w-full aspect-square object-cover rounded-xl border border-slate-200 group-hover:opacity-90 group-hover:shadow-soft transition"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {detail.staffNotes?.length > 0 && (
              <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-4 space-y-3">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <MessageSquare className="w-3.5 h-3.5" /> Work notes
                </p>
                <div className="space-y-2.5">
                  {detail.staffNotes.map((n, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Avatar name={n.by?.name || 'Staff'} size="xs" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700">{n.by?.name || 'Staff'}</p>
                        <p className="text-sm text-slate-600">{n.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.rating && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200/60 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">Tenant rating</span>
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < detail.rating ? 'fill-sun-400 text-sun-400' : 'text-slate-300'}`}
                      />
                    ))}
                  </span>
                </div>
                {detail.tenantFeedback && (
                  <p className="text-sm text-slate-600 italic mt-1.5">&ldquo;{detail.tenantFeedback}&rdquo;</p>
                )}
              </div>
            )}

            <div className="border-t border-slate-100 pt-5">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
                <UserCog className="w-3.5 h-3.5" /> Manage
              </p>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Assign to staff">
                  <div className="flex gap-2">
                    <Select value={assignStaffId} onChange={(e) => setAssignStaffId(e.target.value)} className="flex-1">
                      <option value="">Select staff…</option>
                      {staff.map((s) => (
                        <option key={s._id} value={s._id}>{s.name} ({s.staffProfile?.staffType})</option>
                      ))}
                    </Select>
                    <Button size="md" onClick={assign} loading={busy}>Assign</Button>
                  </div>
                </Field>
                <Field label="Priority">
                  <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Select>
                </Field>
              </div>

              <div className="mt-5">
                <Field label="Admin remarks">
                  <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Visible to staff…" />
                </Field>
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5">
              <div className="flex gap-2">
                {detail.status !== 'resolved' && (
                  <Button variant="success" size="sm" onClick={() => setStatus('resolved')} loading={busy}>Mark resolved</Button>
                )}
                {detail.status !== 'rejected' && detail.status !== 'resolved' && (
                  <Button variant="danger" size="sm" onClick={() => setStatus('rejected')} loading={busy}>Reject</Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>
                <Button onClick={saveMeta} loading={busy}>Save changes</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
