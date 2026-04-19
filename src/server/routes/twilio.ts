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
      const msg = await generateMessage('A new user texted Billie but has no account. Greet them warmly and tell them to sign up on the web dashboard first.');
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
          const msg = await generateMessage(`Billie just logged a receipt expense. Details: ${summaryContext({ ...merged })}. Tell them it's saved and they can update anything if needed.`);
          return reply(msg);
        }
        const msg = await generateMessage("The user replied but Billie still couldn't find an amount. Ask once more for just the total.");
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
          `The user corrected their last expense. The updated record is now: ${JSON.stringify(updated)}. Confirm the update naturally, mentioning the new value they changed.`
        );
        return reply(msg);
      } else if (intent === 'inquiry') {
        const fullContext = JSON.stringify(data);
        const msg = await generateMessage(
          `The user is asking a question about their last expense. Full expense data: ${fullContext}. Their question: "${bodyText}". Answer it directly and naturally.`
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
            `The user wants a summary of their expenses. Here are their last ${recent.length} expenses: ${expenseList}. Total: $${total.toFixed(2)}. Give them a clean, natural summary.`
          );
          return reply(msg);
        }

        const msg = await generateMessage(
          `The user said: "${bodyText}". Respond naturally and conversationally as Billie. Keep it short.`
        );
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
          return reply(await generateMessage("The user asked for their expense summary but they haven't logged anything yet. Let them know and encourage them to send their first receipt or expense."));
        }
        const total = recent.reduce((sum, e) => sum + e.amount, 0);
        const expenseList = recent.map(e => `${e.merchant || e.description}: $${e.amount.toFixed(2)}`).join(', ');
        const msg = await generateMessage(
          `The user wants a summary of their expenses. Here are their last ${recent.length} expenses: ${expenseList}. Total: $${total.toFixed(2)}. Give them a clean, natural summary.`
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
        const msg = await generateMessage(`The user sent a receipt image but the total amount couldn't be read clearly. Ask them to reply with the amount so you can log it for them. Keep it brief.`);
        await (prisma as any).pendingExpense.upsert({
          where: { phoneNumber },
          create: { userId: user.id, phoneNumber, data: { receiptUrl, receiptText, awaitingAmount: true } },
          update: { data: { receiptUrl, receiptText, awaitingAmount: true } },
        });
        return reply(msg);
      }
      const msg = await generateMessage("The user sent a message but Billie couldn't find an expense amount. Ask them to include the amount so you can log it.");
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
      `Billie just logged an expense for the user. Details: ${summaryContext({ ...expenseData, time: expenseTime, date: expenseDate })}. Tell them it's been saved. Let them know they can update the description or any detail if something's off, but don't ask them to confirm.`
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
