// Supabase Edge Function: Stripe discount codes for the superadmin dashboard ("Codici sconto").
// Body: { action: 'list' } | { action: 'create', ... } | { action: 'set_active', id, active }.
// Only platform admins: the caller's token is checked with am_i_admin() in the database.
// Deploy with --no-verify-jwt (the session is verified here). Secrets: STRIPE_SECRET_KEY, DOMAIN.
import Stripe from 'npm:stripe@23.0.1';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
const domain = (Deno.env.get('DOMAIN') ?? '').replace(/\/$/, '');
const pickKey = (mapName: string, legacy: string) => {
  try { const map = JSON.parse(Deno.env.get(mapName) ?? '{}'); if (map.default) return String(map.default); } catch { /* not set */ }
  return Deno.env.get(legacy) ?? '';
};
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const publishableKey = pickKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
const cors = {
  'Access-Control-Allow-Origin': domain || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
const CODE = /^[A-Z0-9][A-Z0-9_-]{2,39}$/;

type Promo = {
  id: string; code: string; active: boolean; times_redeemed: number; max_redemptions: number | null;
  expires_at: number | null; created: number; first_time: boolean; minimum_cents: number | null;
  coupon: { id: string; name: string | null; percent_off: number | null; amount_off: number | null; valid: boolean } | null;
};
function shape(p: Stripe.PromotionCode): Promo {
  const c = p.promotion?.coupon && typeof p.promotion.coupon !== 'string' ? p.promotion.coupon : null;
  return {
    id: p.id, code: p.code, active: p.active, times_redeemed: p.times_redeemed, max_redemptions: p.max_redemptions,
    expires_at: p.expires_at, created: p.created, first_time: Boolean(p.restrictions?.first_time_transaction),
    minimum_cents: p.restrictions?.minimum_amount ?? null,
    coupon: c ? { id: c.id, name: c.name, percent_off: c.percent_off, amount_off: c.amount_off, valid: c.valid } : null,
  };
}
const stripeMessage = (error: unknown) => {
  const e = error as { type?: string; code?: string; message?: string };
  if (e?.code === 'resource_already_exists' || /already exists/i.test(e?.message ?? '')) return 'Esiste già un codice con questo nome: scegline un altro.';
  if (e?.type === 'StripeAuthenticationError') return 'Chiave Stripe non valida: controlla il secret STRIPE_SECRET_KEY su Supabase.';
  return e?.message ? 'Stripe: ' + e.message : 'Operazione non riuscita su Stripe.';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405);
  const key = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
  if (!key.startsWith('sk_') && !key.startsWith('rk_')) return json({ error: 'Pagamenti non configurati: manca il secret STRIPE_SECRET_KEY su Supabase.' }, 500);

  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return json({ error: 'Accedi per continuare.' }, 401);
  const asUser = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser(authorization.slice(7));
  if (userError || !userData.user) return json({ error: 'Sessione scaduta: accedi di nuovo.' }, 401);
  const { data: isAdmin } = await asUser.rpc('am_i_admin');
  if (isAdmin !== true) return json({ error: 'Accesso riservato al superadmin.' }, 403);
  const log = (action: 'stripe_create' | 'stripe_update', object: string, rowKey: unknown, after: unknown) =>
    asUser.rpc('admin_log_stripe', { p_action: action, p_object: object, p_key: rowKey, p_after: after });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Richiesta non valida.' }, 400); }
  const livemode = key.includes('_live_');

  try {
    if (body.action === 'list') {
      const list = await stripe.promotionCodes.list({ limit: 100, expand: ['data.promotion.coupon'] });
      return json({ livemode, codes: list.data.map(shape), has_more: list.has_more });
    }

    if (body.action === 'create') {
      const code = String(body.code ?? '').trim().toUpperCase();
      const kind = body.kind === 'amount' ? 'amount' : 'percent';
      const value = Number(body.value);
      const max = body.max_redemptions == null || body.max_redemptions === '' ? null : Number(body.max_redemptions);
      const expires = body.expires_at == null || body.expires_at === '' ? null : Number(body.expires_at);
      const minimum = body.minimum_cents == null || body.minimum_cents === '' ? null : Number(body.minimum_cents);
      const name = String(body.name ?? '').trim().slice(0, 40);
      if (!CODE.test(code)) return json({ error: 'Codice non valido: da 3 a 40 caratteri tra lettere, numeri, - e _.' }, 400);
      if (kind === 'percent' && !(Number.isFinite(value) && value > 0 && value <= 100)) return json({ error: 'Percentuale non valida: da 1 a 100.' }, 400);
      if (kind === 'amount' && !(Number.isInteger(value) && value >= 50 && value <= 100000)) return json({ error: 'Importo non valido: da 0,50 € a 1.000 €.' }, 400);
      if (max !== null && !(Number.isInteger(max) && max >= 1 && max <= 100000)) return json({ error: 'Utilizzi massimi non validi.' }, 400);
      if (expires !== null && !(Number.isInteger(expires) && expires > Date.now() / 1000 + 60)) return json({ error: 'La scadenza deve essere nel futuro.' }, 400);
      if (minimum !== null && !(Number.isInteger(minimum) && minimum >= 0 && minimum <= 1000000)) return json({ error: 'Importo minimo non valido.' }, 400);

      // Coupon: the discount itself, applied once to the whole order (prices are dynamic).
      const coupon = await stripe.coupons.create({
        duration: 'once',
        name: name || code,
        ...(kind === 'percent' ? { percent_off: Math.round(value * 100) / 100 } : { amount_off: value, currency: 'eur' }),
        metadata: { source: 'italfut-admin' },
      });
      // Promotion code: what customers type in Stripe Checkout.
      const promo = await stripe.promotionCodes.create({
        promotion: { type: 'coupon', coupon: coupon.id },
        code,
        ...(max !== null ? { max_redemptions: max } : {}),
        ...(expires !== null ? { expires_at: expires } : {}),
        restrictions: {
          ...(body.first_time ? { first_time_transaction: true } : {}),
          ...(minimum ? { minimum_amount: minimum, minimum_amount_currency: 'eur' } : {}),
        },
        metadata: { source: 'italfut-admin' },
        expand: ['promotion.coupon'],
      }).catch(async (error) => {
        await stripe.coupons.del(coupon.id).catch(() => undefined); // do not leave orphan coupons
        throw error;
      });
      const shaped = shape(promo);
      await log('stripe_create', 'promotion_code', { id: promo.id, code }, shaped);
      return json({ livemode, code: shaped });
    }

    if (body.action === 'set_active') {
      const id = String(body.id ?? '');
      if (!/^promo_[A-Za-z0-9]+$/.test(id)) return json({ error: 'Codice non valido.' }, 400);
      const promo = await stripe.promotionCodes.update(id, { active: Boolean(body.active), expand: ['promotion.coupon'] });
      const shaped = shape(promo);
      await log('stripe_update', 'promotion_code', { id, code: promo.code }, { active: promo.active });
      return json({ livemode, code: shaped });
    }

    return json({ error: 'Azione non valida.' }, 400);
  } catch (error) {
    console.error('admin-promotions failed:', error);
    const invalid = (error as { type?: string })?.type === 'StripeInvalidRequestError';
    return json({ error: stripeMessage(error) }, invalid ? 400 : 502);
  }
});
