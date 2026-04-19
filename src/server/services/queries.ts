import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface QueryResult {
  data: string;
  raw?: any;
}

function fmt(n: number) {
  return `$${n.toFixed(2)}`;
}

function startOf(period: string): Date {
  const now = new Date();
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (period === 'last_month') {
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }
  if (period === 'year') {
    return new Date(now.getFullYear(), 0, 1);
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function endOf(period: string): Date {
  const now = new Date();
  if (period === 'last_month') {
    return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  }
  return now;
}

export async function querySummary(userId: string): Promise<QueryResult> {
  const expenses = await prisma.expense.findMany({ where: { userId }, orderBy: { date: 'desc' } });
  const byCategory: Record<string, { total: number; count: number }> = {};
  for (const e of expenses) {
    const cat = e.category || 'Uncategorized';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
    byCategory[cat].total += e.amount;
    byCategory[cat].count += 1;
  }
  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const rows = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total);
  const colW = Math.max(...rows.map(([c]) => c.length), 8);
  const lines = [
    'Category'.padEnd(colW) + '  Amount    Count',
    '-'.repeat(colW) + '  ' + '-'.repeat(9) + '  ' + '-'.repeat(5),
    ...rows.map(([cat, s]) => cat.padEnd(colW) + '  ' + fmt(s.total).padEnd(9) + '  ' + String(s.count)),
    '-'.repeat(colW) + '  ' + '-'.repeat(9) + '  ' + '-'.repeat(5),
    'Total'.padEnd(colW) + '  ' + fmt(grandTotal).padEnd(9) + '  ' + String(expenses.length),
  ];
  return { data: '```\n' + lines.join('\n') + '\n```', raw: { grandTotal, count: expenses.length } };
}

export async function queryListCategory(userId: string, category: string): Promise<QueryResult> {
  const all = await prisma.expense.findMany({ where: { userId }, orderBy: { date: 'desc' } });
  const matched = all.filter(e => (e.category || 'Uncategorized').toLowerCase() === category.toLowerCase());
  if (matched.length === 0) return { data: `No expenses found in category "${category}".` };
  const total = matched.reduce((s, e) => s + e.amount, 0);
  const colW = Math.max(...matched.map(e => (e.merchant || e.description || 'Unknown').length), 10);
  const lines = [
    'Merchant'.padEnd(colW) + '  Amount    Date',
    '-'.repeat(colW) + '  ' + '-'.repeat(9) + '  ' + '-'.repeat(10),
    ...matched.map(e => (e.merchant || e.description || 'Unknown').padEnd(colW) + '  ' + fmt(e.amount).padEnd(9) + '  ' + new Date(e.date).toLocaleDateString()),
    '-'.repeat(colW) + '  ' + '-'.repeat(9),
    'Total'.padEnd(colW) + '  ' + fmt(total),
  ];
  return { data: '```\n' + lines.join('\n') + '\n```', raw: { category, total, count: matched.length } };
}

export async function queryTotalPeriod(userId: string, period: string): Promise<QueryResult> {
  const start = startOf(period);
  const end = endOf(period);
  const expenses = await prisma.expense.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { date: 'desc' },
  });
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const label = period === 'last_month' ? 'Last month' : period.charAt(0).toUpperCase() + period.slice(1);
  if (expenses.length === 0) return { data: `No expenses found for ${label.toLowerCase()}.` };
  const lines = [
    `${label}: ${fmt(total)} across ${expenses.length} expense${expenses.length > 1 ? 's' : ''}`,
    '',
    ...expenses.map(e => `  ${(e.merchant || e.description || 'Unknown').padEnd(30)}  ${fmt(e.amount)}`),
  ];
  return { data: '```\n' + lines.join('\n') + '\n```', raw: { period, total, count: expenses.length } };
}

export async function queryTopExpenses(userId: string, n: number): Promise<QueryResult> {
  const expenses = await prisma.expense.findMany({
    where: { userId },
    orderBy: { amount: 'desc' },
    take: n,
  });
  if (expenses.length === 0) return { data: 'No expenses found.' };
  const colW = Math.max(...expenses.map(e => (e.merchant || e.description || 'Unknown').length), 10);
  const lines = [
    `Top ${expenses.length} expenses`,
    '-'.repeat(colW + 22),
    ...expenses.map((e, i) => `${String(i + 1).padStart(2)}. ${(e.merchant || e.description || 'Unknown').padEnd(colW)}  ${fmt(e.amount)}  ${new Date(e.date).toLocaleDateString()}`),
  ];
  return { data: '```\n' + lines.join('\n') + '\n```' };
}

export async function queryFind(userId: string, keyword: string): Promise<QueryResult> {
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      OR: [
        { merchant: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { notes: { contains: keyword, mode: 'insensitive' } },
      ],
    },
    orderBy: { date: 'desc' },
  });
  if (expenses.length === 0) return { data: `No expenses found matching "${keyword}".` };
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const lines = [
    `Found ${expenses.length} expense${expenses.length > 1 ? 's' : ''} matching "${keyword}" — total ${fmt(total)}`,
    '',
    ...expenses.map(e => `  ${new Date(e.date).toLocaleDateString()}  ${(e.merchant || 'No vendor').padEnd(25)}  ${fmt(e.amount)}  ${e.category || 'Uncategorized'}`),
  ];
  return { data: '```\n' + lines.join('\n') + '\n```', raw: { keyword, total, count: expenses.length, ids: expenses.map(e => e.id) } };
}

export async function queryComparePeriod(userId: string): Promise<QueryResult> {
  const thisStart = startOf('month');
  const lastStart = startOf('last_month');
  const lastEnd = endOf('last_month');

  const [thisMonth, lastMonth] = await Promise.all([
    prisma.expense.findMany({ where: { userId, date: { gte: thisStart } } }),
    prisma.expense.findMany({ where: { userId, date: { gte: lastStart, lte: lastEnd } } }),
  ]);

  const thisTotal = thisMonth.reduce((s, e) => s + e.amount, 0);
  const lastTotal = lastMonth.reduce((s, e) => s + e.amount, 0);
  const diff = thisTotal - lastTotal;
  const pct = lastTotal > 0 ? ((diff / lastTotal) * 100).toFixed(1) : 'N/A';
  const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';

  const lines = [
    'Period comparison',
    '-'.repeat(30),
    `This month:   ${fmt(thisTotal).padEnd(10)} (${thisMonth.length} expenses)`,
    `Last month:   ${fmt(lastTotal).padEnd(10)} (${lastMonth.length} expenses)`,
    '-'.repeat(30),
    `Change:       ${diff >= 0 ? '+' : ''}${fmt(diff)} (${direction}${pct !== 'N/A' ? ' ' + pct + '%' : ''})`,
  ];
  return { data: '```\n' + lines.join('\n') + '\n```', raw: { thisTotal, lastTotal, diff, direction, pct } };
}

export async function queryDailyAverage(userId: string): Promise<QueryResult> {
  const expenses = await prisma.expense.findMany({ where: { userId }, orderBy: { date: 'asc' } });
  if (expenses.length === 0) return { data: 'No expenses to calculate average from.' };
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const firstDate = new Date(expenses[0].date);
  const days = Math.max(1, Math.ceil((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
  const avg = total / days;
  return {
    data: `Daily average: ${fmt(avg)}\nBased on ${fmt(total)} across ${days} days (${expenses.length} expenses since ${firstDate.toLocaleDateString()})`,
    raw: { avg, total, days, count: expenses.length },
  };
}

export async function queryByDate(userId: string, dateStr: string): Promise<QueryResult> {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { data: `Couldn't parse date "${dateStr}".` };
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
  const expenses = await prisma.expense.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { time: 'asc' },
  });
  if (expenses.length === 0) return { data: `No expenses on ${date.toLocaleDateString()}.` };
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const lines = [
    `${date.toLocaleDateString()} — ${fmt(total)} total`,
    '',
    ...expenses.map(e => `  ${e.time || '--:--'}  ${(e.merchant || e.description || 'Unknown').padEnd(25)}  ${fmt(e.amount)}`),
  ];
  return { data: '```\n' + lines.join('\n') + '\n```' };
}

export async function queryDelete(userId: string, expenseId: string): Promise<QueryResult> {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense || expense.userId !== userId) return { data: `Expense not found.` };
  await prisma.expense.delete({ where: { id: expenseId } });
  return { data: `Deleted: ${expense.merchant || expense.description} ${fmt(expense.amount)} on ${new Date(expense.date).toLocaleDateString()}` };
}
