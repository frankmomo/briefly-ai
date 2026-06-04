// ============================================================
// src/api/routes/billing.js — Stripe Checkout + Web Portal
// ============================================================
import { Router } from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../../lib/supabase.js';

export const billingRouter = Router();

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[Billing] WARN: STRIPE_SECRET_KEY no configurado.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PRICE_MONTHLY = process.env.STRIPE_PRICE_ID_MONTHLY;
const PRICE_YEARLY = process.env.STRIPE_PRICE_ID_YEARLY;

/**
 * POST /api/billing/create-checkout
 * Crea sesión de Stripe Checkout para suscripción.
 */
billingRouter.post('/create-checkout', requireAuth, async (req, res) => {
  try {
    const { priceId, successUrl, cancelUrl } = req.body || {};
    const effectivePriceId = priceId || PRICE_MONTHLY;

    if (!effectivePriceId) {
      return res.status(400).json({
        error: 'No se configuró STRIPE_PRICE_ID_MONTHLY en el servidor ni se envió priceId.',
      });
    }

    // Obtener o crear Customer en Stripe para este usuario
    const { data: customerData } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', req.userId)
      .maybeSingle();

    let customerId = customerData?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { userId: req.userId },
      });
      customerId = customer.id;

      await supabase.from('stripe_customers').insert({
        user_id: req.userId,
        stripe_customer_id: customerId,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: effectivePriceId, quantity: 1 }],
      success_url: successUrl || `${process.env.APP_URL || 'http://localhost:3000'}/dashboard?checkout=success`,
      cancel_url: cancelUrl || `${process.env.APP_URL || 'http://localhost:3000'}/pricing`,
      metadata: { userId: req.userId },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[Billing] Checkout error:', err);
    res.status(500).json({ error: 'Error al crear sesión de pago' });
  }
});

/**
 * POST /api/billing/create-portal
 * Crea enlace al portal de gestión de suscripción de Stripe.
 */
billingRouter.post('/create-portal', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', req.userId)
      .maybeSingle();

    if (error) throw error;
    if (!data?.stripe_customer_id) {
      return res.status(400).json({ error: 'No se encontró customer en Stripe. ¿Ya tienes una suscripción?' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${process.env.APP_URL || 'http://localhost:3000'}/settings`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[Billing] Portal error:', err);
    res.status(500).json({ error: 'Error al crear portal de gestión' });
  }
});

/**
 * GET /api/billing/status
 * Devuelve el estado de la suscripción del usuario.
 */
billingRouter.get('/status', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.json({ active: false, subscription: null });
    }

    const active = ['active', 'trialing', 'past_due'].includes(data.status) &&
      data.current_period_end &&
      new Date(data.current_period_end) > new Date();

    res.json({
      active,
      subscription: {
        status: data.status,
        plan: data.plan_id,
        currentPeriodEnd: data.current_period_end,
        cancelAtPeriodEnd: data.cancel_at_period_end,
      },
    });
  } catch (err) {
    console.error('[Billing] Status error:', err);
    res.status(500).json({ error: 'Error al obtener estado de suscripción' });
  }
});
