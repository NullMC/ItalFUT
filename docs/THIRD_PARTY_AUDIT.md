# ItalFUT — Third-party SDK, network and storage audit (2026-11-01)

This is a **code-level** inventory, not a network-level production certification.

## Runtime dependencies (package.json)

| Package / family | Purpose | Tracking? | Action |
| --- | --- | --- | --- |
| React / react-dom / react-router-dom | UI and navigation | None built in | Keep and patch |
| Material UI / Emotion | Accessible components and styles | None built in | Keep and patch |
| Motion | Interaction animations | None built in | Keep reduced-motion branch |
| @supabase/supabase-js | Database API and auth sessions | Authentication and technical session state | Document provider, DPA, retention, regions |
| Tailwind | Build-time CSS | No runtime tracking | Keep |
| Vite / TypeScript | Toolchain | Not a production tracker | Build only |

**Not present in application runtime:** Google Analytics, Meta Pixel, Hotjar, Sentry, Stripe JS, Facebook Login, social analytics, ad SDKs or marketing pixels. Future additions require a new audit and, where necessary, prior opt-in.

### Removed in this revision

- `index.html` previously connected to `fonts.googleapis.com` and `fonts.gstatic.com`. This request is removed to avoid contacting Google Fonts before any user choice. Styles now fall back to installed/system typefaces; supply properly licensed self-hosted fonts later if brand fidelity requires it.
- No Google/third-party font Javascript has been added.
- The old remote Wikimedia stadium photograph in the landing hero had already been removed in favor of a local WebGL shader.

### Device storage and purposes

- `sb-...-auth-token`: browser persistence used by Supabase Auth while signed in (technical/essential to persistent authentication).
- `italfut-appearance`: theme preference, localStorage.
- `italfut_configuration`: provisional requested modules and duration, sessionStorage.
- `italfut_cookie_notice_v1`: technical acknowledgement of the information banner, localStorage. It is **not** consent to tracking.

The cookie banner is informational only while no nonessential SDKs are installed. Do not add optional script loads without designing a genuine opt-in CMP and blocking them until granted.

### Remaining non-SDK external calls requiring operator review

- Supabase REST/Auth/Edge Functions calls, accessible to logged-in users as required. Verify provider agreements, EU data region, backups and log retention.
- Organizers can input external URLs for player/team/sponsor images, cover backgrounds, article media and external galleries. Loading remote images exposes IP/network metadata to those **independent providers**. Referrer Policy `no-referrer` is applied to `<img>` elements, but it does not hide the user's IP from the server supplying the image.
- External galleries and sponsor websites are user-provided links, subject to external operators. Recommend hosted media under a vetted domain or an image proxy, documented source owners, and opt-in where legally required.
- The actual production web host, DNS/CDN, observability logs and any server-added scripts are **not identifiable in this repository**. They must be audited against DevTools Network, the hosting control panel, and the deployed HTML.

### When introducing payment/analytics/support SDKs

1. Record product, version, exact purposes, DPA, storage region, retention and transfer mechanism.
2. Update `src/pages/Legal.tsx`, `src/config/legal.ts` and the legal documents.
3. Block optional SDK initialization until explicit, revocable opt-in; provide same prominence for rejection.
4. Add CSP / referrer-policy and isolate API secrets from frontend bundles.
5. Test first-load network requests without consent and browser session/anonymous state.
