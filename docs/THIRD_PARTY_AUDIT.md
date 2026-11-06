# ItalFUT — Third-party SDK, network & storage audit (2 Nov 2026)

Code-level inventory. Re-check with DevTools → Network on the deployed site after every release.

## Runtime dependencies

| Package | Purpose | Tracking | Notes |
| --- | --- | --- | --- |
| react, react-dom, react-router-dom | UI and routing | None | — |
| @mui/material, @emotion/* | Accessible form controls, dialogs | None | Icons tree-shaken per import |
| motion | Animations (honours reduced motion) | None | — |
| @supabase/supabase-js | Database, auth, edge functions | Session storage only | DPA + region to confirm |
| @paper-design/shaders-react | WebGL backgrounds (same engine as 21st.dev shader heroes) | None, no network | Lazy-loaded chunk |
| @fontsource-variable/geist, @fontsource/instrument-serif, @fontsource-variable/big-shoulders-display | Self-hosted fonts (OFL) | None | Served from our own domain — no Google Fonts request |

Removed in this revision: `tailwindcss`, `@tailwindcss/vite` (one utility class used), legacy `CinematicShader`, `FeatureAccordion`, seven overlapping stylesheets.

**Not present:** Google Analytics, Meta Pixel, Hotjar, Sentry, Stripe.js, social login SDKs, ad networks.

**Server only (Supabase Edge Functions):** `npm:stripe@23.0.1` in `create-checkout-session` and `stripe-webhook`. The browser never loads Stripe code: payment is a redirect to Stripe's hosted Checkout page.

## Infrastructure

Only two providers: **Cloudflare** (registrar, DNS, CDN, Pages hosting) and **Supabase** (Postgres, Auth, SQL functions, Storage for uploaded tournament images). No email service: users are username + password only, recovery uses one-time codes, requests are stored in `support_requests`. Cloudflare Web Analytics, Rocket Loader, Email Obfuscation and Zaraz must stay off. **Stripe** (payments) is integrated with hosted Checkout and switched on by `VITE_PAYMENTS_ENABLED=true`: card data is entered on `checkout.stripe.com` and never reaches ItalFUT; the `payments` table stores amount, status, period and Stripe ids. No CSP change is needed (top-level navigation, no Stripe.js). Stripe's own cookies live on Stripe's domain and are referenced in the cookie policy.

## Browser storage

| Key | Type | Purpose | Category |
| --- | --- | --- | --- |
| `sb-<ref>-auth-token` | localStorage | Supabase session | Necessary |
| `italfut-appearance` | localStorage | Theme choice | Functional/technical |
| `italfut_consent_v2` | localStorage | Cookie choices + date (expires after 6 months) | Necessary |
| `italfut_configuration` | sessionStorage | Configurator draft | Necessary |
| `__cf_bm` | Cookie (Cloudflare) | Bot protection, only if enabled, 30 min | Necessary |

## Network calls on first load

Only the site's own origin. Supabase is contacted when a page reads data or a user signs in.
Tournament pages may load images from URLs entered by organisers (https only, `referrerpolicy="no-referrer"`).

## Adding a new SDK

1. Document vendor, purpose, data, region, retention and DPA here and in `src/pages/Legal.tsx`.
2. Add it to `OPTIONAL_SERVICES` in `src/components/CookieNotice.tsx` and load it only when `allows('analytics')` is true.
3. Extend the CSP in `public/_headers`.
