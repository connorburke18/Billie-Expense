import { Resend } from 'resend';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';

const resend = new Resend(process.env.RESEND_API_KEY);
const prisma = new PrismaClient();

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildSummaryHtml(expenses: any[], user: any, period?: string) {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const cat = e.category || 'Uncategorized';
    byCategory[cat] = (byCategory[cat] || 0) + e.amount;
  }
  const categoryRows = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#374151;">${cat}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#374151;text-align:right;">${formatCurrency(amt)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280;text-align:right;">${((amt / total) * 100).toFixed(1)}%</td>
      </tr>
    `).join('');

  const expenseRows = expenses.slice(0, 20).map(e => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:13px;">${formatDate(e.date)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#374151;font-size:13px;">${e.merchant || e.description || 'Unknown'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:13px;">${e.category || 'Uncategorized'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#374151;font-size:13px;text-align:right;">${formatCurrency(e.amount)}</td>
    </tr>
  `).join('');

  const name = user.firstName ? user.firstName : user.email;
  const periodLabel = period || 'All Time';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <tr><td style="background:#4f46e5;border-radius:12px 12px 0 0;padding:28px 32px;">
          <table width="100%"><tr>
            <td>
              <div style="display:inline-flex;align-items:center;gap:8px;">
                <span style="font-size:20px;font-weight:700;color:#fff;">Billie</span>
              </div>
              <div style="color:#c7d2fe;font-size:13px;margin-top:4px;">Expense Summary · ${periodLabel}</div>
            </td>
          </tr></table>
        </td></tr>

        <tr><td style="background:#fff;padding:32px;">
          <p style="margin:0 0 4px;font-size:18px;font-weight:600;color:#111827;">Hi ${name},</p>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Here's your expense summary for ${periodLabel}.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td style="background:#f5f3ff;border-radius:10px;padding:20px;text-align:center;">
                <div style="font-size:28px;font-weight:700;color:#4f46e5;">${formatCurrency(total)}</div>
                <div style="font-size:13px;color:#6b7280;margin-top:4px;">Total Spent · ${expenses.length} expenses</div>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#111827;">By Category</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Category</th>
                <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Amount</th>
                <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Share</th>
              </tr>
            </thead>
            <tbody>${categoryRows}</tbody>
          </table>

          <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#111827;">Recent Expenses ${expenses.length > 20 ? '(most recent 20)' : ''}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Date</th>
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Merchant</th>
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Category</th>
                <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Amount</th>
              </tr>
            </thead>
            <tbody>${expenseRows}</tbody>
          </table>
        </td></tr>

        <tr><td style="background:#f9fafb;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            Billie · <a href="https://www.billietracker.com" style="color:#4f46e5;text-decoration:none;">billietracker.com</a> ·
            <a href="https://www.billietracker.com/privacy" style="color:#4f46e5;text-decoration:none;">Privacy Policy</a>
          </p>
          <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">Reply STOP to opt out of email reports.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function buildExcelBuffer(expenses: any[], periodLabel: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Billie';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Expenses');

  sheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Merchant', key: 'merchant', width: 24 },
    { header: 'Description', key: 'description', width: 32 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Amount', key: 'amount', width: 12 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Notes', key: 'notes', width: 28 },
    { header: 'Source', key: 'source', width: 10 },
    { header: 'Receipt URL', key: 'receiptUrl', width: 50 },
    { header: 'Logged At', key: 'createdAt', width: 18 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 20;

  for (const e of expenses) {
    const row = sheet.addRow({
      date: new Date(e.date).toLocaleDateString('en-US'),
      merchant: e.merchant || '',
      description: e.description || '',
      category: e.category || 'Uncategorized',
      amount: e.amount,
      currency: e.currency || 'USD',
      notes: e.notes || '',
      source: e.source || '',
      receiptUrl: e.receiptUrl || '',
      createdAt: new Date(e.createdAt).toLocaleString('en-US'),
    });
    if (e.receiptUrl) {
      const cell = row.getCell('receiptUrl');
      const isCloudinary = e.receiptUrl.includes('cloudinary.com') || e.receiptUrl.includes('res.cloudinary');
      if (isCloudinary) {
        cell.value = { text: 'View Receipt', hyperlink: e.receiptUrl };
        cell.font = { color: { argb: 'FF4F46E5' }, underline: true };
      } else {
        cell.value = '';
      }
    }
  }

  sheet.getColumn('amount').numFmt = '"$"#,##0.00';

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalRow = sheet.addRow({ date: 'TOTAL', amount: total });
  totalRow.font = { bold: true };
  totalRow.getCell('amount').numFmt = '"$"#,##0.00';
  totalRow.getCell('date').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
  totalRow.getCell('amount').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };

  sheet.autoFilter = { from: 'A1', to: 'J1' };

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Category', key: 'category', width: 22 },
    { header: 'Total', key: 'total', width: 14 },
    { header: 'Count', key: 'count', width: 10 },
  ];
  const sumHeader = summarySheet.getRow(1);
  sumHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sumHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

  const byCategory: Record<string, { total: number; count: number }> = {};
  for (const e of expenses) {
    const cat = e.category || 'Uncategorized';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
    byCategory[cat].total += e.amount;
    byCategory[cat].count += 1;
  }
  Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total).forEach(([cat, val]) => {
    summarySheet.addRow({ category: cat, total: val.total, count: val.count });
  });
  summarySheet.getColumn('total').numFmt = '"$"#,##0.00';

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function sendExpenseReport(userId: string, period?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  let whereClause: any = { userId };

  if (period === 'this_month') {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    whereClause.date = { gte: start };
  } else if (period === 'last_month') {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    whereClause.date = { gte: start, lte: end };
  } else if (period === 'this_year') {
    const start = new Date(new Date().getFullYear(), 0, 1);
    whereClause.date = { gte: start };
  }

  const expenses = await prisma.expense.findMany({
    where: whereClause,
    orderBy: { date: 'desc' },
  });

  if (expenses.length === 0) {
    return { success: false, message: 'No expenses found for this period.' };
  }

  const periodLabels: Record<string, string> = {
    this_month: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    last_month: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    this_year: new Date().getFullYear().toString(),
  };
  const periodLabel = period ? (periodLabels[period] || 'All Time') : 'All Time';

  const html = buildSummaryHtml(expenses, user, periodLabel);
  const excelBuffer = await buildExcelBuffer(expenses, periodLabel);
  const filename = `billie-expenses-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.xlsx`;

  const { data, error } = await resend.emails.send({
    from: 'Billie <hello@billietracker.com>',
    to: user.email,
    subject: `Your Billie Expense Report · ${periodLabel}`,
    html,
    attachments: [
      {
        filename,
        content: excelBuffer,
      },
    ],
  });

  if (error) throw new Error(error.message);
  return { success: true, emailId: data?.id, count: expenses.length };
}
