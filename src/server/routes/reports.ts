import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendExpenseReport } from '../services/email';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/email', authenticate, async (req: AuthRequest, res) => {
  try {
    const { period } = req.body;
    const result = await sendExpenseReport(req.userId!, period);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    res.json({ success: true, message: `Report sent to your email (${result.count} expenses).` });
  } catch (error: any) {
    console.error('Email report error:', error);
    res.status(500).json({ error: error.message || 'Failed to send report' });
  }
});

router.get('/csv', authenticate, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const where: any = { userId: req.userId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }
    if (category) where.category = category;

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const headers = ['Date', 'Merchant', 'Description', 'Category', 'Amount', 'Currency', 'Notes', 'Source'];
    const rows = expenses.map(e => [
      new Date(e.date).toLocaleDateString('en-US'),
      e.merchant || '',
      e.description || '',
      e.category || '',
      e.amount.toFixed(2),
      e.currency || 'USD',
      e.notes || '',
      e.source || '',
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const filename = `billie-expenses-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error: any) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

export default router;
