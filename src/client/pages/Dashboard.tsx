import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { expenseApi, statsApi, Expense, Stats } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import {
  Receipt, TrendingUp, LogOut, Search, Trash2, Image, X,
  LayoutDashboard, ChevronDown, Calendar, Tag,
  // TrendingUp used in navItems below
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const CATEGORY_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#84cc16',
];

function ReceiptModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full mx-4 bg-white rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-white rounded-full p-1 shadow hover:bg-gray-100"
        >
          <X className="w-5 h-5 text-gray-700" />
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
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
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No expenses found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wide">
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
                  className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i === filtered.length - 1 ? 'border-none' : ''}`}
                >
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(expense.date)}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-gray-900">{expense.merchant || expense.description}</div>
                    {expense.merchant && expense.description !== expense.merchant && (
                      <div className="text-xs text-gray-400">{expense.description}</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {expense.category ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {expense.category}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-gray-900">
                    {formatCurrency(expense.amount, expense.currency)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {expense.receiptUrl && (
                        <button
                          onClick={() => setReceiptModal(expense.receiptUrl!)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="View receipt"
                        >
                          <Image className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(expense.id)}
                        disabled={deleting === expense.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
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
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</div>
            <div className="text-3xl font-bold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-5">Spending by Category</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} barSize={36}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Total']}
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="total" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wide">
              <th className="px-5 py-3 text-left font-medium">Category</th>
              <th className="px-5 py-3 text-right font-medium">Expenses</th>
              <th className="px-5 py-3 text-right font-medium">Avg</th>
              <th className="px-5 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {stats.byCategory.map((cat, i) => (
              <tr key={cat.category} className="border-b border-gray-50 last:border-none hover:bg-gray-50">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                    />
                    <span className="font-medium text-gray-800">{cat.category}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right text-gray-500">{cat.count}</td>
                <td className="px-5 py-3.5 text-right text-gray-500">{formatCurrency(cat.average)}</td>
                <td className="px-5 py-3.5 text-right font-semibold text-gray-900">{formatCurrency(cat.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: 'Expenses', icon: LayoutDashboard },
    { path: '/stats', label: 'Statistics', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col fixed h-full z-10">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Billie</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                location.pathname === path
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="px-3 py-2 text-xs text-gray-400 truncate mb-1">
            {user?.firstName ? `${user.firstName}` : user?.email}
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="ml-56 flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900">
              {location.pathname === '/stats' ? 'Statistics' : 'Expenses'}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {location.pathname === '/stats'
                ? 'Overview of your spending patterns'
                : 'All expenses logged via WhatsApp'}
            </p>
          </div>
          <Routes>
            <Route path="/" element={<ExpenseList />} />
            <Route path="/stats" element={<StatsOverview />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
