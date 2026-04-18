import { createWorker } from 'tesseract.js';
import axios from 'axios';

export async function processReceipt(imageUrl: string): Promise<{ text: string; confidence: number }> {
  const worker = await createWorker('eng');
  
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);

    const { data } = await worker.recognize(imageBuffer);

    await worker.terminate();

    return {
      text: data.text,
      confidence: data.confidence / 100,
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    await worker.terminate();
    throw error;
  }
}

export async function processReceiptFile(filePath: string): Promise<{ text: string; confidence: number }> {
  const worker = await createWorker('eng');
  
  try {
    const { data } = await worker.recognize(filePath);

    await worker.terminate();

    return {
      text: data.text,
      confidence: data.confidence / 100,
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    await worker.terminate();
    throw error;
  }
}
