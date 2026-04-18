# Billie - Smart Expense Tracking via SMS

A commercially viable expense tracking application that allows users to text pictures of receipts or expense notes via SMS, with automatic OCR processing and intelligent categorization.

## 🚀 Features

- **SMS/MMS Integration**: Text receipts or expense notes to a dedicated phone number
- **OCR Processing**: Automatic text extraction from receipt images using Google Cloud Vision
- **AI-Powered Parsing**: GPT-4 Vision intelligently extracts amount, merchant, category, and date
- **Web Dashboard**: Modern React dashboard to view and manage expenses
- **Real-time Statistics**: Track spending by category, time period, and more
- **User Authentication**: Secure JWT-based authentication
- **Multi-user Support**: Each user has their own expense tracking

## 🛠 Tech Stack

### Backend
- **Node.js/Express** with TypeScript
- **PostgreSQL** database with Prisma ORM
- **Twilio** for SMS/MMS handling
- **Google Cloud Vision API** for OCR
- **OpenAI GPT-4** for intelligent expense parsing
- **JWT** for authentication

### Frontend
- **React** with TypeScript
- **React Router** for navigation
- **TailwindCSS** for styling
- **Lucide React** for icons
- **Axios** for API calls

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Twilio account with phone number
- Google Cloud Platform account with Vision API enabled
- OpenAI API key

## 🔧 Installation

1. **Clone the repository**
```bash
cd billie-expense
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
- `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token
- `TWILIO_PHONE_NUMBER`: Your Twilio phone number
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to GCP credentials JSON
- `OPENAI_API_KEY`: Your OpenAI API key

4. **Set up the database**

```bash
npm run db:push
```

5. **Start the development servers**

```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 5173).

## 📱 Twilio Setup

1. **Purchase a phone number** in your Twilio console
2. **Configure webhook** for incoming messages:
   - Go to your phone number settings
   - Set "A MESSAGE COMES IN" webhook to: `https://your-domain.com/api/twilio/webhook`
   - For local development, use ngrok: `ngrok http 3001`
   - Then use: `https://your-ngrok-url.ngrok.io/api/twilio/webhook`

## 🔐 Google Cloud Vision Setup

1. Create a project in Google Cloud Console
2. Enable the Vision API
3. Create a service account and download the JSON credentials
4. Save the JSON file and set `GOOGLE_APPLICATION_CREDENTIALS` to its path

## 💬 How to Use

### Web Dashboard

1. **Register** an account at `http://localhost:5173/register`
2. **Add your phone number** during registration (format: +1234567890)
3. **View expenses** and statistics in the dashboard

### SMS Usage

Send a text message to your Twilio number with:

**Text-only expense:**
```
$45.50 lunch at Chipotle
```

**Receipt photo:**
- Take a photo of your receipt
- Send it via MMS to your Twilio number
- Optionally add a note in the message

**Examples:**
- `$12.99 coffee`
- `Spent $150 on groceries at Whole Foods`
- `$25 Uber ride to airport`
- Send receipt photo with text: `Dinner with clients`

The system will:
1. Extract text from receipt images using OCR
2. Parse the expense details using AI
3. Automatically categorize the expense
4. Store it in your account
5. Send you a confirmation via SMS

## 🏗 Project Structure

```
billie-expense/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── server/                # Backend code
│   │   ├── routes/           # API routes
│   │   ├── services/         # OCR and AI services
│   │   ├── middleware/       # Auth middleware
│   │   └── server.ts         # Express server
│   └── client/               # Frontend code
│       ├── pages/            # React pages
│       ├── contexts/         # React contexts
│       ├── lib/              # Utilities and API client
│       └── App.tsx           # Main app component
├── package.json
└── README.md
```

## 🚀 Deployment

### Backend Deployment

Deploy to platforms like:
- **Railway**
- **Render**
- **Heroku**
- **AWS/GCP/Azure**

Make sure to:
1. Set all environment variables
2. Run database migrations
3. Update Twilio webhook URL to production domain

### Frontend Deployment

Deploy to:
- **Vercel**
- **Netlify**
- **Cloudflare Pages**

Update API proxy settings in production.

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Expenses
- `GET /api/expenses` - Get all expenses
- `GET /api/expenses/:id` - Get single expense
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `DELETE /api/categories/:id` - Delete category

### Statistics
- `GET /api/stats` - Get expense statistics

### Twilio Webhook
- `POST /api/twilio/webhook` - Handle incoming SMS/MMS

## 🔒 Security Considerations

- All API endpoints (except auth and Twilio webhook) require JWT authentication
- Passwords are hashed using bcrypt
- Environment variables store sensitive credentials
- CORS configured for production domains
- Twilio webhook validates request signatures (implement in production)

## 💰 Commercial Viability

### Revenue Models
1. **Freemium**: Free tier with limited expenses, paid plans for unlimited
2. **Subscription**: Monthly/yearly plans ($5-15/month)
3. **Business Plans**: Team features, receipt scanning limits, advanced analytics
4. **API Access**: Allow third-party integrations

### Scaling Considerations
- Implement Redis for caching and rate limiting
- Use CDN for receipt images
- Optimize database queries with indexes
- Implement background job processing for OCR
- Add monitoring and error tracking (Sentry, DataDog)

## 🧪 Testing

```bash
# Run backend tests
npm run test:server

# Run frontend tests
npm run test:client
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

## 📧 Support

For issues or questions, please open a GitHub issue or contact support.

---

Built with ❤️ for effortless expense tracking
