import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where: any = { userId: req.userId };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const expenses = await prisma.expense.findMany({ where });

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const count = expenses.length;
    const average = count > 0 ? total / count : 0;

    const byCategory = expenses.reduce((acc, exp) => {
      const cat = exp.category || 'Uncategorized';
      if (!acc[cat]) {
        acc[cat] = { total: 0, count: 0 };
      }
      acc[cat].total += exp.amount;
      acc[cat].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const categoryStats = Object.entries(byCategory).map(([name, data]) => ({
      category: name,
      total: data.total,
      count: data.count,
      average: data.total / data.count,
    }));

    res.json({
      total,
      count,
      average,
      byCategory: categoryStats,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
