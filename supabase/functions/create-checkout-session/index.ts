// Supabase Edge Function: creates a Stripe Checkout Session (hosted page) and returns its URL.
// Body: { tenant_id, months, features } from a signed-in owner/admin of the tournament.
// The price is computed in the database (start_checkout → quote_plan), never taken from the browser.
// Secrets: STRIPE_SECRET_KEY, DOMAIN — see STRIPE_INTEGRATION_TODO.md.
import Stripe from 'npm:stripe@23.0.1';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
const domain = (Deno.env.get('DOMAIN') ?? '').replace(/\/$/, '');
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
/** New API keys (JSON maps) with fallback to the legacy ones. */
const pickKey = (mapName: string, legacy: string) => {
  try { const map = JSON.parse(Deno.env.get(mapName) ?? '{}'); if (map.default) return String(map.default); } catch { /* not set */ }
  return Deno.env.get(legacy) ?? '';
};
const publishableKey = pickKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
const secretKey = pickKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');

const cors = {
  'Access-Control-Allow-Origin': domain || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405);
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
  if (!stripeKey.startsWith('sk_') && !stripeKey.startsWith('rk_')) return json({ error: 'Pagamenti non configurati: manca il secret STRIPE_SECRET_KEY su Supabase.' }, 500);
  if (!domain) return json({ error: 'Pagamenti non configurati: manca il secret DOMAIN su Supabase.' }, 500);

  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return json({ error: 'Accedi per continuare.' }, 401);
  let input: { tenant_id?: unknown; months?: unknown; features?: unknown };
  try { input = await req.json(); } catch { return json({ error: 'Richiesta non valida.' }, 400); }
  const tenantId = String(input.tenant_id ?? '');
  const months = Number(input.months);
  const features = Array.isArray(input.features) ? input.features.map(String).slice(0, 20) : [];
  if (!UUID.test(tenantId) || !(Number.isInteger(months) && months >= 1 && months <= 24) || features.some(code => !/^[a-z_]{1,40}$/.test(code))) {
    return json({ error: 'Richiesta non valida.' }, 400);
  }

  // As the user: the database checks the role, validates the modules and prices the plan.
  const asUser = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser(authorization.slice(7));
  if (userError || !userData.user) return json({ error: 'Sessione scaduta: accedi di nuovo.' }, 401);
  const { data: quote, error: quoteError } = await asUser.rpc('start_checkout', { p_tenant_id: tenantId, p_months: months, p_features: features });
  if (quoteError || !quote) return json({ error: quoteError?.message ?? 'Impossibile preparare il pagamento.' }, 400);

  try {
    // TODO: set mode to "subscription" if selling recurring products.
    const mode = 'payment' as 'payment' | 'subscription';

    // fixed_by_ui parameters (Checkout Studio) + this app's values. payment_method_collection
    // is only sent when mode is "subscription".
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
      success_url: `${domain}/pagamento/esito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/console/${quote.slug}/modules?pagamento=annullato`,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: quote.amount_cents,
          // Prices shown in the configurator are final: any tax is included.
          tax_behavior: 'inclusive',
          product_data: { name: `ItalFUT · ${quote.tenant_name}`, description: quote.description },
        },
      }],
      client_reference_id: quote.payment_id,
      metadata: { payment_id: quote.payment_id, tenant_id: quote.tenant_id },
      payment_intent_data: { metadata: { payment_id: quote.payment_id, tenant_id: quote.tenant_id } },
      locale: 'it',
    };
    if (mode === 'subscription') sessionParams.payment_method_collection = 'always';

    const session = await stripe.checkout.sessions.create(sessionParams as unknown as Stripe.Checkout.SessionCreateParams);

    // Link the Stripe session to the pending payment (service role: clients cannot write payments).
    const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: linkError } = await admin.from('payments').update({ stripe_session_id: session.id }).eq('id', quote.payment_id);
    if (linkError) throw linkError;

    return json({ url: session.url });
  } catch (error) {
    console.error('Checkout Session creation failed:', error);
    // In test mode Stripe's reason is shown to help the setup (e.g. Stripe Tax origin address missing).
    const testMode = (Deno.env.get('STRIPE_SECRET_KEY') ?? '').includes('_test_');
    const detail = testMode && error instanceof Error ? ` Dettaglio Stripe (modalità test): ${error.message}` : '';
    return json({ error: 'Impossibile avviare il pagamento. Riprova più tardi.' + detail }, 500);
  }
});
