import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Phone, Mail, Trash2, UserCheck, Search, ChevronRight,
  Inbox, PhoneCall, CalendarCheck, BadgeIndianRupee, CheckCircle2, XCircle,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Field, Input, Select, Textarea, Modal, ConfirmDialog, Spinner,
  EmptyState, Badge, StatCard, PageHeader, inr,
} from '../../components/ui';

const STAGES = [
  { key: 'new', label: 'New', icon: Inbox },
  { key: 'contacted', label: 'Contacted', icon: PhoneCall },
  { key: 'visit_scheduled', label: 'Visit scheduled', icon: CalendarCheck },
  { key: 'token_paid', label: 'Token paid', icon: BadgeIndianRupee },
  { key: 'converted', label: 'Converted', icon: CheckCircle2 },
  { key: 'lost', label: 'Lost', icon: XCircle },
];

const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));

const SOURCE_TONE = {
  website: 'blue', walk_in: 'indigo', referral: 'green', social: 'yellow', other: 'gray',
};
const SOURCE_LABEL = {
  website: 'Website', walk_in: 'Walk-in', referral: 'Referral', social: 'Social', other: 'Other',
};

const EMPTY_FORM = { name: '', phone: '', email: '', source: 'walk_in', budget: '', note: '' };

/** A single lead card inside a Kanban column. */
function LeadCard({ lead, onMove, onConvert, onDelete }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-3.5 shadow-card transition-shadow hover:shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{lead.name}</p>
          <a href={`tel:${lead.phone}`} className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600">
            <Phone className="h-3 w-3" /> {lead.phone}
          </a>
        </div>
        <Badge tone={SOURCE_TONE[lead.source] || 'gray'}>{SOURCE_LABEL[lead.source] || lead.source}</Badge>
      </div>

      {lead.email && (
        <a href={`mailto:${lead.email}`} className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-slate-400 hover:text-brand-600">
          <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{lead.email}</span>
        </a>
      )}

      {lead.budget > 0 && (
        <p className="mt-2 text-xs font-semibold text-slate-700 tabular-nums">Budget {inr(lead.budget)}</p>
      )}
      {lead.note && <p className="mt-1.5 line-clamp-2 text-xs text-slate-500">{lead.note}</p>}

      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
        <Select
          className="h-8 flex-1 text-xs"
          value={lead.stage}
          onChange={(e) => onMove(lead, e.target.value)}
          title="Move to stage"
        >
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </Select>
        {lead.stage !== 'converted' && (
          <button
            onClick={() => onConvert(lead)}
            title="Convert lead"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
          >
            <UserCheck className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => onDelete(lead)}
          title="Delete lead"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [convertFor, setConvertFor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/leads', { params: search ? { search } : {} });
      setLeads(data.data.leads);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/leads', {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        source: form.source,
        budget: form.budget === '' ? undefined : Number(form.budget),
        note: form.note || undefined,
      });
      toast.success('Lead added');
      setForm(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const move = async (lead, stage) => {
    if (stage === lead.stage) return;
    // Optimistic update so the card jumps columns instantly.
    setLeads((prev) => prev.map((l) => (l._id === lead._id ? { ...l, stage } : l)));
    try {
      await api.patch(`/leads/${lead._id}/stage`, { stage });
      toast.success(`Moved to ${STAGE_LABEL[stage]}`);
    } catch (err) {
      toast.error(errMsg(err));
      load();
    }
  };

  const doConvert = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/leads/${convertFor._id}/convert`);
      const pf = data.data.prefill;
      toast.success(`${pf.name} marked converted — add them as a resident`);
      setConvertFor(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/leads/${confirmDelete._id}`);
      toast.success('Lead deleted');
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const byStage = (key) => leads.filter((l) => l.stage === key);

  // KPIs
  const total = leads.length;
  const open = leads.filter((l) => !['converted', 'lost'].includes(l.stage)).length;
  const converted = byStage('converted').length;
  const convRate = total ? Math.round((converted / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        subtitle={`${total} enquir${total === 1 ? 'y' : 'ies'} in your pipeline`}
        action={
          <Button onClick={() => setForm({ ...EMPTY_FORM })}>
            <Plus className="h-4 w-4" /> Add lead
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Inbox} tone="indigo" label="Total leads" value={total} sub="All enquiries" />
        <StatCard icon={PhoneCall} tone="blue" label="Open" value={open} sub="In progress" />
        <StatCard icon={CheckCircle2} tone="green" label="Converted" value={converted} sub="Became residents" />
        <StatCard icon={BadgeIndianRupee} tone="amber" label="Conversion" value={`${convRate}%`} sub="Of all leads" />
      </div>

      {/* Search */}
      <Card>
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search name, phone or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {/* Board */}
      {loading ? (
        <Card><Spinner /></Card>
      ) : total === 0 ? (
        <Card>
          <EmptyState
            icon={Inbox}
            title="No leads yet"
            message="Add an enquiry by hand, or share your public booking page to start collecting them."
            action={<Button onClick={() => setForm({ ...EMPTY_FORM })}><Plus className="h-4 w-4" /> Add lead</Button>}
          />
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin">
          {STAGES.map((s) => {
            const items = byStage(s.key);
            const Icon = s.icon;
            return (
              <div key={s.key} className="flex w-72 shrink-0 flex-col rounded-2xl border border-slate-200/70 bg-slate-50/60">
                <div className="flex items-center justify-between border-b border-slate-200/70 px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-brand-600" />
                    <h3 className="text-sm font-semibold text-slate-800">{s.label}</h3>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 tabular-nums">
                    {items.length}
                  </span>
                </div>
                <div className="flex-1 space-y-3 p-3">
                  {items.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">No leads here</p>
                  ) : (
                    items.map((lead) => (
                      <LeadCard
                        key={lead._id}
                        lead={lead}
                        onMove={move}
                        onConvert={setConvertFor}
                        onDelete={setConfirmDelete}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add lead modal */}
      <Modal open={!!form} onClose={() => setForm(null)} title="Add lead">
        {form && (
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" required>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </Field>
              <Field label="Phone" required>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
              </Field>
            </div>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Source">
                <Select value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}>
                  <option value="walk_in">Walk-in</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="social">Social</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Budget (₹)">
                <Input type="number" min={0} value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} />
              </Field>
            </div>
            <Field label="Note">
              <Textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Requirements, follow-up details…" />
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" loading={busy}>Add lead</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Convert dialog */}
      <Modal open={!!convertFor} onClose={() => setConvertFor(null)} title="Convert lead">
        {convertFor && (
          <div>
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="pt-2 text-sm text-slate-600">
                Mark <span className="font-semibold text-slate-900">{convertFor.name}</span> as converted? You can then add them
                as a resident using these details:
              </p>
            </div>
            <dl className="mt-4 space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between"><dt className="text-slate-400">Name</dt><dd className="font-medium text-slate-800">{convertFor.name}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Phone</dt><dd className="font-medium text-slate-800">{convertFor.phone}</dd></div>
              {convertFor.email && <div className="flex justify-between"><dt className="text-slate-400">Email</dt><dd className="font-medium text-slate-800">{convertFor.email}</dd></div>}
              {convertFor.budget > 0 && <div className="flex justify-between"><dt className="text-slate-400">Budget</dt><dd className="font-medium text-slate-800">{inr(convertFor.budget)}</dd></div>}
            </dl>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConvertFor(null)}>Cancel</Button>
              <Button variant="success" onClick={doConvert} loading={busy}>
                Convert <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        loading={busy}
        title="Delete lead?"
        message={`${confirmDelete?.name}'s enquiry will be permanently removed.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
