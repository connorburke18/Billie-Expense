import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import expenseRoutes from './routes/expenses';
import twilioRoutes from './routes/twilio';
import categoryRoutes from './routes/categories';
import statsRoutes from './routes/stats';
import reportsRoutes from './routes/reports';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/twilio', twilioRoutes);
app.use('/api/reports', reportsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, '../dist/client')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/client', 'index.html'));
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Twilio webhook: http://localhost:${PORT}/api/twilio/webhook`);
  try {
    const deleted = await (prisma as any).pendingExpense.deleteMany({});
    if (deleted.count > 0) console.log(`🧹 Cleared ${deleted.count} stale pending expense(s)`);
  } catch {}
});
