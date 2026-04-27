import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { expenseApi, statsApi, reportsApi, Expense, Stats } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import {
  Receipt, TrendingUp, LogOut, Search, Trash2, Image, X,
  LayoutDashboard, ChevronDown, Calendar, Tag, Download, Mail, CreditCard,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const CATEGORY_COLORS = [
  '#0a0a0a', '#555', '#888', '#aaa', '#333',
  '#666', '#999', '#444', '#777', '#222',
];

function ReceiptModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full mx-4 bg-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-white p-1 hover:opacity-60 transition-opacity"
        >
          <X className="w-5 h-5 text-[#0a0a0a]" />
        </button>
        <img src={url} alt="Receipt" className="w-full object-contain max-h-[80vh]" />
      </div>
    </div>
  );
}

function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [receiptModal, setReceiptModal] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await expenseApi.getAll({ limit: 100 });
      setExpenses(data);
      const cats = Array.from(new Set(data.map((e) => e.category).filter(Boolean))) as string[];
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    setDeleting(id);
    try {
      await expenseApi.delete(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch {
      alert('Failed to delete expense.');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = expenses.filter((e) => {
    const matchSearch =
      !search ||
      e.description?.toLowerCase().includes(search.toLowerCase()) ||
      e.merchant?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || e.category === filterCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-5">
      {receiptModal && (
        <ReceiptModal url={receiptModal} onClose={() => setReceiptModal(null)} />
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={async () => { setExporting(true); try { await reportsApi.downloadCsv(); } finally { setExporting(false); } }}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 hover:bg-gray-50 text-[#0a0a0a] disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Exporting...' : 'CSV'}
          </button>
          <div className="relative">
            <button
              onClick={async () => {
                setEmailing(true);
                setEmailMsg(null);
                try {
                  const res = await reportsApi.emailReport();
                  setEmailMsg(res.message);
                } catch (err: any) {
                  setEmailMsg(err?.response?.data?.error || err?.message || 'Failed to send report.');
                } finally {
                  setEmailing(false);
                  setTimeout(() => setEmailMsg(null), 5000);
                }
              }}
              disabled={emailing}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 hover:bg-gray-50 text-[#0a0a0a] disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5" />
              {emailing ? 'Sending...' : 'Email report'}
            </button>
            {emailMsg && (
              <div className="absolute top-10 left-0 z-10 bg-[#0a0a0a] text-white text-xs px-3 py-2 whitespace-nowrap">
                {emailMsg}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 text-sm focus:outline-none focus:border-[#0a0a0a] transition-colors"
          />
        </div>
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="pl-9 pr-8 py-2.5 border border-gray-300 text-sm appearance-none focus:outline-none focus:border-[#0a0a0a] transition-colors bg-white"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading expenses...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-gray-200">
          <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-[#888] text-sm">No expenses found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-[#888] text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Date</th>
                <th className="px-5 py-3 text-left font-medium">Merchant</th>
                <th className="px-5 py-3 text-left font-medium">Category</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
                <th className="px-5 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((expense, i) => (
                <tr
                  key={expense.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i === filtered.length - 1 ? 'border-none' : ''}`}
                >
                  <td className="px-5 py-4 text-[#888] whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(expense.date)}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-[#0a0a0a]">{expense.merchant || expense.description}</div>
                    {expense.merchant && expense.description !== expense.merchant && (
                      <div className="text-xs text-[#888]">{expense.description}</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {expense.category ? (
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium border border-gray-300 text-[#555]">
                        {expense.category}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-[#0a0a0a]">
                    {formatCurrency(expense.amount, expense.currency)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {expense.receiptUrl && (
                        <button
                          onClick={() => setReceiptModal(expense.receiptUrl!)}
                          className="p-1.5 text-[#888] hover:text-[#0a0a0a] transition-colors"
                          title="View receipt"
                        >
                          <Image className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(expense.id)}
                        disabled={deleting === expense.id}
                        className="p-1.5 text-[#888] hover:text-red-600 transition-colors disabled:opacity-40"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatsOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsApi.get().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return <div className="text-center py-16 text-gray-400 text-sm">Loading stats...</div>;
  }

  const chartData = stats.byCategory.map((c, i) => ({
    name: c.category,
    total: c.total,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Spent', value: formatCurrency(stats.total) },
          { label: 'Expenses', value: stats.count.toString() },
          { label: 'Avg per Expense', value: formatCurrency(stats.average) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-gray-200 p-6">
            <div className="text-xs text-[#888] uppercase tracking-wide mb-1">{label}</div>
            <div className="text-3xl font-bold text-[#0a0a0a]">{value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-[#0a0a0a] mb-5">Spending by Category</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} barSize={36}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Total']}
              contentStyle={{ border: '1px solid #e5e7eb', boxShadow: 'none' }}
            />
            <Bar dataKey="total" radius={[0, 0, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-[#888] text-xs uppercase tracking-wide">
              <th className="px-5 py-3 text-left font-medium">Category</th>
              <th className="px-5 py-3 text-right font-medium">Expenses</th>
              <th className="px-5 py-3 text-right font-medium">Avg</th>
              <th className="px-5 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {stats.byCategory.map((cat, i) => (
              <tr key={cat.category} className="border-b border-gray-100 last:border-none hover:bg-gray-50">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2"
                      style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                    />
                    <span className="font-medium text-[#0a0a0a]">{cat.category}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right text-[#888]">{cat.count}</td>
                <td className="px-5 py-3.5 text-right text-[#888]">{formatCurrency(cat.average)}</td>
                <td className="px-5 py-3.5 text-right font-semibold text-[#0a0a0a]">{formatCurrency(cat.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PLAN_LIMITS: Record<string, number> = { free: 5, solo: 100, pro: 500, business: 500 };
const PLAN_LABELS: Record<string, string> = { free: 'Free', solo: 'Solo', pro: 'Pro', business: 'Business' };

function PlanWidget() {
  const [info, setInfo] = useState<{ plan: string; expenseCount: number; seats: number } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => {});
  }, []);

  if (!info) return null;

  const limit = PLAN_LIMITS[info.plan] ?? 5;
  const pct = Math.min(100, Math.round((info.expenseCount / limit) * 100));

  return (
    <div className="px-3 py-3 mb-2 border border-gray-200">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#0a0a0a]">{PLAN_LABELS[info.plan]}</span>
        <Link to="/pricing" className="text-xs text-[#888] hover:text-[#0a0a0a] transition-colors">
          {info.plan === 'free' ? 'Upgrade' : 'Manage'}
        </Link>
      </div>
      <div className="w-full h-1 bg-gray-100 mb-1">
        <div className="h-1 bg-[#0a0a0a] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-[#888]">{info.expenseCount} / {limit} expenses</p>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/dashboard', label: 'Expenses', icon: LayoutDashboard },
    { path: '/dashboard/stats', label: 'Statistics', icon: TrendingUp },
    { path: '/pricing', label: 'Upgrade', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-white flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10">
        <div className="p-5 border-b border-gray-200">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-60 transition-opacity">
            <span className="text-xl font-black tracking-widest uppercase text-[#0a0a0a]">Billie</span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                location.pathname === path
                  ? 'bg-gray-100 text-[#0a0a0a]'
                  : 'text-[#888] hover:bg-gray-50 hover:text-[#0a0a0a]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <PlanWidget />
          <div className="px-3 py-2 text-xs text-[#888] truncate mb-1">
            {user?.firstName ? `${user.firstName}` : user?.email}
          </div>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-[#888] hover:bg-gray-50 hover:text-[#0a0a0a] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="ml-56 flex-1 p-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="mb-7 border-b border-gray-200 pb-5">
            <h1 className="text-2xl font-black text-[#0a0a0a] tracking-tight">
              {location.pathname === '/dashboard/stats' ? 'Statistics' : 'Expenses'}
            </h1>
            <p className="text-sm text-[#888] mt-0.5">
              {location.pathname === '/dashboard/stats'
                ? 'Overview of your spending patterns'
                : 'All expenses logged via SMS'}
            </p>
          </div>
          <Routes>
            <Route path="/" element={<ExpenseList />} />
            <Route path="/stats" element={<StatsOverview />} />
            <Route path="" element={<ExpenseList />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
