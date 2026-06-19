import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  UtensilsCrossed, Plus, Pencil, Trash2, Coffee, Soup, Cookie, Moon, CalendarDays, Sparkles,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Field, Input, Select, Spinner, EmptyState, ConfirmDialog, Modal,
  PageHeader, StatCard, Stagger, StaggerItem, fmtDate,
} from '../../components/ui';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const EMPTY = { day: 'monday', date: '', breakfast: '', lunch: '', snacks: '', dinner: '' };

const MEAL_ROWS = [
  { key: 'breakfast', label: 'Breakfast', icon: Coffee, tile: 'bg-amber-50 text-amber-600' },
  { key: 'lunch',     label: 'Lunch',     icon: Soup,   tile: 'bg-emerald-50 text-emerald-600' },
  { key: 'snacks',    label: 'Snacks',    icon: Cookie, tile: 'bg-orange-50 text-orange-500' },
  { key: 'dinner',    label: 'Dinner',    icon: Moon,   tile: 'bg-indigo-50 text-indigo-500' },
];

export default function AdminFoodMenu() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | {} (new) | menu (edit)
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

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

  const openNew = () => { setForm(EMPTY); setEditing({}); };
  const openEdit = (m) => {
    setForm({
      day: m.day,
      date: m.date ? m.date.slice(0, 10) : '',
      breakfast: m.breakfast || '',
      lunch: m.lunch || '',
      snacks: m.snacks || '',
      dinner: m.dinner || '',
    });
    setEditing(m);
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.date || !form.breakfast || !form.lunch || !form.dinner) {
      return toast.error('Day, date, breakfast, lunch and dinner are required');
    }
    setBusy(true);
    try {
      if (editing._id) await api.put(`/food-menu/${editing._id}`, form);
      else await api.post('/food-menu', form);
      toast.success(editing._id ? 'Menu updated' : 'Menu added');
      setEditing(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/food-menu/${del._id}`);
      toast.success('Menu deleted');
      setDel(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  // KPI metrics computed from already-loaded data
  const daysCovered = new Set(menus.map((m) => m.day)).size;
  const withSnacks = menus.filter((m) => m.snacks && m.snacks.trim()).length;
  const fullMeals = menus.filter((m) => m.breakfast && m.lunch && m.dinner).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Food Menu"
        subtitle="Plan the weekly mess menu"
        action={<Button onClick={openNew}><Plus className="w-4 h-4" /> Add menu</Button>}
      />

      {!loading && menus.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={UtensilsCrossed} label="Menus planned" value={menus.length} tone="green" />
          <StatCard icon={CalendarDays} label="Days covered" value={`${daysCovered} / 7`} sub="of the week" tone="blue" />
          <StatCard icon={Sparkles} label="Full meal plans" value={fullMeals} sub="breakfast + lunch + dinner" tone="indigo" />
          <StatCard icon={Cookie} label="With snacks" value={withSnacks} tone="amber" />
        </div>
      )}

      {loading ? (
        <Card><Spinner /></Card>
      ) : menus.length === 0 ? (
        <Card>
          <EmptyState icon={UtensilsCrossed} title="No menu yet" message="Add the first day's menu to get started." action={<Button onClick={openNew}><Plus className="w-4 h-4" /> Add menu</Button>} />
        </Card>
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
                <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEdit(m)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 px-2.5 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
                    aria-label="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => setDel(m)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?._id ? 'Edit menu' : 'Add menu'} wide>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Day" required>
              <Select value={form.day} onChange={set('day')}>
                {DAYS.map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
              </Select>
            </Field>
            <Field label="Date" required>
              <Input type="date" value={form.date} onChange={set('date')} />
            </Field>
          </div>
          <Field label="Breakfast" required><Input value={form.breakfast} onChange={set('breakfast')} placeholder="e.g. Poha, tea" /></Field>
          <Field label="Lunch" required><Input value={form.lunch} onChange={set('lunch')} placeholder="e.g. Dal, rice, roti, sabzi" /></Field>
          <Field label="Snacks"><Input value={form.snacks} onChange={set('snacks')} placeholder="e.g. Samosa, tea" /></Field>
          <Field label="Dinner" required><Input value={form.dinner} onChange={set('dinner')} placeholder="e.g. Paneer, roti, rice" /></Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} loading={busy}>{editing?._id ? 'Save changes' : 'Add menu'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={remove}
        loading={busy}
        title="Delete menu?"
        message={`The ${del?.day} menu will be removed. This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
