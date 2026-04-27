import express from 'express';
import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { processReceiptFile } from '../services/ocr';
import { uploadReceiptImage } from '../services/storage';
import { parseExpenseFromText, generateMessage, classifyMessage, dispatchCommand } from '../services/ai';
import {
  querySummary, queryListCategory, queryTotalPeriod, queryTopExpenses,
  queryFind, queryComparePeriod, queryDailyAverage, queryByDate, queryDelete, queryGetReceipt,
} from '../services/queries';
import { sendExpenseReport } from '../services/email';

const router = express.Router();
const prisma = new PrismaClient();

const upload = multer({ dest: 'uploads/' });

async function executeDispatch(bodyText: string, history: { role: 'user' | 'assistant'; content: string }[], userId: string): Promise<string | null> {
  const allExpenses = await prisma.expense.findMany({
    where: { userId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    select: { id: true, merchant: true, description: true, amount: true, date: true, category: true, createdAt: true },
  });
  const cmd = await dispatchCommand(bodyText, history, allExpenses);
  if (!cmd) return null;

  if (cmd === 'SUMMARY') return (await querySummary(userId)).data;
  if (cmd.startsWith('LIST_CATEGORY:')) return (await queryListCategory(userId, cmd.slice(14))).data;
  if (cmd.startsWith('TOTAL_PERIOD:')) return (await queryTotalPeriod(userId, cmd.slice(13))).data;
  if (cmd.startsWith('TOP_EXPENSES:')) return (await queryTopExpenses(userId, parseInt(cmd.slice(13)) || 5)).data;
  if (cmd.startsWith('FIND:')) return (await queryFind(userId, cmd.slice(5))).data;
  if (cmd === 'COMPARE_PERIOD') return (await queryComparePeriod(userId)).data;
  if (cmd === 'DAILY_AVERAGE') return (await queryDailyAverage(userId)).data;
  if (cmd.startsWith('BY_DATE:')) return (await queryByDate(userId, cmd.slice(8))).data;
  if (cmd.startsWith('DELETE:')) return (await queryDelete(userId, cmd.slice(7))).data;
  if (cmd.startsWith('GET_RECEIPT:')) {
    const result = await queryGetReceipt(userId, cmd.slice(12));
    if (result.mediaUrl) return `MEDIA:${result.mediaUrl}|${result.data}`;
    return result.data;
  }
  if (cmd.startsWith('SEND_REPORT:')) {
    const period = cmd.slice(12);
    const periodArg = period === 'all' ? undefined : period;
    try {
      const result = await sendExpenseReport(userId, periodArg);
      if (result.success) return `Report sent! Check your email — it includes ${result.count} expense${result.count === 1 ? '' : 's'}.`;
      return result.message || 'No expenses found for that period.';
    } catch {
      return 'Sorry, I had trouble sending the report. Try again in a moment.';
    }
  }
  return null;
}

function formatSummaryGrid(expenses: any[]): string {
  const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const cat = e.category || 'Uncategorized';
    byCategory[cat] = (byCategory[cat] || 0) + e.amount;
  }
  const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const colWidth = Math.max(...rows.map(([cat]) => cat.length), 8);
  const lines = [
    'Category'.padEnd(colWidth) + '  Amount',
    '-'.repeat(colWidth) + '  ' + '-'.repeat(8),
    ...rows.map(([cat, amt]) => cat.padEnd(colWidth) + '  $' + amt.toFixed(2)),
    '-'.repeat(colWidth) + '  ' + '-'.repeat(8),
    'Total'.padEnd(colWidth) + '  $' + grandTotal.toFixed(2),
  ];
  return lines.join('\n');
}

function summaryContext(data: any): string {
  const date = data.date ? new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today';
  const time = data.time || '';
  const amount = data.amount ? `$${parseFloat(data.amount).toFixed(2)}` : 'unknown amount';
  const vendor = data.merchant || 'unknown vendor';
  const description = data.description || '';
  return `Date: ${date}${time ? ', Time: ' + time : ''}, Amount: ${amount}, Vendor: ${vendor}${description ? ', Description: ' + description : ''}`;
}

router.post('/webhook', upload.none(), async (req, res) => {
  try {
    const { From, Body, NumMedia, MediaUrl0 } = req.body;

    console.log('📱 Message received from:', From);
    console.log('📝 Body:', Body);
    console.log('🖼️ Media count:', NumMedia);

    const phoneNumber = From.replace('whatsapp:', '');
    const reply = async (msg: string) => {
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message(msg);
      res.type('text/xml');
      return res.send(twiml.toString());
    };
    const replyMedia = (mediaUrl: string, caption: string) => {
      const twiml = new twilio.twiml.MessagingResponse();
      const msg = twiml.message(caption || '');
      msg.media(mediaUrl);
      res.type('text/xml');
      return res.send(twiml.toString());
    };

    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) {
      const msg = await generateMessage('Someone texted Billie for the first time but has no account yet. They need to sign up at the web dashboard before they can use the service.');
      return reply(msg);
    }

    const bodyText = (Body || '').trim();
    const hasImage = NumMedia && parseInt(NumMedia) > 0;

    // Get last expense for correction/vendor context
    const lastExpense = await prisma.expense.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Text-only message: try dispatch first, then classify against last expense
    if (!hasImage && bodyText) {
      const dispatchResult = await executeDispatch(bodyText, [], user.id);
      if (dispatchResult !== null) {
        if (dispatchResult.startsWith('MEDIA:')) {
          const [mediaUrl, caption] = dispatchResult.slice(6).split('|');
          return replyMedia(mediaUrl, caption);
        }
        const msg = await generateMessage(`Query result:\n${dispatchResult}\n\nUser asked: "${bodyText}". Present this data naturally.`);
        return reply(msg);
      }

      // Check if it's a correction or vendor update against last expense
      if (lastExpense) {
        const lastCtx = summaryContext({
          amount: lastExpense.amount,
          merchant: lastExpense.merchant,
          description: lastExpense.description,
          date: lastExpense.date,
        });
        const intent = await classifyMessage(bodyText, lastCtx);

        if (intent === 'correction') {
          const extracted = await parseExpenseFromText(bodyText, '');
          const amountMatch = bodyText.match(/(?:total|amount|was|is)\s+\$?(\d+\.?\d*)/i) || bodyText.match(/^\$?(\d+\.\d{2})$/);
          await prisma.expense.update({
            where: { id: lastExpense.id },
            data: {
              ...(extracted.amount && { amount: extracted.amount }),
              ...(amountMatch && { amount: parseFloat(amountMatch[1]) }),
              ...(extracted.merchant && { merchant: extracted.merchant }),
              ...(extracted.description && { description: extracted.description }),
              ...(extracted.category && { category: extracted.category }),
              ...(extracted.date && { date: new Date(extracted.date) }),
            },
          });
          const updated = await prisma.expense.findUnique({ where: { id: lastExpense.id } });
          const msg = await generateMessage(`Last expense updated. New record: ${JSON.stringify(updated)}. User said: "${bodyText}". Confirm the change briefly.`);
          return reply(msg);
        }

        // Vendor reply: short message with no numbers = likely a vendor name for last expense
        const looksLikeVendor = !bodyText.match(/\d/) && bodyText.split(' ').length <= 5 && intent !== 'inquiry';
        if (looksLikeVendor && !lastExpense.merchant) {
          const declineWords = ['no', 'nope', 'skip', 'nah', 'no thanks', "don't", 'dont', 'nevermind'];
          const isDecline = declineWords.some(w => bodyText.toLowerCase() === w || bodyText.toLowerCase() === w + '.');
          if (!isDecline) {
            await prisma.expense.update({
              where: { id: lastExpense.id },
              data: { merchant: bodyText.trim() },
            });
            const msg = await generateMessage(`User provided vendor name "${bodyText}" for their last expense ($${lastExpense.amount.toFixed(2)}). Confirm it's been saved.`);
            return reply(msg);
          }
        }
      }

      const msg = await generateMessage(`User said: "${bodyText}". Respond naturally as Billie.`);
      return reply(msg);
    }

    // Image message: process receipt
    let expenseData: any = {};
    let receiptUrl: string | undefined;
    let receiptText: string | undefined;

    if (hasImage) {
      console.log('📸 Processing receipt image. NumMedia:', NumMedia, 'URL:', MediaUrl0);
      try {
        receiptUrl = MediaUrl0;
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const imageResponse = await fetch(MediaUrl0, { headers: { Authorization: authHeader } });
        if (!imageResponse.ok) throw new Error(`Failed to fetch image: ${imageResponse.status}`);

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const tempPath = path.join('/tmp', `receipt_${Date.now()}.jpg`);
        fs.writeFileSync(tempPath, imageBuffer);

        const cloudinaryUrl = await uploadReceiptImage(tempPath);
        if (cloudinaryUrl) receiptUrl = cloudinaryUrl;

        const result = await processReceiptFile(tempPath);
        receiptText = result.text;
        fs.unlinkSync(tempPath);

        const aiParsed = await parseExpenseFromText(result.text, bodyText);
        console.log('🤖 AI parsed:', JSON.stringify(aiParsed));
        expenseData = aiParsed;
      } catch (error) {
        console.error('❌ OCR error:', error);
        const msg = await generateMessage('I received your image but had trouble reading it. Can you send the total amount?');
        return reply(msg);
      }
    }

    if (bodyText) {
      const textParsed = await parseExpenseFromText(bodyText, '');
      expenseData = { ...expenseData, ...textParsed };
    }

    if (!expenseData.amount) {
      const msg = await generateMessage(hasImage
        ? 'Receipt image received but the total amount is not readable. What was the total?'
        : `User sent: "${bodyText}" but no expense amount was found.`
      );
      return reply(msg);
    }

    const now = new Date();
    const expenseTime = expenseData.time || now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const expenseDate = expenseData.date || now.toISOString();

    const expense = await prisma.expense.create({
      data: {
        userId: user.id,
        amount: parseFloat(expenseData.amount),
        currency: expenseData.currency || 'USD',
        description: expenseData.description || bodyText || 'Expense',
        merchant: expenseData.merchant,
        category: expenseData.category,
        time: expenseTime,
        date: new Date(expenseDate),
        receiptUrl,
        receiptText,
        notes: bodyText || null,
        source: 'sms',
        sourcePhone: From,
        tags: expenseData.tags || [],
      },
    });

    console.log('💾 Expense saved:', expense.id);

    const confirmPrompt = expenseData.merchant
      ? `Expense saved. ${summaryContext({ ...expenseData, time: expenseTime, date: expenseDate })}.`
      : `Expense saved. ${summaryContext({ ...expenseData, time: expenseTime, date: expenseDate })}. No vendor found — ask the user who the vendor was in one short sentence.`;

    const msg = await generateMessage(confirmPrompt);
    return reply(msg);

  } catch (error) {
    console.error('Twilio webhook error:', error);
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Something went wrong on my end. Try again in a moment.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

export default router;
