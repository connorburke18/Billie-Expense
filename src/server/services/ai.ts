import Anthropic from '@anthropic-ai/sdk';

const anthropic = process.env.ANTHROPIC_API_KEY 
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

interface ExpenseData {
  amount?: number;
  currency?: string;
  description?: string;
  merchant?: string;
  category?: string;
  date?: string;
  tags?: string[];
}

export async function classifyMessage(body: string, pendingContext: string): Promise<'new_expense' | 'correction' | 'inquiry' | 'other'> {
  if (!anthropic) return 'new_expense';
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 10,
      temperature: 0,
      system: 'You classify incoming messages for an expense tracker. Reply with ONLY one word: new_expense, correction, inquiry, or other. "inquiry" means the user is asking a question about their last expense.',
      messages: [{
        role: 'user',
        content: `Last saved expense: ${pendingContext}\n\nNew message: "${body}"\n\nClassify this as new_expense, correction, inquiry, or other?`,
      }],
    });
    const text = (message.content[0].type === 'text' ? message.content[0].text : '').trim().toLowerCase();
    if (text.includes('new_expense')) return 'new_expense';
    if (text.includes('correction')) return 'correction';
    if (text.includes('inquiry')) return 'inquiry';
    return 'other';
  } catch {
    return 'new_expense';
  }
}

export async function generateMessage(prompt: string): Promise<string> {
  if (!anthropic) return prompt;
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      temperature: 0.7,
      system: 'You are Billie, a casual but professional expense tracking assistant communicating via WhatsApp. Keep responses short, friendly, and conversational. No emojis. No markdown formatting.',
      messages: [{ role: 'user', content: prompt }],
    });
    return message.content[0].type === 'text' ? message.content[0].text : prompt;
  } catch {
    return prompt;
  }
}

export async function parseExpenseFromText(
  receiptText: string,
  userNote: string
): Promise<ExpenseData> {
  try {
    if (!anthropic) {
      console.warn('Anthropic API key not configured, using fallback parsing');
      const simpleMatch = (receiptText + ' ' + userNote).match(/\$?(\d+\.?\d*)/);
      if (simpleMatch) {
        return {
          amount: parseFloat(simpleMatch[1]),
          currency: 'USD',
          description: userNote || receiptText.substring(0, 50) || 'Expense',
          category: 'Other',
        };
      }
      return { description: userNote || 'Expense', category: 'Other' };
    }

    const prompt = `You are an expense tracking assistant. Extract expense information from the following text.

Receipt/OCR Text:
${receiptText}

User Note:
${userNote}

Extract and return a JSON object with these fields (only include fields you can confidently extract):
- amount: number (the total amount)
- currency: string (default to "USD" if not specified)
- description: string (brief description of the expense)
- merchant: string (name of the merchant/store)
- category: string (one of: Food, Transport, Shopping, Entertainment, Bills, Health, Travel, Other)
- date: string (ISO format, default to today if not found)
- tags: array of strings (relevant tags)

Return ONLY the JSON object, no other text.`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      temperature: 0.3,
      system: 'You are a helpful assistant that extracts expense information from receipts and notes. Always respond with valid JSON only.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}';
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : '{}';
    
    const parsed = JSON.parse(jsonText);

    return parsed;
  } catch (error) {
    console.error('AI parsing error:', error);
    
    const simpleMatch = (receiptText + ' ' + userNote).match(/\$?(\d+\.?\d*)/);
    if (simpleMatch) {
      return {
        amount: parseFloat(simpleMatch[1]),
        currency: 'USD',
        description: userNote || 'Expense',
      };
    }

    return {};
  }
}
