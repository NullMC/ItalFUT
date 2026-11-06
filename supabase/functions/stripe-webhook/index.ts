// Supabase Edge Function: receives Stripe events. Stripe sends no Supabase JWT, so this
// function is deployed with --no-verify-jwt and trusts only a valid Stripe signature.
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET — see STRIPE_INTEGRATION_TODO.md.
import Stripe from 'npm:stripe@23.0.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
// Deno has no synchronous Node crypto: signatures are verified with constructEventAsync.
const cryptoProvider = Stripe.createSubtleCryptoProvider();

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

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Checkout completed:', session.id);
      // TODO (fulfillment): activate the purchased plan/modules for the tournament.
      // See "Next steps" in STRIPE_INTEGRATION_TODO.md.
      if (session.consent?.terms_of_service === 'accepted') console.log('Customer accepted terms of service');
      break;
    }
    default:
      console.log('Unhandled event type:', event.type);
  }
  return Response.json({ received: true });
});
