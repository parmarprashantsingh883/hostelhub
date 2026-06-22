import { useEffect, useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  FileBarChart, Download, IndianRupee, Clock, BedDouble, MessageSquareWarning, ListChecks,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, errMsg } from '../../api/client';
import {
  Button, Card, Field, Input, Spinner, EmptyState, Table, TableRow, Td, PageHeader,
  StatCard, StatusBadge, inr, fmtDate,
} from '../../components/ui';
import { CHART, BrandTooltip, axisTick, gridProps } from '../../components/ui/charts';

const REPORTS = [
  { slug: 'revenue', label: 'Revenue' },
  { slug: 'pending-rent', label: 'Pending Rent' },
  { slug: 'occupancy', label: 'Occupancy' },
  { slug: 'complaints', label: 'Complaints' },
  { slug: 'staff-tasks', label: 'Staff Tasks' },
];

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const MONEY_KEYS = new Set(['rentamount', 'latefee', 'discount', 'totalpaid', 'revenue', 'amount', 'pending', 'collected', 'securitydeposit', 'totalrevenue', 'totaldue', 'balance']);
const DATE_KEYS = new Set(['paidat', 'date', 'createdat', 'updatedat', 'duedate', 'joiningdate', 'resolvedat', 'completedat']);
const STATUS_KEYS = new Set(['status', 'paymentstatus', 'priority']);

const humanize = (k) => k.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, (c) => c.toUpperCase()).trim();

const humanizeValue = (v) =>
  String(v).replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const toNum = (v) => Number(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0;

// Find the first present key (case-insensitive) from a candidate list.
const pick = (row, candidates) => {
  if (!row) return null;
  const keys = Object.keys(row);
  for (const c of candidates) {
    const k = keys.find((x) => x.toLowerCase() === c);
    if (k) return k;
  }
  return null;
};

function formatCell(key, value) {
  if (value == null || value === '') return '—';
  const lk = key.toLowerCase();
  if (MONEY_KEYS.has(lk)) return <span className="font-semibold text-slate-800 tabular-nums">{inr(toNum(value))}</span>;
  if (DATE_KEYS.has(lk)) return fmtDate(value);
  if (STATUS_KEYS.has(lk) && typeof value === 'string') return <StatusBadge status={value} />;
  if (lk === 'month') {
    const n = Number(value);
    if (n >= 1 && n <= 12) return MONTHS[n];
  }
  if (typeof value === 'string' && /^[a-z]+(_[a-z]+)+$/i.test(value)) return humanizeValue(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function Reports() {
  const [active, setActive] = useState('revenue');
  const [range, setRange] = useState({ from: '', to: '' });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;
      const { data } = await api.get(`/reports/${active}`, { params });
      setRows(data.data.rows || []);
    } catch (e) {
      toast.error(errMsg(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [active, range]);

  useEffect(() => { load(); }, [load]);

  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const params = { format: 'csv' };
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;
      const res = await api.get(`/reports/${active}`, { params, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${active}-report.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setDownloading(false);
    }
  };

  const headers = rows.length ? Object.keys(rows[0]) : [];

  // Summary KPIs computed from the already-loaded rows, tailored to the active report.
  const kpis = useMemo(() => {
    if (!rows.length) return [];
    const count = rows.length;
    const sample = rows[0];

    if (active === 'revenue') {
      const k = pick(sample, ['revenue', 'totalpaid', 'amount', 'totalrevenue', 'collected']);
      const total = k ? rows.reduce((s, r) => s + toNum(r[k]), 0) : 0;
      return [
        { icon: IndianRupee, label: 'Total revenue', value: inr(total), sub: `${count} record${count === 1 ? '' : 's'}`, tone: 'green' },
        { icon: FileBarChart, label: 'Avg / record', value: inr(Math.round(total / count)), sub: 'across period', tone: 'blue' },
      ];
    }
    if (active === 'pending-rent') {
      const k = pick(sample, ['pending', 'balance', 'amount', 'rentamount', 'totaldue']);
      const total = k ? rows.reduce((s, r) => s + toNum(r[k]), 0) : 0;
      return [
        { icon: Clock, label: 'Total pending', value: inr(total), sub: `${count} tenant${count === 1 ? '' : 's'}`, tone: 'red' },
        { icon: IndianRupee, label: 'Avg pending', value: inr(Math.round(total / count)), sub: 'per tenant', tone: 'amber' },
      ];
    }
    if (active === 'occupancy') {
      const occK = pick(sample, ['currentoccupancy', 'occupied', 'occupancy']);
      const capK = pick(sample, ['capacity', 'totalbeds', 'beds']);
      const occupied = occK ? rows.reduce((s, r) => s + toNum(r[occK]), 0) : 0;
      const capacity = capK ? rows.reduce((s, r) => s + toNum(r[capK]), 0) : 0;
      const pct = capacity ? Math.round((occupied / capacity) * 100) : 0;
      return [
        { icon: BedDouble, label: 'Occupancy', value: `${pct}%`, sub: capacity ? `${occupied}/${capacity} beds` : `${count} rooms`, tone: 'green' },
        { icon: FileBarChart, label: 'Rooms', value: count, sub: capacity ? `${capacity - occupied} beds free` : 'in report', tone: 'blue' },
      ];
    }
    if (active === 'complaints') {
      const sK = pick(sample, ['status']);
      const open = sK ? rows.filter((r) => !/(resolved|closed|done)/i.test(String(r[sK]))).length : 0;
      return [
        { icon: MessageSquareWarning, label: 'Total complaints', value: count, sub: 'in period', tone: 'amber' },
        { icon: Clock, label: 'Open', value: open, sub: `${count - open} resolved`, tone: 'red' },
      ];
    }
    if (active === 'staff-tasks') {
      const sK = pick(sample, ['status']);
      const done = sK ? rows.filter((r) => /(completed|done|resolved)/i.test(String(r[sK]))).length : 0;
      const rate = count ? Math.round((done / count) * 100) : 0;
      return [
        { icon: ListChecks, label: 'Total tasks', value: count, sub: 'assigned', tone: 'blue' },
        { icon: ListChecks, label: 'Completed', value: `${rate}%`, sub: `${done}/${count} done`, tone: 'green' },
      ];
    }
    return [];
  }, [rows, active]);

  // Optional emerald bar chart for revenue — uses month name or first label-ish key.
  const chartData = useMemo(() => {
    if (active !== 'revenue' || rows.length < 2) return null;
    const sample = rows[0];
    const valK = pick(sample, ['revenue', 'totalpaid', 'amount', 'totalrevenue', 'collected']);
    if (!valK) return null;
    const labelK = pick(sample, ['month', 'date', 'period', 'label', 'name']);
    return rows.slice(0, 18).map((r, i) => {
      let label = labelK ? r[labelK] : `#${i + 1}`;
      if (labelK === 'month') {
        const n = Number(label);
        if (n >= 1 && n <= 12) label = MONTHS[n].slice(0, 3);
      } else if (labelK === 'date') {
        label = fmtDate(label);
      }
      return { label: String(label), value: toNum(r[valK]) };
    });
  }, [rows, active]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Operational and financial summaries"
        action={<Button variant="secondary" onClick={downloadCsv} loading={downloading} disabled={!rows.length}><Download className="w-4 h-4" /> Export CSV</Button>}
      />

      <Card>
        <div className="flex flex-wrap gap-2 mb-5">
          {REPORTS.map((r) => (
            <button
              key={r.slug}
              onClick={() => setActive(r.slug)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                active === r.slug
                  ? 'bg-brand-600 text-white shadow-[0_4px_12px_-4px_rgba(225,29,72,0.6)]'
                  : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-3 max-w-md">
          <Field label="From"><Input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /></Field>
          <Field label="To"><Input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></Field>
        </div>
      </Card>

      {!loading && kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <StatCard key={k.label} icon={k.icon} label={k.label} value={k.value} sub={k.sub} tone={k.tone} />
          ))}
        </div>
      )}

      {!loading && chartData && (
        <Card title="Revenue trend">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={70} tickFormatter={(v) => inr(v)} />
                <Tooltip cursor={{ fill: 'rgba(225,29,72,0.06)' }} content={<BrandTooltip money />} />
                <Bar dataKey="value" name="Revenue" fill={CHART.primary} radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card>
        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState icon={FileBarChart} title="No data" message="No rows for this report and date range." />
        ) : (
          <Table headers={headers.map(humanize)}>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {headers.map((h) => <Td key={h}>{formatCell(h, row[h])}</Td>)}
              </TableRow>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
