# Stripe integration — TODO

Hosted Stripe Checkout: the organizer is redirected to a Stripe-hosted payment page.
The server side runs as **Supabase Edge Functions** (the project's only backend besides
Cloudflare Pages), so no new hosting provider was added. The integration is complete in
code and stays **off** until `VITE_PAYMENTS_ENABLED=true` is set for the frontend.

## Values to Replace

The following values are placeholders and must be updated before going live.

**Files containing placeholders:**
- [supabase/functions/.env.example](supabase/functions/.env.example) (local runs only; in production these are Supabase secrets)
- [.env.example](.env.example) (`VITE_PAYMENTS_ENABLED`)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| mode | payment | Set to "payment" for one-time charges or "subscription" for recurring billing. `payment` is what ItalFUT sells: 1 to 24 months (presets 1/3/6/12 or a custom number) paid once, no automatic renewal. Changing it needs a different fulfillment. |
| STRIPE_SECRET_KEY | sk_test_... | Secret key of your Stripe sandbox (later the live key). Supabase secret only: never `VITE_`, never in git, never in chat. |
| STRIPE_WEBHOOK_SECRET | whsec_... | Signing secret of the webhook destination (Setup step 6). |
| DOMAIN | http://localhost:5173 | Public address of the site without a trailing slash, e.g. `https://italfut.it`. Used for `success_url`, `cancel_url` and as the allowed CORS origin. |
| VITE_PAYMENTS_ENABLED | false | `true` in Cloudflare Pages (and `.env.local` for local tests) once steps 1–7 are done. |

There are no `price_...` placeholders: each Checkout Session uses `price_data` with the amount
computed by the database (`quote_plan`), so no Products or Prices have to be created in Stripe.
`success_url` → `/pagamento/esito?session_id={CHECKOUT_SESSION_ID}`, `cancel_url` → the tournament's
plan page (`/console/<slug>/modules?pagamento=annullato`); both are already real routes.

## Configured Parameters

These parameters were configured in Checkout Studio and are already set correctly.

**Files containing these parameters:**
- [supabase/functions/create-checkout-session/index.ts](supabase/functions/create-checkout-session/index.ts)

| Parameter | Value |
|-----------|-------|
| ui_mode | hosted_page (Stripe SDK `npm:stripe@23.0.1`, which is ≥ 21.0.0) |
| billing_address_collection | auto |
| phone_number_collection | { enabled: false } |
| automatic_tax | { enabled: true } |
| allow_promotion_codes | true |
| payment_method_collection | always (sent only when `mode` is "subscription") |
| submit_type | auto |
| name_collection | { individual: { enabled: true, optional: true } } |
| integration_identifier | hosted_web_0001 |
| origin_context | web |

## Setup

1. **Stripe account and sandbox.** In the Stripe Dashboard open the account picker → **Sandboxes** → create one. Copy its secret key (Developers → API keys, `sk_test_...`). The publishable key is not used: Checkout is a redirect.
2. **Stripe Tax.** `automatic_tax` is on: in the sandbox go to Settings → Tax, set the origin (head office) address and the registrations you have. Without it, Checkout Session creation fails. Stripe Tax has its own fee: https://stripe.com/tax/pricing
3. **Database.** Supabase → SQL Editor, in this order (skip those already run): `202611060001_tenant_media.sql`, `202611070001_stripe_payments.sql` (payments table, `start_checkout`, `fulfill_payment`, `mark_payment`, publication tied to the paid period), `202611080001_custom_duration.sql` (1–24 months, `save_plan`), `202611090001_event_tournaments.sql` (free one-day tournaments, see below), `202611100001_promotion_codes.sql` (discount recorded on each payment, audit of the discount-code actions).
4. **Secrets in Supabase** (Dashboard → Edge Functions → Secrets, or the CLI):
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_... DOMAIN=https://your-domain
   ```
   For local runs copy `supabase/functions/.env.example` to `supabase/functions/.env` (git-ignored).
5. **Deploy the functions** (Supabase CLI, `supabase login` + `supabase link --project-ref <ref>`):
   ```bash
   supabase functions deploy create-checkout-session --no-verify-jwt   # verifies the user's session in code
   supabase functions deploy stripe-webhook --no-verify-jwt            # Stripe sends no Supabase JWT; the signature is verified in code
   supabase functions deploy admin-promotions --no-verify-jwt          # superadmin “Codici sconto”; checks am_i_admin() in code
   ```
6. **Webhook destination.** Stripe Dashboard → Workbench → Webhooks → Add destination → “Your account”:
   URL `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`, events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.
   Copy the signing secret and run `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`.
7. **Turn payments on in the app.** Cloudflare Pages → project → Settings → Variables and Secrets → add `VITE_PAYMENTS_ENABLED` = `true` (Production and Preview) → redeploy. It is a build-time variable: it only takes effect after a new build.
8. **Dependencies:** none to install. Deno downloads `npm:stripe@23.0.1` at deploy time. The Stripe API version is not pinned in code (account default).
9. **CSP:** no change needed. Checkout is a full-page navigation to `checkout.stripe.com`, and the function is called on `*.supabase.co`, already allowed in `public/_headers`.

## Project structure

```
supabase/migrations/202611070001_stripe_payments.sql  # payments ledger, pricing, fulfillment, publication rules
supabase/functions/
  .env.example                       # server-only secrets template
  create-checkout-session/index.ts   # POST {tenant_id, months, features} → { url } of a new Checkout Session
  stripe-webhook/index.ts            # verifies the signature, fulfills / marks payments
src/lib/payments.ts                  # paymentsEnabled flag, startCheckout(), status labels
src/components/PlanCheckout.tsx      # console → Moduli: plan status, duration, modules, total, pay button, history
src/pages/PaymentResult.tsx          # /pagamento/esito: waits for the webhook and shows the outcome
src/admin/adminConfig.ts             # superadmin “Pagamenti” tab (read only)
src/admin/PromoCodes.tsx             # superadmin “Codici sconto” (Stripe promotion codes)
supabase/functions/admin-promotions/ # list / create / switch off discount codes in Stripe (admins only)
```

## How it works

1. An owner/admin opens **Console → Moduli** (new tournaments land there right after creation). The plan chosen in the configurator is saved with the tournament (`plan_quotes`, created by `create_tenant`) and every change of duration or modules is saved again (`save_plan`, migration `202611080001`). They adjust it if needed and click **Paga**. The app calls the function with the user's session:
   ```ts
   const { data } = await client().functions.invoke('create-checkout-session', { body: { tenant_id, months, features } });
   window.location.assign(data.url);
   ```
2. `create-checkout-session` verifies the session, then calls `start_checkout` **as the user**: the database checks the role (owner/admin), validates the modules, rate-limits and prices the plan with `quote_plan`, and inserts a `pending` row in `payments`. The function creates the Checkout Session with that amount (`price_data`, tax inclusive), `client_reference_id` / `metadata.payment_id`, and links `stripe_session_id` to the row.
3. The organizer pays on the Stripe-hosted page and returns to `/pagamento/esito`, or to the plan page if they leave (`?pagamento=annullato`).
4. Stripe sends `checkout.session.completed` to `stripe-webhook`. After verifying the signature it calls `fulfill_payment` (service role only, idempotent): it checks the amount, marks the payment `paid`, extends `subscriptions.period_end` from the current expiry (or now), extends the purchased `tenant_features`, and publishes a draft tournament. Delayed methods are fulfilled on `async_payment_succeeded`; `async_payment_failed`, `expired` and full refunds mark the row `failed` / `expired` / `refunded`.
5. The public site of a tournament is visible to visitors only while its paid period is active (tournaments published manually and never paid stay visible). Staff always see it.

Refunds are made from the Stripe Dashboard. A refund marks the payment `refunded` but does not switch modules off: do that from the superadmin if needed.

## One-day tournaments (free)

Tournaments with `tenants.kind = 'event'` (migration `202611090001`) use the core platform for free. Only extra modules are paid, through the same Checkout flow: `start_checkout` prices them at their 1-month price each (no base fee, modules already active are skipped), and `fulfill_payment` turns them on with no end date. No subscription is created and the tournament is not published by the payment: the organizer publishes it for free from the event day (`publish_event`), then has 48 hours to edit before the console closes.

## Discount codes (superadmin → “Codici sconto”)

`allow_promotion_codes` is on, so Stripe Checkout shows the “Aggiungi codice promozionale” field. The superadmin tab creates codes in Stripe through the `admin-promotions` Edge Function (platform admins only): a **coupon** (percent or fixed € amount, `duration: once`, applied to the whole order) and a **promotion code** (the text customers type) with optional maximum uses, expiry date and minimum order amount. Codes can be switched off and on again; deleting them for good is done in the Stripe Dashboard. Codes created in the Dashboard also appear in the tab.

Fulfillment is unaffected: the amount check uses the subtotal before discounts, so discounted (even 100 %) payments are accepted. The webhook stores `discount_cents` and `promotion_code` on the payment (superadmin → Pagamenti). Test and live modes have separate codes: recreate them after switching to live keys.

## Troubleshooting

| Message in the app | Cause |
|---|---|
| “Pagamenti non ancora attivi: la funzione create-checkout-session non è pubblicata su Supabase.” | Setup step 5 not done (Supabase answers 404). |
| “Pagamenti non configurati: manca il secret …” | Setup step 4: `STRIPE_SECRET_KEY` or `DOMAIN` missing. |
| “Servizio di pagamento non raggiungibile…” | Network error or CORS: `DOMAIN` must be exactly the address the site is opened from (e.g. `http://localhost:5173`). |
| “Impossibile avviare il pagamento… Dettaglio Stripe (modalità test): …” | Stripe refused the session; the detail (test keys only) says why, e.g. Stripe Tax origin address missing (step 2). |
| “Durata non supportata” / “Configurazione: Non salvata” | Migration `202611080001_custom_duration.sql` not run yet. |

## Testing

Use the sandbox keys only. Test cards (any future expiry date, any CVC, any postcode):

| Card | Result |
|------|--------|
| 4242 4242 4242 4242 | Payment succeeds |
| 4000 0025 0000 3155 | Requires 3D Secure authentication |
| 4000 0000 0000 9995 | Declined (insufficient funds) |

Checklist: pay with 4242 → `/pagamento/esito` shows “Pagamento completato”, the tournament is online and the payment appears in Console → Moduli and Superadmin → Pagamenti. Stripe Dashboard → Webhooks shows the deliveries with status 200; Supabase → Edge Functions → Logs shows `fulfill_payment`.
Local runs: `supabase functions serve --env-file supabase/functions/.env --no-verify-jwt` and `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`.
More cards: https://docs.stripe.com/testing

## Next steps

- **Going live.** Activate the Stripe account (business details, bank account), then repeat steps 2, 4 and 6 in live mode: live secret key `sk_live_...`, live Stripe Tax settings, a live webhook destination with its own `whsec_...`. Re-deploying the functions is not needed (secrets are read at runtime).
- **Promotion codes.** `allow_promotion_codes` is on: create coupons/codes in the Dashboard if you want them. The amount check uses the subtotal before discounts, so discounted payments are accepted.
- **Receipts.** Settings → Customer emails: turn on “Successful payments” so Stripe emails the receipt (the app sends no email).
- **Legal pages.** With payments on, privacy, terms, refunds and cookies already mention Stripe: review them with your details before taking real payments.

## Resources

- https://support.stripe.com
- https://docs.stripe.com/mcp
- https://docs.stripe.com/payments/checkout
- https://docs.stripe.com/tax/checkout
- https://supabase.com/docs/guides/functions/examples/stripe-webhooks
