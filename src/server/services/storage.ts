import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadReceiptImage(filePath: string, expenseId?: string): Promise<string | null> {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.warn('Cloudinary not configured, skipping upload');
    return null;
  }
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'billie-receipts',
      public_id: expenseId ? `receipt-${expenseId}` : undefined,
      resource_type: 'image',
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return null;
  }
}
