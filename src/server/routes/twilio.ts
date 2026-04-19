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
    const pending = await (prisma as any).pendingExpense.findUnique({ where: { phoneNumber } });

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
        const amountMatch = bodyText.match(/amount\s+is\s+\$?(\d+\.?\d*)/i) || bodyText.match(/\$(\d+\.?\d*)/);
        const vendorMatch = bodyText.match(/vendor\s+is\s+(.+)/i) || bodyText.match(/merchant\s+is\s+(.+)/i) || bodyText.match(/store\s+is\s+(.+)/i);
        const dateMatch = bodyText.match(/date\s+is\s+(.+)/i);
        const timeMatch = bodyText.match(/time\s+is\s+(.+)/i);
        const descMatch = bodyText.match(/description\s+is\s+(.+)/i) || bodyText.match(/note\s+is\s+(.+)/i) || bodyText.match(/category\s+is\s+(.+)/i);

        if (amountMatch) corrections.amount = parseFloat(amountMatch[1]);
        if (vendorMatch) corrections.merchant = vendorMatch[1].trim();
        if (dateMatch) corrections.date = dateMatch[1].trim();
        if (timeMatch) corrections.time = timeMatch[1].trim();
        if (descMatch) corrections.description = descMatch[1].trim();

        if (data.expenseId) {
          await prisma.expense.update({
            where: { id: data.expenseId },
            data: {
              amount: corrections.amount ? parseFloat(corrections.amount) : undefined,
              merchant: corrections.merchant,
              description: corrections.description,
              time: corrections.time,
              date: corrections.date ? new Date(corrections.date) : undefined,
            },
          });
        }

        await (prisma as any).pendingExpense.update({
          where: { phoneNumber },
          data: { data: corrections },
        });

        const msg = await generateMessage(
          `The user corrected their last expense. Updated details: ${summaryContext(corrections)}. Acknowledge the change casually. Let them know it's updated.`
        );
        return reply(msg);
      } else {
        const msg = await generateMessage(
          `The user sent an unrelated message. Their last expense was: ${summaryContext(data)}. Respond briefly and naturally.`
        );
        return reply(msg);
      }
    }

    let expenseData: any = {};
    let receiptUrl: string | undefined;
    let receiptText: string | undefined;

    if (NumMedia && parseInt(NumMedia) > 0) {
      console.log('📸 Processing receipt image...');
      try {
        const imageUrl = MediaUrl0;
        receiptUrl = imageUrl;

        const accountSid = process.env.TWILIO_ACCOUNT_SID!;
        const authToken = process.env.TWILIO_AUTH_TOKEN!;
        const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

        const imageResponse = await fetch(imageUrl, { headers: { Authorization: authHeader } });
        if (!imageResponse.ok) throw new Error(`Failed to fetch image: ${imageResponse.status}`);

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const tempPath = path.join('/tmp', `receipt_${Date.now()}.jpg`);
        fs.writeFileSync(tempPath, imageBuffer);

        const result = await processReceiptFile(tempPath);
        receiptText = result.text;
        fs.unlinkSync(tempPath);

        const aiParsed = await parseExpenseFromText(result.text, bodyText);
        expenseData = { ...expenseData, ...aiParsed };
        console.log('✅ OCR complete:', result.text.substring(0, 100));
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
