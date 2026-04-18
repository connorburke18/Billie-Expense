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

router.post('/webhook', upload.none(), async (req, res) => {
  try {
    const { From, Body, NumMedia, MediaUrl0, MediaContentType0 } = req.body;

    console.log('📱 Message received from:', From);
    console.log('📝 Body:', Body);
    console.log('🖼️ Media count:', NumMedia);

    // WhatsApp numbers come as "whatsapp:+1234567890", SMS as "+1234567890"
    const phoneNumber = From.replace('whatsapp:', '');

    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('Welcome to Billie! Please register at our website first to link your phone number.');
      res.type('text/xml');
      return res.send(twiml.toString());
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
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('Could not extract expense amount. Please try again with format: "$50 lunch at Starbucks"');
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    const expense = await prisma.expense.create({
      data: {
        userId: user.id,
        amount: expenseData.amount,
        currency: expenseData.currency || 'USD',
        description: expenseData.description || Body || 'SMS expense',
        merchant: expenseData.merchant,
        category: expenseData.category,
        date: expenseData.date ? new Date(expenseData.date) : new Date(),
        receiptUrl,
        receiptText,
        notes: Body,
        source: 'sms',
        sourcePhone: From,
        tags: expenseData.tags || [],
      },
    });

    console.log('💾 Expense saved:', expense.id);

    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(
      `✅ Expense logged: $${expense.amount.toFixed(2)} - ${expense.description}${
        expense.category ? ` (${expense.category})` : ''
      }`
    );
    
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Twilio webhook error:', error);
    
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Sorry, there was an error processing your expense. Please try again.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

export default router;
