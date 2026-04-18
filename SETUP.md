# Quick Setup Guide for Billie

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment Variables

Create a `.env` file in the root directory with the following:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/billie_expense"

# Security
JWT_SECRET="your-super-secret-jwt-key-change-this-to-something-random"
PORT=3001

# Twilio (Get from https://console.twilio.com)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Google Cloud Vision (Get from https://console.cloud.google.com)
GOOGLE_CLOUD_PROJECT_ID="your-gcp-project-id"
GOOGLE_APPLICATION_CREDENTIALS="./gcp-credentials.json"

# OpenAI (Get from https://platform.openai.com)
OPENAI_API_KEY="sk-your-openai-api-key"
```

## Step 3: Set Up PostgreSQL Database

### Option A: Local PostgreSQL
```bash
# Install PostgreSQL
# macOS: brew install postgresql
# Windows: Download from postgresql.org
# Linux: sudo apt-get install postgresql

# Create database
createdb billie_expense

# Update DATABASE_URL in .env
DATABASE_URL="postgresql://localhost:5432/billie_expense"
```

### Option B: Cloud Database (Recommended for Production)
Use services like:
- **Supabase** (free tier available)
- **Neon** (free tier available)
- **Railway** (free tier available)
- **Heroku Postgres**

## Step 4: Set Up Twilio

1. Sign up at https://www.twilio.com
2. Get a phone number (free trial available)
3. Copy Account SID and Auth Token to `.env`
4. For local development, use ngrok:
   ```bash
   ngrok http 3001
   ```
5. Set webhook URL in Twilio console:
   - Go to Phone Numbers → Your Number → Messaging
   - Set "A MESSAGE COMES IN" to: `https://your-ngrok-url.ngrok.io/api/twilio/webhook`

## Step 5: Set Up Google Cloud Vision

1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable Vision API
4. Create service account:
   - IAM & Admin → Service Accounts → Create
   - Grant "Cloud Vision API User" role
   - Create key (JSON format)
5. Download JSON and save as `gcp-credentials.json` in root
6. Update `GOOGLE_APPLICATION_CREDENTIALS` in `.env`

## Step 6: Get OpenAI API Key

1. Go to https://platform.openai.com
2. Create account and add payment method
3. Go to API Keys → Create new key
4. Copy to `OPENAI_API_KEY` in `.env`

## Step 7: Initialize Database

```bash
npm run db:push
```

## Step 8: Start Development

```bash
npm run dev
```

This starts:
- Backend API on http://localhost:3001
- Frontend on http://localhost:5173

## Step 9: Create Account

1. Open http://localhost:5173
2. Click "Sign up"
3. Enter your details including phone number (format: +1234567890)
4. Login and start using!

## Step 10: Test SMS Integration

Send a text to your Twilio number:
- `$25 lunch at Chipotle`
- Or send a photo of a receipt

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Try: `psql -d billie_expense` to test connection

### Twilio Not Receiving Messages
- Check ngrok is running
- Verify webhook URL in Twilio console
- Check Twilio debugger for errors

### OCR Not Working
- Verify GCP credentials file exists
- Check Vision API is enabled
- Ensure service account has correct permissions

### Build Errors
- Delete `node_modules` and run `npm install` again
- Clear TypeScript cache: `rm -rf dist`
- Check Node version (requires 18+)

## Production Deployment

See README.md for detailed deployment instructions.

## Cost Estimates (Monthly)

- **Twilio**: ~$1/month for phone number + $0.0075/SMS
- **Google Vision**: First 1000 requests free, then $1.50/1000
- **OpenAI**: ~$0.002 per request (GPT-4o-mini)
- **Database**: Free tier available (Supabase/Neon)
- **Hosting**: Free tier available (Vercel/Netlify/Railway)

**Total for 100 expenses/month**: ~$2-5
