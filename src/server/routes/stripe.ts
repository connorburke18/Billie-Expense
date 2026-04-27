import express from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { authenticate as authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-04-10' as any,
});

const PLANS = {
  solo: {
    name: 'Solo',
    priceId: process.env.STRIPE_PRICE_SOLO || 'price_solo_placeholder',
    amount: 500,
    expenseLimit: 100,
    seats: 1,
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRICE_PRO || 'price_pro_placeholder',
    amount: 1200,
    expenseLimit: 500,
    seats: 1,
  },
  business: {
    name: 'Business',
    priceId: process.env.STRIPE_PRICE_BUSINESS_BASE || 'price_business_placeholder',
    seatPriceId: process.env.STRIPE_PRICE_BUSINESS_SEAT || 'price_seat_placeholder',
    amount: 2500,
    expenseLimit: 500,
    seats: 3,
  },
};

router.post('/create-checkout', authenticateToken, async (req: any, res) => {
  try {
    const { plan, seats = 1 } = req.body;
    const userId = req.userId;

    if (!['solo', 'pro', 'business'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const appUrl = process.env.APP_URL || 'https://www.billietracker.com';

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
        metadata: { userId },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
    }

    const planConfig = PLANS[plan as keyof typeof PLANS];
    const lineItems: any[] = [
      { price: planConfig.priceId, quantity: 1 },
    ];

    if (plan === 'business' && seats > 1 && PLANS.business.seatPriceId) {
      lineItems.push({ price: PLANS.business.seatPriceId, quantity: seats - 1 });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: lineItems,
      success_url: `${appUrl}/dashboard?upgraded=1`,
      cancel_url: `${appUrl}/pricing`,
      metadata: { userId, plan, seats: seats.toString() },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

router.post('/create-portal', authenticateToken, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.stripeCustomerId) return res.status(400).json({ error: 'No billing account found' });

    const appUrl = process.env.APP_URL || 'https://www.billietracker.com';
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    res.status(500).json({ error: 'Failed to open billing portal' });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send('Webhook Error');
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, plan, seats } = session.metadata || {};
      if (userId && plan) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan,
            stripeSubscriptionId: session.subscription as string,
            seats: parseInt(seats || '1'),
            billingCycleStart: new Date(),
          },
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: sub.id } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: 'free', stripeSubscriptionId: null, seats: 1 },
        });
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: sub.id } });
      if (user && sub.status !== 'active') {
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: 'free', seats: 1 },
        });
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  res.json({ received: true });
});

export default router;
