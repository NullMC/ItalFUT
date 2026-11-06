// Supabase Edge Function: receives Stripe events. Stripe sends no Supabase JWT, so this
// function is deployed with --no-verify-jwt and trusts only a valid Stripe signature.
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET — see STRIPE_INTEGRATION_TODO.md.
import Stripe from 'npm:stripe@23.0.1';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
// Deno has no synchronous Node crypto: signatures are verified with constructEventAsync.
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const pickKey = (mapName: string, legacy: string) => {
  try { const map = JSON.parse(Deno.env.get(mapName) ?? '{}'); if (map.default) return String(map.default); } catch { /* not set */ }
  return Deno.env.get(legacy) ?? '';
};
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', pickKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const idOf = (value: string | { id: string } | null | undefined) => typeof value === 'string' ? value : value?.id ?? null;

async function fulfill(session: Stripe.Checkout.Session) {
  const { data, error } = await admin.rpc('fulfill_payment', {
    p_session_id: session.id,
    p_payment_intent: idOf(session.payment_intent as string | { id: string } | null),
    p_customer: idOf(session.customer as string | { id: string } | null),
    p_amount_subtotal: session.amount_subtotal,
    p_amount_total: session.amount_total,
    p_currency: session.currency,
  });
  if (error) throw error;
  console.log('fulfill_payment', session.id, data);
}
async function mark(sessionId: string | null, paymentIntent: string | null, status: 'expired' | 'failed' | 'refunded') {
  const { data, error } = await admin.rpc('mark_payment', { p_session_id: sessionId, p_payment_intent: paymentIntent, p_status: status });
  if (error) throw error;
  console.log('mark_payment', status, sessionId ?? paymentIntent, data);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const signature = req.headers.get('stripe-signature') ?? '';
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '', undefined, cryptoProvider);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return new Response('Bad signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Cards are paid immediately; delayed methods confirm later (async_payment_succeeded).
        if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') await fulfill(session);
        else console.log('Checkout completed, payment pending:', session.id);
        break;
      }
      case 'checkout.session.async_payment_succeeded':
        await fulfill(event.data.object as Stripe.Checkout.Session);
        break;
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await mark(session.id, idOf(session.payment_intent as string | { id: string } | null), 'failed');
        break;
      }
      case 'checkout.session.expired':
        await mark((event.data.object as Stripe.Checkout.Session).id, null, 'expired');
        break;
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        // Only full refunds mark the payment; partial refunds are left to the superadmin.
        if (charge.refunded) await mark(null, idOf(charge.payment_intent as string | { id: string } | null), 'refunded');
        break;
      }
      default:
        console.log('Unhandled event type:', event.type);
    }
  } catch (error) {
    // 500 makes Stripe retry the event later (fulfillment is idempotent).
    console.error('Webhook handling failed:', event.type, error);
    return new Response('Handler error', { status: 500 });
  }
  return Response.json({ received: true });
});
