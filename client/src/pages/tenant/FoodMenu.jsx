import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  UtensilsCrossed, Star, MessageSquarePlus, Coffee, Soup, Cookie, Moon,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Field, Select, Textarea, Modal, Spinner, EmptyState, PageHeader,
  Stagger, StaggerItem, fmtDate,
} from '../../components/ui';

const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'];

const MEAL_ROWS = [
  { key: 'breakfast', label: 'Breakfast', icon: Coffee, tile: 'bg-amber-50 text-amber-600' },
  { key: 'lunch',     label: 'Lunch',     icon: Soup,   tile: 'bg-emerald-50 text-emerald-600' },
  { key: 'snacks',    label: 'Snacks',    icon: Cookie, tile: 'bg-orange-50 text-orange-500' },
  { key: 'dinner',    label: 'Dinner',    icon: Moon,   tile: 'bg-indigo-50 text-indigo-500' },
];

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star`} className="transition-transform hover:scale-110 active:scale-95">
          <Star className={`w-7 h-7 transition-colors ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-300'}`} />
        </button>
      ))}
    </div>
  );
}

export default function TenantFoodMenu() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fb, setFb] = useState(null); // menu being rated
  const [form, setForm] = useState({ meal: 'lunch', rating: 0, comment: '', suggestion: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/food-menu');
      setMenus(data.data.menus);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openFeedback = (m) => {
    setForm({ meal: 'lunch', rating: 0, comment: '', suggestion: '' });
    setFb(m);
  };

  const submit = async () => {
    if (!form.rating) return toast.error('Please pick a rating');
    setBusy(true);
    try {
      await api.post(`/food-menu/${fb._id}/feedback`, form);
      toast.success('Thanks for your feedback!');
      setFb(null);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Food Menu" subtitle="This week's mess menu — rate your meals" />

      {loading ? (
        <Spinner />
      ) : menus.length === 0 ? (
        <Card><EmptyState icon={UtensilsCrossed} title="No menu published" message="The mess menu will appear here once the admin adds it." /></Card>
      ) : (
        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {menus.map((m) => (
            <StaggerItem key={m._id} className="h-full">
              <div className="group h-full bg-white rounded-2xl border border-slate-200/70 shadow-card hover:shadow-soft hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-5">
                  <div>
                    <p className="font-semibold text-slate-900 capitalize text-[15px]">{m.day}</p>
                    <p className="text-xs text-slate-400">{fmtDate(m.date)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
                    <UtensilsCrossed className="w-5 h-5" />
                  </div>
                </div>
                <div className="px-5 py-4 space-y-2.5 flex-1">
                  {MEAL_ROWS.map(({ key, label, icon: Icon, tile }) => (
                    <div key={key} className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tile}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                        <p className="text-sm text-slate-700">{m[key] || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => openFeedback(m)}
                  className="border-t border-slate-100 px-5 py-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 transition-colors"
                >
                  <MessageSquarePlus className="w-4 h-4" /> Rate this menu
                </button>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <Modal open={!!fb} onClose={() => setFb(null)} title={`Rate ${fb?.day || ''} menu`}>
        <div className="space-y-4">
          <Field label="Which meal?" required>
            <Select value={form.meal} onChange={(e) => setForm((f) => ({ ...f, meal: e.target.value }))}>
              {MEALS.map((m) => <option key={m} value={m} className="capitalize">{m}</option>)}
            </Select>
          </Field>
          <Field label="Your rating" required>
            <StarPicker value={form.rating} onChange={(rating) => setForm((f) => ({ ...f, rating }))} />
          </Field>
          <Field label="Comment">
            <Textarea value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} placeholder="How was it?" />
          </Field>
          <Field label="Suggestion">
            <Textarea value={form.suggestion} onChange={(e) => setForm((f) => ({ ...f, suggestion: e.target.value }))} placeholder="Anything you'd like to see on the menu?" />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setFb(null)}>Cancel</Button>
            <Button onClick={submit} loading={busy}>Submit feedback</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
