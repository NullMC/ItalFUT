# Stripe integration — TODO

Hosted Stripe Checkout: the organizer is redirected to a Stripe-hosted payment page.
The server side runs as **Supabase Edge Functions** (the project's only backend besides
Cloudflare Pages), so no new provider was added.

## Values to Replace

The following values are placeholders and must be updated before going live.

**Files containing placeholders:**
- [supabase/functions/create-checkout-session/index.ts](supabase/functions/create-checkout-session/index.ts)
- [supabase/functions/.env.example](supabase/functions/.env.example)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| mode | payment | Set to "payment" for one-time charges or "subscription" for recurring billing. `payment` matches today's configurator (1/3/6/12 months, no automatic renewal). If you switch to `subscription`, `payment_method_collection: "always"` is added automatically. |
| success_url | `${DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}` | Your actual post-payment success page URL. Keep the {CHECKOUT_SESSION_ID} template. The app has no `/success` route yet (it shows the 404 page): add one or point this to an existing page, e.g. `/console`. |
| cancel_url | `${DOMAIN}` | Your actual cancel/return page URL, e.g. `${DOMAIN}/configura`. |
| line_items[].price | price_... | Your actual Stripe Price ID from the Dashboard (https://dashboard.stripe.com/prices) or API. ItalFUT prices depend on plan, modules and duration: see “Next steps”. |
| STRIPE_SECRET_KEY | sk_test_... | Secret key of your Stripe sandbox (later the live key). Server-only: never `VITE_`. |
| STRIPE_WEBHOOK_SECRET | whsec_... | Signing secret of the webhook endpoint (see Setup step 4). |
| DOMAIN | http://localhost:5173 | Public address of the site, e.g. `https://italfut.it`. Also used as the allowed CORS origin. |

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

1. **Stripe account and sandbox.** Create a Stripe account, open **Sandboxes** in the Dashboard account picker and create one. Copy its secret key (Developers → API keys). The browser never needs the publishable key: Checkout is a redirect.
2. **Stripe Tax.** `automatic_tax` is enabled: in the sandbox go to Settings → Tax and set the origin address (and registrations), otherwise Checkout Session creation fails.
3. **Secrets in Supabase** (Dashboard → Edge Functions → Secrets, or the CLI):
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_... DOMAIN=https://your-domain
   ```
   For local runs copy `supabase/functions/.env.example` to `supabase/functions/.env` (git-ignored).
4. **Deploy the functions** (Supabase CLI, logged in and linked to the project):
   ```bash
   supabase functions deploy create-checkout-session
   supabase functions deploy stripe-webhook --no-verify-jwt   # Stripe sends no Supabase JWT; the signature is verified in code
   ```
5. **Webhook endpoint.** Stripe Dashboard → Workbench → Webhooks → Add destination:
   URL `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`, event `checkout.session.completed`.
   Copy the signing secret and run `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`.
6. **Dependencies:** none to install. Deno downloads `npm:stripe@23.0.1` at deploy time. The Stripe API version is not pinned in code (account default).
7. **CSP:** no change needed. Checkout is a full-page navigation to `checkout.stripe.com`, and the function is called on `*.supabase.co`, already allowed in `public/_headers`.

## Project structure (new files)

```
supabase/functions/
  .env.example                       # server-only secrets template
  create-checkout-session/index.ts   # POST → { url } of a new Checkout Session
  stripe-webhook/index.ts            # verifies the Stripe signature, handles checkout.session.completed
STRIPE_INTEGRATION_TODO.md           # this file
```

## How it works

1. A signed-in organizer clicks a pay button in the app (not added yet, see “Next steps”). The app calls the function with the user's session:
   ```ts
   const { data, error } = await client().functions.invoke('create-checkout-session');
   if (!error && data?.url) window.location.assign(data.url);
   ```
2. `create-checkout-session` (the Supabase gateway rejects requests without a valid user JWT) creates the Checkout Session and returns its URL.
3. The organizer pays on the Stripe-hosted page and returns to `success_url`, or to `cancel_url` if they leave.
4. Stripe sends `checkout.session.completed` to `stripe-webhook`. The function verifies the signature and today only logs the event: fulfillment is the next step.

## Testing

Use the sandbox keys only. Test cards (any future expiry date, any CVC, any postcode):

| Card | Result |
|------|--------|
| 4242 4242 4242 4242 | Payment succeeds |
| 4000 0025 0000 3155 | Requires 3D Secure authentication |
| 4000 0000 0000 9995 | Declined (insufficient funds) |

Forward webhooks to a local run with the Stripe CLI: `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`, then `stripe trigger checkout.session.completed`.
More cards: https://docs.stripe.com/testing

## Next steps

- **Products and prices.** Create a Product per item (base platform and each module) with prices for 1/3/6/12 months, or compute the amount on the server with `quote_plan` and send `price_data`. Never trust a price sent by the browser.
- **Link the payment to the tournament.** Send the tournament id and selected modules from the app, validate them in the function (the user must be owner/admin of the tournament), and attach them to the session (e.g. `client_reference_id`, `metadata`).
- **Fulfillment.** In `stripe-webhook`, with a service-role Supabase client: insert the payment in `public.subscriptions` (it already has `stripe_customer_id` / `stripe_subscription_id`), set `period_start` / `period_end`, and enable the purchased rows in `tenant_features`. Make it idempotent (the same event can arrive twice).
- **UI.** Add the pay button in the configurator / console modules page, a success page reading `session_id`, and a payments tab in the superadmin.
- **Order tracking.** Show payment status and period end in the console; handle `checkout.session.expired` and refunds (`charge.refunded`).
- **Legal pages.** Update terms, refunds and privacy (Stripe as payment processor) before taking real payments. Live mode needs the Stripe account activation with your details.

## Resources

- https://support.stripe.com
- https://docs.stripe.com/mcp
- https://docs.stripe.com/payments/checkout
- https://supabase.com/docs/guides/functions/examples/stripe-webhooks
