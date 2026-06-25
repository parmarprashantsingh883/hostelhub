import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Wrench, Star, Zap, Droplet, Sparkles, Wifi, UtensilsCrossed,
  Sofa, ShieldCheck, MoreHorizontal, ListChecks, Loader, CheckCircle2,
  User, CalendarDays,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Field, Input, Select, Textarea, Modal, Spinner, EmptyState,
  Badge, StatusBadge, StatCard, PageHeader, Stagger, StaggerItem, fmtDateTime,
} from '../../components/ui';

const CATEGORIES = ['electricity', 'water', 'cleaning', 'wifi', 'food', 'furniture', 'security', 'maintenance', 'other'];

/* Per-category colour + icon so the grid scans at a glance. */
const CATEGORY = {
  electricity: { icon: Zap,             tile: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300' },
  water:       { icon: Droplet,         tile: 'bg-blue-50 dark:bg-sky-500/15 text-blue-600 dark:text-sky-300' },
  cleaning:    { icon: Sparkles,        tile: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' },
  wifi:        { icon: Wifi,            tile: 'bg-indigo-50 text-indigo-600' },
  food:        { icon: UtensilsCrossed, tile: 'bg-orange-50 text-orange-600' },
  furniture:   { icon: Sofa,            tile: 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300' },
  security:    { icon: ShieldCheck,     tile: 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300' },
  maintenance: { icon: Wrench,          tile: 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300' },
  other:       { icon: MoreHorizontal,  tile: 'bg-slate-100 dark:bg-white/10 text-slate-500' },
};
const catStyle = (c) => CATEGORY[c] || { icon: Wrench, tile: 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300' };
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function TenantComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedbackFor, setFeedbackFor] = useState(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');

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

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('priority', form.priority);
      for (const f of form.images || []) fd.append('images', f);
      await api.post('/complaints', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Complaint raised — the admin has been notified');
      setForm(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const sendFeedback = async () => {
    setBusy(true);
    try {
      await api.post(`/complaints/${feedbackFor._id}/feedback`, { rating, feedback });
      toast.success('Thanks for the feedback!');
      setFeedbackFor(null);
      setFeedback('');
      setRating(5);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  // KPIs computed from already-loaded data.
  const total = complaints.length;
  const open = complaints.filter((c) => c.status !== 'resolved' && c.status !== 'closed').length;
  const inProgress = complaints.filter((c) => c.status === 'in_progress').length;
  const resolved = complaints.filter((c) => c.status === 'resolved' || c.status === 'closed').length;

  const newComplaint = () =>
    setForm({ title: '', description: '', category: 'maintenance', priority: 'medium', images: [] });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Complaints"
        subtitle="Track every issue you've raised"
        action={
          <Button onClick={newComplaint}>
            <Plus className="w-4 h-4" /> Raise complaint
          </Button>
        }
      />

      {loading ? (
        <Card><Spinner /></Card>
      ) : complaints.length === 0 ? (
        <Card>
          <EmptyState
            icon={Wrench}
            title="No complaints yet"
            message="Something broken? Raise a complaint and track it here."
            action={
              <Button onClick={newComplaint}>
                <Plus className="w-4 h-4" /> Raise complaint
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={ListChecks}   label="Total raised" value={total}      tone="indigo" />
            <StatCard icon={Loader}       label="Open"         value={open}       tone="amber"  sub="Awaiting fix" />
            <StatCard icon={Wrench}       label="In progress"  value={inProgress} tone="blue" />
            <StatCard icon={CheckCircle2} label="Resolved"     value={resolved}   tone="green" />
          </div>

          <Stagger className="grid sm:grid-cols-2 gap-4">
            {complaints.map((c) => {
              const { icon: Icon, tile } = catStyle(c.category);
              return (
                <StaggerItem key={c._id} className="h-full">
                  <div className="group h-full bg-white dark:bg-surface rounded-2xl border border-slate-200/70 dark:border-white/10 shadow-card hover:shadow-soft hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${tile}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-slate-900 dark:text-white leading-snug">{c.title}</h3>
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5" /> {fmtDateTime(c.createdAt)}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mt-3 leading-relaxed">{c.description}</p>

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <Badge tone="gray">{cap(c.category)}</Badge>
                      <StatusBadge status={c.priority} />
                    </div>

                    {c.assignedStaffId && (
                      <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Assigned to <b className="text-slate-700 dark:text-slate-200">{c.assignedStaffId?.name || 'staff'}</b>
                      </p>
                    )}

                    {(c.status === 'resolved' && !c.rating) && (
                      <div className="mt-auto pt-4">
                        <Button size="sm" variant="secondary" onClick={() => setFeedbackFor(c)}>
                          <Star className="w-3.5 h-3.5" /> Rate resolution
                        </Button>
                      </div>
                    )}

                    {c.rating && (
                      <div className="mt-auto pt-4 flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-500">Your rating</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < c.rating ? 'fill-sun-400 text-sun-400' : 'text-slate-200'}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </>
      )}

      {/* Raise complaint modal */}
      <Modal open={!!form} onClose={() => setForm(null)} title="Raise a complaint">
        {form && (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Title" required>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Short summary of the issue" required maxLength={150} />
            </Field>
            <Field label="Description" required>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What's wrong? When did it start? Where exactly?" rows={4} required maxLength={2000} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category" required>
                <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                </Select>
              </Field>
              <Field label="Priority">
                <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </Field>
            </div>
            <Field label="Photos" hint="Up to 3 images — JPG/PNG/WEBP, 5 MB each">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                multiple
                onChange={(e) => setForm((f) => ({ ...f, images: Array.from(e.target.files || []).slice(0, 3) }))}
                className="block w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:h-9 file:px-4 file:rounded-lg file:border-0 file:bg-brand-50 dark:file:bg-brand-500/15 file:text-brand-700 dark:file:text-brand-300 file:text-sm file:font-medium hover:file:bg-brand-100 dark:hover:file:bg-white/10 file:cursor-pointer"
              />
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" loading={busy}>Submit complaint</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Feedback modal */}
      <Modal open={!!feedbackFor} onClose={() => setFeedbackFor(null)} title="Rate the resolution">
        <div className="space-y-4">
          <div className="flex justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Star className={`w-8 h-8 transition-colors ${n <= rating ? 'fill-sun-400 text-sun-400' : 'text-slate-200'}`} />
              </button>
            ))}
          </div>
          <Field label="Comments (optional)">
            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="How was the fix?" />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setFeedbackFor(null)}>Cancel</Button>
            <Button onClick={sendFeedback} loading={busy}>Submit feedback</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
