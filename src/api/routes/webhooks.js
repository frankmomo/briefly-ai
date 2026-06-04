// ============================================================
// src/api/routes/webhooks.js — Stripe Webhooks + eventos
// ============================================================
// NOTA: Este router se monta ANTES de express.json() en server.js
// porque Stripe requiere el body raw para verificar la firma.
// El router usa su propio body parser: express.raw({ type: ... })
// ============================================================
import { Router, raw } from 'express';
import Stripe from 'stripe';
import { supabase } from '../../lib/supabase.js';

export const webhookRouter = Router();

let stripeClient;

function isPlaceholder(value) {
  return !value || /x{4,}|tu_|placeholder|example/i.test(value);
}

function isStripeSecretKey(value) {
  return /^sk_(live|test)_[A-Za-z0-9_]+$/.test(value || '') && !isPlaceholder(value);
}

function isWebhookSecret(value) {
  return /^whsec_[A-Za-z0-9_]+$/.test(value || '') && !isPlaceholder(value);
}

function getStripe() {
  if (!isStripeSecretKey(process.env.STRIPE_SECRET_KEY)) {
    return null;
  }
  stripeClient ||= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

webhookRouter.post('/stripe', raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripe();
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !isWebhookSecret(endpointSecret)) {
    console.error('[Webhook] Stripe no esta configurado correctamente.');
    return res.status(503).send('Stripe webhook not configured');
  }

  // Extraer firma (rawBody lo obtiene porque express.raw() NO usa JSON.parse)
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    console.error('[Webhook] Missing stripe-signature header');
    return res.status(400).send('Missing stripe-signature header');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('[Webhook] Stripe signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Webhook] Event received: ${event.type} (id: ${event.id})`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const customerId = session.customer;

        if (userId && customerId) {
          // Upsert: evita duplicados si Stripe reenvía el evento
          const { error } = await supabase.from('stripe_customers').upsert(
            {
              user_id: userId,
              stripe_customer_id: customerId,
            },
            { onConflict: 'user_id', ignoreDuplicates: false }
          );
          if (error) console.error('[Webhook] Error saving customer:', error.message);
          else console.log(`[Webhook] Customer ${customerId} linked to user ${userId}`);
        } else {
          console.warn('[Webhook] checkout.session.completed sin userId o customerId', { userId, customerId });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const customerId = sub.customer;

        // Buscar userId desde stripe_customers
        const { data: userData, error: userError } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (userError) {
          console.error('[Webhook] Error fetching user:', userError.message);
          break;
        }
        if (!userData) {
          console.warn(`[Webhook] No user found for customer ${customerId}. Subscription ${sub.id} no vinculada.`);
          break;
        }

        const userId = userData.user_id;

        // Sanitizar timestamps (vienen en segundos UNIX, pueden ser null)
        const toISO = (epochSec) =>
          epochSec ? new Date(epochSec * 1000).toISOString() : null;

        const subscriptionData = {
          user_id: userId,
          stripe_subscription_id: sub.id,
          status: sub.status || 'unknown',
          plan_id: sub.items?.data?.[0]?.price?.id || 'unknown',
          current_period_start: toISO(sub.current_period_start),
          current_period_end: toISO(sub.current_period_end),
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          updated_at: new Date().toISOString(),
        };

        const { error: upsertError } = await supabase
          .from('subscriptions')
          .upsert(subscriptionData, {
            onConflict: 'user_id',
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error('[Webhook] Error upserting subscription:', upsertError.message);
        } else {
          console.log(`[Webhook] Subscription ${sub.id} synced for user ${userId} (status: ${sub.status})`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const deletedSub = event.data.object;
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', deletedSub.id);

        if (error) {
          console.error('[Webhook] Error canceling subscription:', error.message);
        } else {
          console.log(`[Webhook] Subscription ${deletedSub.id} marked as canceled`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        const { data: userData } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (userData?.user_id) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('user_id', userData.user_id);

          console.log(`[Webhook] Payment failed for user ${userData.user_id}`);
          // TODO: enviar email de "tu pago falló"
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        // Stripe reenvía esto después del pago exitoso — no requiere acción extra
        console.log(`[Webhook] Payment succeeded for invoice ${event.data.object.id}`);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type} — ignoring`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[Webhook] Error processing event:', err);
    // Stripe espera 200 aunque falle para no reenviar; mejor devolver 500 y loguear
    res.status(500).json({ error: 'Webhook handler error' });
  }
});

// Endpoint para probar webhook manualmente
webhookRouter.get('/stripe/test', (_req, res) => {
  res.json({
    message: 'Webhook endpoint reachable. POST /api/webhooks/stripe with Stripe events.',
    rawBodyRequired: true,
    note: 'Este endpoint usa express.raw() — no uses JSON parser global.',
  });
});
