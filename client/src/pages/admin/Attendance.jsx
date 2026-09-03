import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  CalendarDays, Banknote, IndianRupee, UserCheck, Wallet, CheckCircle2, Users,
} from 'lucide-react';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Badge, Select, Spinner, EmptyState, PageHeader, StatCard, Avatar, inr, fmtDate,
} from '../../components/ui';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHIFTS = ['general', 'morning', 'evening', 'night', 'off'];
const STATUSES = [
  { id: 'present', label: 'Present', tone: 'bg-emerald-600 text-white', idle: 'text-emerald-600' },
  { id: 'absent', label: 'Absent', tone: 'bg-rose-600 text-white', idle: 'text-rose-600' },
  { id: 'half_day', label: 'Half', tone: 'bg-amber-500 text-white', idle: 'text-amber-600' },
  { id: 'leave', label: 'Leave', tone: 'bg-indigo-600 text-white', idle: 'text-indigo-600' },
];
const cap = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function Attendance() {
  const now = new Date();
  const [tab, setTab] = useState('attendance');
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayISO());
  const [dayMap, setDayMap] = useState({}); // staffId -> { status, shift }
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [summary, setSummary] = useState([]);
  const [payroll, setPayroll] = useState({ rows: [], totalSalary: 0, paidTotal: 0 });
  const [payingId, setPayingId] = useState(null);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/staff', { params: { limit: 200, status: 'active' } });
      setStaff((data.data.staff || []).filter((s) => s.staffProfile?.status !== 'inactive'));
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  }, []);

  const loadDay = useCallback(async (d) => {
    try {
      const { data } = await api.get('/attendance', { params: { date: d } });
      const map = {};
      (data.data.records || []).forEach((r) => { map[String(r.staffId?._id || r.staffId)] = { status: r.status, shift: r.shift }; });
      setDayMap(map);
    } catch (e) { toast.error(errMsg(e)); }
  }, []);

  const loadSummary = useCallback(async (p) => {
    try { const { data } = await api.get('/attendance/summary', { params: p }); setSummary(data.data.summary || []); }
    catch (e) { toast.error(errMsg(e)); }
  }, []);

  const loadPayroll = useCallback(async (p) => {
    try { const { data } = await api.get('/payroll', { params: p }); setPayroll(data.data); }
    catch (e) { toast.error(errMsg(e)); }
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);
  useEffect(() => { loadDay(date); }, [date, loadDay]);
  useEffect(() => { loadSummary(period); loadPayroll(period); }, [period, loadSummary, loadPayroll]);

  const mark = async (staffId, patch) => {
    const cur = dayMap[staffId] || { status: 'present', shift: 'general' };
    const next = { ...cur, ...patch };
    setDayMap((m) => ({ ...m, [staffId]: next })); // optimistic
    try {
      await api.post('/attendance', { staffId, date, ...next });
      loadSummary(period);
    } catch (e) { toast.error(errMsg(e)); loadDay(date); }
  };

  const pay = async (row) => {
    setPayingId(row.staff._id);
    try {
      await api.post('/payroll/run', { staffId: row.staff._id, month: period.month, year: period.year });
      toast.success(`${inr(row.staff.salary)} paid to ${row.staff.name} · logged to P&L`);
      loadPayroll(period);
    } catch (e) { toast.error(errMsg(e)); } finally { setPayingId(null); }
  };

  const markedToday = Object.keys(dayMap).length;
  const presentToday = Object.values(dayMap).filter((r) => r.status === 'present').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance & Payroll" subtitle="Daily roster, attendance and monthly salaries" />

      <div className="flex gap-2">
        {[{ id: 'attendance', label: 'Attendance', icon: UserCheck }, { id: 'payroll', label: 'Payroll', icon: Banknote }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 h-9 text-sm font-medium transition-colors ${tab === t.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : staff.length === 0 ? (
        <Card><EmptyState icon={Users} title="No staff yet" message="Add staff members first to track attendance and payroll." /></Card>
      ) : tab === 'attendance' ? (
        <>
          <Card>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><CalendarDays className="h-4 w-4" /></span>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Roster date</label>
                  <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} className="h-9 rounded-lg border border-slate-300 dark:border-white/15 dark:bg-surface2 dark:text-white px-3 text-sm focus:outline-none focus:border-brand-500" />
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold text-slate-800 dark:text-slate-100">{presentToday}</span>/{staff.length} present · {markedToday} marked</p>
            </div>

            <div className="mt-4 space-y-2.5">
              {staff.map((s) => {
                const rec = dayMap[s._id] || { status: 'present', shift: 'general' };
                return (
                  <div key={s._id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 p-3">
                    <Avatar name={s.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{s.name}</p>
                      <p className="text-xs text-slate-400">{cap(s.staffProfile?.staffType || 'staff')}</p>
                    </div>
                    <div className="flex gap-1">
                      {STATUSES.map((st) => (
                        <button key={st.id} onClick={() => mark(s._id, { status: st.id })} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${rec.status === st.id ? st.tone : `bg-slate-100 dark:bg-white/10 ${st.idle} hover:bg-slate-200 dark:hover:bg-white/15`}`}>
                          {st.label}
                        </button>
                      ))}
                    </div>
                    <select value={rec.shift} onChange={(e) => mark(s._id, { shift: e.target.value })} className="h-8 rounded-lg border border-slate-300 dark:border-white/15 dark:bg-surface2 dark:text-white px-2 text-xs focus:outline-none focus:border-brand-500" title="Shift">
                      {SHIFTS.map((sh) => <option key={sh} value={sh}>{cap(sh)}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title={`Month summary — ${MONTHS[period.month - 1]} ${period.year}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-2 py-2">Staff</th><th className="px-2 py-2 text-center">Present</th><th className="px-2 py-2 text-center">Absent</th><th className="px-2 py-2 text-center">Half</th><th className="px-2 py-2 text-center">Leave</th>
                </tr></thead>
                <tbody>
                  {summary.map((r) => (
                    <tr key={r.staff._id} className="border-t border-slate-100 dark:border-white/5">
                      <td className="px-2 py-2.5"><span className="font-medium text-slate-800 dark:text-slate-100">{r.staff.name}</span> <span className="text-xs text-slate-400">· {cap(r.staff.staffType)}</span></td>
                      <td className="px-2 py-2.5 text-center font-semibold text-emerald-600">{r.present}</td>
                      <td className="px-2 py-2.5 text-center font-semibold text-rose-500">{r.absent || '—'}</td>
                      <td className="px-2 py-2.5 text-center text-amber-600">{r.half_day || '—'}</td>
                      <td className="px-2 py-2.5 text-center text-indigo-500">{r.leave || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        // ── Payroll tab ──
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={Wallet} accent label="Monthly payroll" value={inr(payroll.totalSalary)} sub={`${MONTHS[period.month - 1]} ${period.year}`} />
            <StatCard icon={CheckCircle2} tone="green" label="Paid" value={inr(payroll.paidTotal)} sub={`${payroll.rows.filter((r) => r.payroll).length}/${payroll.rows.length} staff`} />
            <StatCard icon={IndianRupee} tone="amber" label="Outstanding" value={inr(Math.max(0, payroll.totalSalary - payroll.paidTotal))} sub="Yet to pay" />
          </div>

          <Card>
            <div className="mb-3 flex flex-wrap gap-3">
              <Select value={period.month} onChange={(e) => setPeriod((p) => ({ ...p, month: Number(e.target.value) }))} className="sm:max-w-[10rem]">
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </Select>
              <Select value={period.year} onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))} className="sm:max-w-[8rem]">
                {[now.getFullYear() - 1, now.getFullYear()].map((y) => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-2 py-2">Staff</th><th className="px-2 py-2">Role</th><th className="px-2 py-2 text-center">Days present</th><th className="px-2 py-2 text-right">Salary</th><th className="px-2 py-2 text-right">Status</th>
                </tr></thead>
                <tbody>
                  {payroll.rows.map((r) => (
                    <tr key={r.staff._id} className="border-t border-slate-100 dark:border-white/5">
                      <td className="px-2 py-3"><div className="flex items-center gap-2.5"><Avatar name={r.staff.name} size="sm" /><span className="font-medium text-slate-800 dark:text-slate-100">{r.staff.name}</span></div></td>
                      <td className="px-2 py-3 text-slate-500">{cap(r.staff.staffType)}</td>
                      <td className="px-2 py-3 text-center tabular-nums text-slate-600 dark:text-slate-300">{r.presentDays}</td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-900 dark:text-white tabular-nums">{inr(r.staff.salary)}</td>
                      <td className="px-2 py-3 text-right">
                        {r.payroll ? (
                          <Badge tone="green">Paid {fmtDate(r.payroll.paidAt)}</Badge>
                        ) : (
                          <Button size="sm" loading={payingId === r.staff._id} disabled={!r.staff.salary} onClick={() => pay(r)}><Banknote className="w-3.5 h-3.5" /> Pay</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">Paying logs a salary expense to your P&L for the month. Each staff can be paid once per month.</p>
          </Card>
        </>
      )}
    </div>
  );
}
