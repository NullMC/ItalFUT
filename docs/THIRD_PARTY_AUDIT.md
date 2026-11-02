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

## Infrastructure

Only two providers: **Cloudflare** (registrar, DNS, CDN, Pages hosting) and **Supabase** (Postgres, Auth, Edge Functions, service emails). Cloudflare Web Analytics, Rocket Loader, Email Obfuscation and Zaraz must stay off. A production SMTP for auth emails is the only additional service that may be required.

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
