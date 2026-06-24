import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Receipt, Wallet, TrendingUp, PieChart, Calendar,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Field, Input, Select, Textarea, Modal, ConfirmDialog, TableSkeleton,
  EmptyState, Badge, StatCard, Table, TableRow, Td, PageHeader, inr, fmtDate,
  Pagination, usePagination,
} from '../../components/ui';

const CATEGORIES = ['maintenance', 'utilities', 'salaries', 'supplies', 'rent', 'marketing', 'other'];

const CATEGORY_TONE = {
  maintenance: 'blue',
  utilities: 'indigo',
  salaries: 'yellow',
  supplies: 'green',
  rent: 'red',
  marketing: 'indigo',
  other: 'gray',
};

const EMPTY_FORM = { category: 'maintenance', amount: '', date: '', vendor: '', note: '' };

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthInputValue = (m, y) => `${y}-${String(m).padStart(2, '0')}`;

export default function Expenses() {
  const now = new Date();
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [category, setCategory] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month: period.month, year: period.year };
      const [listRes, summaryRes] = await Promise.all([
        api.get('/expenses', { params: { ...params, ...(category ? { category } : {}) } }),
        api.get('/expenses/summary', { params }),
      ]);
      setExpenses(listRes.data.data.expenses);
      setSummary(summaryRes.data.data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [period, category]);

  useEffect(() => { load(); }, [load]);

  const onMonthChange = (e) => {
    const v = e.target.value; // 'YYYY-MM'
    if (!v) return;
    const [y, m] = v.split('-').map(Number);
    setPeriod({ month: m, year: y });
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      category: form.category,
      amount: Number(form.amount),
      date: form.date || todayISO(),
      vendor: form.vendor.trim(),
      note: form.note.trim(),
    };
    try {
      await api.post('/expenses', payload);
      toast.success('Expense added');
      setForm(null);
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
      await api.delete(`/expenses/${confirmDelete._id}`);
      toast.success('Expense deleted');
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const net = summary?.net ?? 0;
  const topCat = summary?.topCategory;

  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(expenses, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses & P&L"
        subtitle="Track spending and monthly profit / loss"
        action={
          <Button onClick={() => setForm({ ...EMPTY_FORM, date: todayISO() })}>
            <Plus className="w-4 h-4" /> Add expense
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Wallet}
          tone="red"
          label="This month expenses"
          value={inr(summary?.expenses)}
          sub={`${expenses.length} entr${expenses.length === 1 ? 'y' : 'ies'}`}
        />
        <StatCard
          icon={TrendingUp}
          accent
          label="Net P&L"
          value={inr(net)}
          sub={net >= 0 ? 'Profit this month' : 'Loss this month'}
        />
        <StatCard
          icon={Receipt}
          tone="green"
          label="Income"
          value={inr(summary?.income)}
          sub={`${summary?.paidRentCount || 0} paid rent${(summary?.paidRentCount || 0) === 1 ? '' : 's'}`}
        />
        <StatCard
          icon={PieChart}
          tone="indigo"
          label="Top category"
          value={topCat ? inr(topCat.total) : '—'}
          sub={topCat ? topCat.category.charAt(0).toUpperCase() + topCat.category.slice(1) : 'No spend yet'}
        />
      </div>

      {/* Filters */}
      <Card>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="month"
              className="pl-9"
              value={monthInputValue(period.month, period.year)}
              onChange={onMonthChange}
            />
          </div>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </Select>
        </div>
      </Card>

      {/* List */}
      {loading ? (
        <Card><TableSkeleton cols={5} /></Card>
      ) : expenses.length === 0 ? (
        <Card>
          <EmptyState
            icon={Receipt}
            title="No expenses this month"
            message="Record your first expense to track P&L."
            action={<Button onClick={() => setForm({ ...EMPTY_FORM, date: todayISO() })}><Plus className="w-4 h-4" /> Add expense</Button>}
          />
        </Card>
      ) : (
        <Card>
          <Table headers={['Date', 'Category', 'Vendor', 'Note', 'Amount', '']}>
            {pageItems.map((x) => (
              <TableRow key={x._id}>
                <Td className="whitespace-nowrap">{fmtDate(x.date)}</Td>
                <Td><Badge tone={CATEGORY_TONE[x.category] || 'gray'}>{x.category}</Badge></Td>
                <Td className="text-slate-700">{x.vendor || <span className="text-slate-400">—</span>}</Td>
                <Td className="max-w-[16rem] truncate text-slate-500">{x.note || <span className="text-slate-400">—</span>}</Td>
                <Td className="font-semibold text-slate-900 tabular-nums whitespace-nowrap">{inr(x.amount)}</Td>
                <Td>
                  <button
                    onClick={() => setConfirmDelete(x)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Td>
              </TableRow>
            ))}
          </Table>
          {!loading && total > 0 && (
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
          )}
        </Card>
      )}

      {/* Add modal */}
      <Modal open={!!form} onClose={() => setForm(null)} title="Add expense">
        {form && (
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category" required>
                <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Amount (₹)" required>
                <Input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date" required>
                <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
              </Field>
              <Field label="Vendor" hint="Optional">
                <Input value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} placeholder="e.g. City Power Co." />
              </Field>
            </div>
            <Field label="Note" hint="Optional">
              <Textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="What was this for?" />
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" loading={busy}>Add expense</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        loading={busy}
        title="Delete expense?"
        message={`This ${inr(confirmDelete?.amount)} ${confirmDelete?.category} expense will be permanently deleted.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
