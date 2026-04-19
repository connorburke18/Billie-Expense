import express from 'express';
import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { processReceiptFile } from '../services/ocr';
import { parseExpenseFromText, generateMessage, classifyMessage } from '../services/ai';

const router = express.Router();
const prisma = new PrismaClient();

const upload = multer({ dest: 'uploads/' });

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

    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) {
      const msg = await generateMessage('Someone texted Billie for the first time but has no account yet. They need to sign up at the web dashboard before they can use the service.');
      return reply(msg);
    }

    const bodyText = (Body || '').trim();
    const hasNewImage = NumMedia && parseInt(NumMedia) > 0;

    let pending = await (prisma as any).pendingExpense.findUnique({ where: { phoneNumber } });

    if (pending) {
      const ageMs = Date.now() - new Date(pending.updatedAt).getTime();
      if (ageMs > 60 * 60 * 1000 || hasNewImage) {
        await (prisma as any).pendingExpense.delete({ where: { phoneNumber } });
        pending = null;
      }
    }

    if (pending) {
      const data = pending.data as any;

      if (data.awaitingAmount) {
        const amountMatch = bodyText.match(/\$?(\d+\.?\d*)/);
        if (amountMatch) {
          const updatedData = { ...data, amount: parseFloat(amountMatch[1]), awaitingAmount: false };
          const aiParsed = await parseExpenseFromText(data.receiptText || '', bodyText);
          const merged = { ...aiParsed, ...updatedData };

          const now = new Date();
          const expense = await prisma.expense.create({
            data: {
              userId: user.id,
              amount: merged.amount,
              currency: merged.currency || 'USD',
              description: merged.description || 'Expense',
              merchant: merged.merchant,
              category: merged.category,
              time: merged.time || now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
              date: merged.date ? new Date(merged.date) : now,
              receiptUrl: merged.receiptUrl,
              receiptText: merged.receiptText,
              source: 'sms',
              sourcePhone: From,
              tags: merged.tags || [],
            },
          });
          await (prisma as any).pendingExpense.update({
            where: { phoneNumber },
            data: { data: { ...merged, expenseId: expense.id } },
          });
          const msg = await generateMessage(`Expense logged from a receipt image. ${summaryContext({ ...merged })}.`);
          return reply(msg);
        }
        const msg = await generateMessage('Still no amount found in their reply. Need just the total dollar amount to log this receipt.');
        return reply(msg);
      }

      const intent = await classifyMessage(bodyText, summaryContext(data));

      if (intent === 'new_expense') {
        await (prisma as any).pendingExpense.delete({ where: { phoneNumber } });
      } else if (intent === 'correction') {
        const corrections: any = { ...data };

        const extracted = await parseExpenseFromText(bodyText, '');
        if (extracted.amount) corrections.amount = extracted.amount;
        if (extracted.merchant) corrections.merchant = extracted.merchant;
        if (extracted.description) corrections.description = extracted.description;
        if (extracted.category) corrections.category = extracted.category;
        if (extracted.date) corrections.date = extracted.date;

        const amountMatch = bodyText.match(/(?:total|amount|was|is)\s+\$?(\d+\.?\d*)/i) || bodyText.match(/^\$?(\d+\.\d{2})$/);
        if (amountMatch) corrections.amount = parseFloat(amountMatch[1]);

        if (data.expenseId) {
          await prisma.expense.update({
            where: { id: data.expenseId },
            data: {
              ...(corrections.amount && { amount: parseFloat(corrections.amount) }),
              ...(corrections.merchant && { merchant: corrections.merchant }),
              ...(corrections.description && { description: corrections.description }),
              ...(corrections.category && { category: corrections.category }),
              ...(corrections.time && { time: corrections.time }),
              ...(corrections.date && { date: new Date(corrections.date) }),
            },
          });
        }

        await (prisma as any).pendingExpense.update({
          where: { phoneNumber },
          data: { data: corrections },
        });

        const updated = data.expenseId ? await prisma.expense.findUnique({ where: { id: data.expenseId } }) : null;
        const msg = await generateMessage(
          `Expense updated. Current record: ${JSON.stringify(updated)}. User's correction was: "${bodyText}".`
        );
        return reply(msg);
      } else if (intent === 'inquiry') {
        const fullContext = JSON.stringify(data);
        const msg = await generateMessage(
          `User asked: "${bodyText}". Their last expense: ${fullContext}.`
        );
        return reply(msg);
      } else {
        const summaryKeywords = ['summary', 'list', 'show', 'expenses', 'how much', 'total', 'spent', 'history'];
        const wantsSummary = summaryKeywords.some(k => bodyText.toLowerCase().includes(k));

        if (wantsSummary) {
          const recent = await prisma.expense.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 10,
          });
          const total = recent.reduce((sum, e) => sum + e.amount, 0);
          const expenseList = recent.map(e => `${e.merchant || e.description}: $${e.amount.toFixed(2)}`).join(', ');
          const msg = await generateMessage(
            `User wants a summary. Last ${recent.length} expenses: ${expenseList}. Total spent: $${total.toFixed(2)}.`
          );
          return reply(msg);
        }

        const msg = await generateMessage(`User said: "${bodyText}".`);
        return reply(msg);
      }
    }

    if (!hasNewImage && bodyText) {
      const summaryKeywords = ['summary', 'list', 'show', 'expenses', 'how much', 'total', 'spent', 'history', 'what have i'];
      const wantsSummary = summaryKeywords.some(k => bodyText.toLowerCase().includes(k));
      if (wantsSummary) {
        const recent = await prisma.expense.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });
        if (recent.length === 0) {
          return reply(await generateMessage('User asked for a summary but has no expenses logged yet.'));
        }
        const total = recent.reduce((sum, e) => sum + e.amount, 0);
        const expenseList = recent.map(e => `${e.merchant || e.description}: $${e.amount.toFixed(2)}`).join(', ');
        const msg = await generateMessage(
          `User wants a summary. Last ${recent.length} expenses: ${expenseList}. Total spent: $${total.toFixed(2)}.`
        );
        return reply(msg);
      }
    }

    let expenseData: any = {};
    let receiptUrl: string | undefined;
    let receiptText: string | undefined;

    if (NumMedia && parseInt(NumMedia) > 0) {
      console.log('📸 Processing receipt image. NumMedia:', NumMedia, 'URL:', MediaUrl0);
      try {
        const imageUrl = MediaUrl0;
        receiptUrl = imageUrl;

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        console.log('🔑 Twilio creds present:', !!accountSid, !!authToken);

        const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const imageResponse = await fetch(imageUrl, { headers: { Authorization: authHeader } });
        console.log('🌐 Image fetch status:', imageResponse.status);
        if (!imageResponse.ok) throw new Error(`Failed to fetch image: ${imageResponse.status}`);

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        console.log('📦 Image buffer size:', imageBuffer.length);
        const tempPath = path.join('/tmp', `receipt_${Date.now()}.jpg`);
        fs.writeFileSync(tempPath, imageBuffer);

        const result = await processReceiptFile(tempPath);
        receiptText = result.text;
        console.log('✅ OCR complete. Text length:', result.text.length, 'Preview:', result.text.substring(0, 200));
        fs.unlinkSync(tempPath);

        const aiParsed = await parseExpenseFromText(result.text, bodyText);
        console.log('🤖 AI parsed:', JSON.stringify(aiParsed));
        expenseData = { ...expenseData, ...aiParsed };
      } catch (error) {
        console.error('❌ OCR error:', error);
      }
    }

    if (bodyText) {
      const textParsed = await parseExpenseFromText(bodyText, '');
      expenseData = { ...expenseData, ...textParsed };
    }

    const hasMedia = NumMedia && parseInt(NumMedia) > 0;

    if (!expenseData.amount) {
      if (hasMedia) {
        const msg = await generateMessage('Receipt image received but the total amount is not readable. Need the user to send just the amount.');
        await (prisma as any).pendingExpense.upsert({
          where: { phoneNumber },
          create: { userId: user.id, phoneNumber, data: { receiptUrl, receiptText, awaitingAmount: true } },
          update: { data: { receiptUrl, receiptText, awaitingAmount: true } },
        });
        return reply(msg);
      }
      const msg = await generateMessage(`User sent: "${bodyText}" but no expense amount was found in it.`);
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
        notes: bodyText,
        source: 'sms',
        sourcePhone: From,
        tags: expenseData.tags || [],
      },
    });

    console.log('💾 Expense saved:', expense.id);

    await (prisma as any).pendingExpense.upsert({
      where: { phoneNumber },
      create: { userId: user.id, phoneNumber, data: { ...expenseData, time: expenseTime, date: expenseDate, expenseId: expense.id } },
      update: { data: { ...expenseData, time: expenseTime, date: expenseDate, expenseId: expense.id } },
    });

    const msg = await generateMessage(
      `Expense saved. ${summaryContext({ ...expenseData, time: expenseTime, date: expenseDate })}.`
    );
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
