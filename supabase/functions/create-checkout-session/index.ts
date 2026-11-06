// Supabase Edge Function: creates a Stripe Checkout Session (hosted page) and returns its URL.
// Called by signed-in organizers (the Supabase gateway verifies their JWT).
// Secrets: STRIPE_SECRET_KEY, DOMAIN — see STRIPE_INTEGRATION_TODO.md.
import Stripe from 'npm:stripe@23.0.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
const domain = (Deno.env.get('DOMAIN') ?? '').replace(/\/$/, '');

const cors = {
  'Access-Control-Allow-Origin': domain || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  try {
    // TODO: set mode to "subscription" if selling recurring products.
    const mode = 'payment' as 'payment' | 'subscription';

    // fixed_by_ui parameters (Checkout Studio) + sample_only placeholders (see STRIPE_INTEGRATION_TODO.md).
    // payment_method_collection is only sent when mode is "subscription".
    const sessionParams: Record<string, unknown> = {
      ui_mode: 'hosted_page',
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: false },
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      submit_type: 'auto',
      name_collection: { individual: { enabled: true, optional: true } },
      integration_identifier: 'hosted_web_0001',
      origin_context: 'web',
      mode,
      success_url: `${domain}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}`,
      line_items: [{ price: 'price_...', quantity: 1 }],
    };
    if (mode === 'subscription') sessionParams.payment_method_collection = 'always';

    const session = await stripe.checkout.sessions.create(sessionParams as unknown as Stripe.Checkout.SessionCreateParams);
    return Response.json({ url: session.url }, { headers: cors });
  } catch (error) {
    console.error('Checkout Session creation failed:', error);
    return Response.json({ error: 'Impossibile avviare il pagamento. Riprova più tardi.' }, { status: 500, headers: cors });
  }
});
