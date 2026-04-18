import express from 'express';
import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { processReceiptFile } from '../services/ocr';
import { parseExpenseFromText } from '../services/ai';

const router = express.Router();
const prisma = new PrismaClient();

const upload = multer({ dest: 'uploads/' });

function formatPendingSummary(data: any): string {
  const date = data.date ? new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today';
  const time = data.time || new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const amount = data.amount ? `$${parseFloat(data.amount).toFixed(2)}` : 'Unknown';
  const vendor = data.merchant || 'Unknown vendor';
  const expense = data.description || 'Expense';

  return `Got it! Here's what I picked up:\n\n📅 Date: ${date}\n🕐 Time: ${time}\n💰 Expense: ${amount}\n🏪 Vendor: ${vendor}\n📝 Description: ${expense}\n\nLooks good? Reply *yes* to save it, or let me know what to fix (e.g. "vendor is Chipotle" or "amount is 12.50").`;
}

router.post('/webhook', upload.none(), async (req, res) => {
  try {
    const { From, Body, NumMedia, MediaUrl0 } = req.body;

    console.log('📱 Message received from:', From);
    console.log('📝 Body:', Body);
    console.log('🖼️ Media count:', NumMedia);

    const phoneNumber = From.replace('whatsapp:', '');
    const reply = (msg: string) => {
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message(msg);
      res.type('text/xml');
      return res.send(twiml.toString());
    };

    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) {
      return reply('Hey! Welcome to Billie 👋 To get started, create your account at the web dashboard first, then come back here.');
    }

    const bodyLower = (Body || '').trim().toLowerCase();

    const pending = await (prisma as any).pendingExpense.findUnique({ where: { phoneNumber } });

    if (pending) {
      const data = pending.data as any;

      if (bodyLower === 'yes' || bodyLower === 'y' || bodyLower === 'looks good' || bodyLower === 'save') {
        await (prisma as any).pendingExpense.delete({ where: { phoneNumber } });

        const expense = await prisma.expense.create({
          data: {
            userId: user.id,
            amount: parseFloat(data.amount),
            currency: data.currency || 'USD',
            description: data.description || 'Expense',
            merchant: data.merchant,
            category: data.category,
            time: data.time,
            date: data.date ? new Date(data.date) : new Date(),
            receiptUrl: data.receiptUrl,
            receiptText: data.receiptText,
            notes: data.notes,
            source: 'sms',
            sourcePhone: From,
            tags: data.tags || [],
          },
        });

        console.log('💾 Expense saved:', expense.id);
        return reply(`Perfect, logged! ✅ $${expense.amount.toFixed(2)} at ${expense.merchant || expense.description}. You can view it on your dashboard anytime.`);
      }

      if (bodyLower === 'no' || bodyLower === 'cancel' || bodyLower === 'discard') {
        await (prisma as any).pendingExpense.delete({ where: { phoneNumber } });
        return reply("No problem, tossed it out. Send me a new expense whenever you're ready!");
      }

      const corrections: any = { ...data };
      const amountMatch = Body.match(/amount\s+is\s+\$?(\d+\.?\d*)/i) || Body.match(/\$(\d+\.?\d*)/);
      const vendorMatch = Body.match(/vendor\s+is\s+(.+)/i) || Body.match(/merchant\s+is\s+(.+)/i) || Body.match(/store\s+is\s+(.+)/i);
      const dateMatch = Body.match(/date\s+is\s+(.+)/i);
      const timeMatch = Body.match(/time\s+is\s+(.+)/i);
      const descMatch = Body.match(/description\s+is\s+(.+)/i) || Body.match(/expense\s+is\s+(.+)/i);

      if (amountMatch) corrections.amount = parseFloat(amountMatch[1]);
      if (vendorMatch) corrections.merchant = vendorMatch[1].trim();
      if (dateMatch) corrections.date = dateMatch[1].trim();
      if (timeMatch) corrections.time = timeMatch[1].trim();
      if (descMatch) corrections.description = descMatch[1].trim();

      await (prisma as any).pendingExpense.update({
        where: { phoneNumber },
        data: { data: corrections },
      });

      return reply(`Updated! Here's the revised summary:\n\n${formatPendingSummary(corrections)}`);
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

        const aiParsed = await parseExpenseFromText(result.text, Body || '');
        expenseData = { ...expenseData, ...aiParsed };
        console.log('✅ OCR complete:', result.text.substring(0, 100));
      } catch (error) {
        console.error('❌ OCR error:', error);
      }
    }

    if (Body && Body.trim()) {
      const textParsed = await parseExpenseFromText(Body, '');
      expenseData = { ...expenseData, ...textParsed };
    }

    if (!expenseData.amount) {
      return reply("Hmm, I couldn't find an amount in there. Try something like \"$18.50 dinner at Olive Garden\" and I'll take care of the rest!");
    }

    const now = new Date();
    const pendingData = {
      ...expenseData,
      time: expenseData.time || now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      date: expenseData.date || now.toISOString(),
      receiptUrl,
      receiptText,
      notes: Body,
    };

    await (prisma as any).pendingExpense.upsert({
      where: { phoneNumber },
      create: { userId: user.id, phoneNumber, data: pendingData },
      update: { data: pendingData },
    });

    return reply(formatPendingSummary(pendingData));

  } catch (error) {
    console.error('Twilio webhook error:', error);
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Oops, something went wrong on my end. Give it another shot!');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

export default router;
