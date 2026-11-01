# ItalFUT — visual system (football editorial)
The design language is European football editorial + a disciplined competition operations desk.
Do not imitate a videogame or an esports overlay. Marketing persuades; admin screens prioritize speed and clarity.

- Colors: stadium pine #102b24 / evergreen #173d32, warm off-white #f5f6f1, white #fff, ink #142b24, muted #52665d, pitch-lime #c6e978 reserved for meaningful CTAs, selections and match emphasis.
- Type: Barlow Condensed 600–800 for large editorial headings and score displays; DM Sans for UI, body, field labels and dense admin data. Never use compressed display face for small controls.
- Above-the-fold marketing: one concise proposition, primary action, and a genuinely useful representative match/standings snapshot marked as illustrative. No eyebrow, fake social proof, decorative counters, orbit, floating pseudo-cards or gradients on lettering.
- Information architecture: capability rows, simple optional-modules catalog, short setup explanation. Each section has one purpose.
- App surfaces: clear route titles, line-separated lists and neutral work areas; status, module grants, actions and error states are visible without repeating prose. Dense data over decorative metrics.
- Public tenant sites: their name and identity lead; compact fixture rows, visible scores and readable rankings. Only show real published data and real navigation.
- Accessibility: semantic sections, skip link, keyboard focus, aria-pressed for duration selection, 44px controls, legible contrast, reduced motion, horizontally scrollable data tables and navigation. Mobile is not a scaled-down desktop.
- Responsive: 1200+ spacious editorial split hero, 900px single-column work surfaces, 640px compact mobile scoreboard and linear content flow.
- No fake commerce: draft tenants are clearly draft, pricing illustrative until payments are connected. Source of entitlement truth remains Supabase.

## 21st.dev integration / 2026-11-01
Visual foundations: adapted from **Green Notes** by massimobuonfrate01
https://21st.dev/community/themes/green-notes-1783614187319
- Warm parchment #e9e4d8, creamy work surface #f4efe4, border #d2cbbb, evergreen #0f7058.
- ItalFUT retains pitch-lime #c6e978 for primary football CTA and pine hero. Tokens are surfaced as --if-* and Tailwind --color-*.
- `src/styles.community.css` is the source of the final-stage color and interaction overrides.

Component patterns adapted from the actual catalog code:
- **Animated Tabs**, educalvolpz, https://21st.dev/@educalvolpz/components/animated-tabs — `src/components/AnimatedTabs.tsx`, React 19 and Motion shared layout, accessible keyboard navigation. Used in interactive illustrative scoreboards and actual public competition filters.
- **Accordion 01**, designali-in, https://21st.dev/@designali-in/components/accordion-01-1 — `src/components/FeatureAccordion.tsx`, translated from Radix into the existing MUI stack. Used to progressively disclose optional modules without decorative cards.
- Motion (motion/react): one relevant active-state shared-element movement; 120–300ms transitions, reduced-motion paths. No autoplay or animated content that prevents use.

Impeccable composition constraints:
- Persuade (marketing): prominent claim + functional preview; capability section is editorial anchored lead plus lean list; addons use one useful disclosure list; steps communicate ordered action.
- Operate (admin): no nonessential page-load movement. State transitions only, preserved focus and touch sizes.
- Read (public competition): football results, standings, and competition selection take priority; no invented stats or simulated live content.

## Responsive Glass + Dual Theme (2026-11-01)

Template selected via 21st.dev: **Modernize Free React MUI Dashboard** (AdminMart, MIT, React/Vite/MUI). Source:
https://21st.dev/community/templates/modernize-free-react-mui-dashboard
https://github.com/adminmart/modernize-react-lite
The template was **adapted in composition and behavior** to ItalFUT; no Next.js rewrite, no premium purchase and no wholesale template source copied.

21st component references and scope of adaptation:
- Glass Card — https://21st.dev/@educalvolpz/components/glass-card (material inspiration, CSS-only refractive edge, glass fallback)
- Glassmorphism Navigation — https://21st.dev/@akashsingh890901-crypto/components/glassmorphism-navigation (navbar material, sticky glass)
- Theme Switch — https://21st.dev/@zweiundeins/components/theme-switch (persistent dark/light mode; custom MUI switch)
- Advanced Stats — https://21st.dev/@uilayout.contact/components/advanced-stats (real tenant analytics composition)
- Charts & KPI Cards — https://21st.dev/@uvain/components/revenue-charts-kpi (readable metric/header scale; no fabricated revenue)
- Feature Grid — https://21st.dev/@lavikatiyar/components/feature-grid (responsive hover grid)
- Floating Label — https://21st.dev/@ddoemonn/components/floating-label (focused form field rhythm; native MUI text fields)
- Existing source-adapted Animated Tabs and Accordion 01 remain implemented directly in the app.

Theme architecture:
- `src/components/AppearanceProvider.tsx` creates the MUI theme and writes `data-theme` to `html`.
- Local preference stored under `italfut-appearance`, starts with system setting if missing.
- `src/styles.glass.css` owns light/dark tokens and overrides for landing, pricing, auth, console, dialog, editor, public tournament pages and responsive states.
- Every route uses a visible `ThemeToggle` in the main header or dedicated tournament header.
- `src/components/TenantAnalytics.tsx` queries the tenant's own records; counts and progress bars represent actual statuses.
- Dynamic backgrounds are lightweight CSS gradients, not expensive looping shader canvases; blur is reduced on mobile and removed when user prefers reduced transparency.
- Validate at 320, 375, 768, 1024 and 1440px. Mobile nav overflow is horizontal only where content genuinely needs it. Accessibility: focus ring, native form labels, visible selected states, no automatic audio and reduced-motion variant.

## Landing photo hero / 2026-11-01
- Replaced the illustrative split-screen scoreboard with a single editorial left-aligned photo hero.
- Stadium photo by Mario Klassen (Volksparkstadion), CC0: https://commons.wikimedia.org/wiki/File:Well_lit_soccer_stadium_(Unsplash).jpg
- Photo uses a remote Wikimedia 1280px rendition, with a dark gradient behind white copy.
- The lower fade derives directly from `--itf-surface` (the following feature-section background), automatically matching dark and light themes; the photo overlay remains separate from the fade.
- Full-width single-column on every breakpoint; copy is max-width constrained and always readable; no illustrative data are mounted.
