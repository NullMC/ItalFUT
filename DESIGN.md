# ItalFUT — Design system “Floodlight”

Stadium at night (dark) / matchday paper (light). Minimal surfaces, one luminous accent, cinematic depth only where it earns attention.

## Foundations
- **Tokens:** `src/styles/tokens.css` — every colour, radius, glass and shadow value, defined for both themes. Components never hard-code theme colours.
- **Type pairing:** Geist (UI, headings, body) · Instrument Serif *italic* for one emotional accent per heading · Big Shoulders Display for scores, numbers and the `FUT` of the wordmark. All self-hosted via Fontsource.
- **Accent:** pitch lime `#c6f36a` (dark) / pine `#0f6b4a` (light). Primary buttons: lime on dark, ink on light.
- **Logo:** the wordmark *ital*FUT is the logo — no pictogram.
- **No filler:** no eyebrows, fake social proof, decorative counters or invented data. Illustrations use clearly-labelled demo data.

## Materials & motion
- **Liquid glass** (`.glass`): backdrop blur + saturation, gradient rim via mask, specular inset light. Used for the floating navbar, cards, panels, dialogs, cookie banner. Falls back to solid surfaces with `prefers-reduced-transparency`.
- **Shaders:** `src/components/fx/` — Paper `MeshGradient` + `GodRays` (the engine behind 21st.dev shader heroes), lazy-loaded, paused offscreen, frozen for reduced motion/Save-Data, CSS gradient fallback without WebGL. Glowing light points (`GlowField`) and film grain on top.
- **3D:** CSS-3D tilted phone (interactive demo, straightens on hover/focus), real-time WebGL football (`Football3D`, draggable), CSS-3D pitch in “Come funziona” with a scroll-driven ball.
- **Motion:** word-by-word blur reveal for headlines, blur-up section reveals, spotlight hover on cards, shared-layout pills (nav, durations, tabs), circular View-Transition theme switch. Everything collapses under `prefers-reduced-motion`.

## Composition (impeccable.style principles)
One idea per section · strong editorial headline + one supporting line · a single focal object per viewport · generous negative space · dense, calm work surfaces in the console.

## 21st.dev references adapted
Shader Hero / Mesh drift / Aurora (backgrounds), Glassmorphism Navigation & Floating Nav (navbar), Spotlight Card & Feature Grid (bento), Animated Tabs (pills), Theme Switch, Text Effect blur-in, admin/analytics dashboard templates (sidebar + KPI + chart cards), split authentication templates. Code is original or adapted to this stack (React 19 + MUI 7 + Motion), not copied wholesale.

## Responsive & accessibility
Breakpoints 1020 / 900 / 640 / 560 px; tested at 390 and 1440. Mobile nav becomes a glass sheet, console sidebar becomes a chip bar, sticky scroll scenes become linear. WCAG 2.1 AA: axe-core clean on all main routes in both themes, visible focus rings, skip link, labelled controls, ≥44px targets, keyboard-operable demo phone and tabs.

## Scroll containers and data views (Nov 2026)

- **Never a hard cut.** Every horizontal or vertical scroller uses `ScrollRail` (`src/components/ScrollRail.tsx`): breathing room on the cross axis (focus rings, borders and shadows are not clipped), fades only on the sides that hide content, active item brought into view. Do not add `overflow-x: auto` to a bordered pill or card directly: wrap a rail inside it.
- **Grid children shrink.** Tracks that hold charts, tables or wide visuals use `minmax(0, 1fr)` and the children `min-width: 0`, otherwise min-content widths push content out of the card.
- **Dashboards** follow the 21st.dev dashboard/admin templates (Settle, Studio Admin): workspace header with context line and actions, attention banner, KPI cards with insight line + sparkline/progress, main chart with range control and metric strip, right rail (stacked status bar, timeline).
- **Tables** use `DataTable` (`src/components/DataTable.tsx`): one card with toolbar (search, segmented and select filters, count), sortable uppercase headers, status pills, numbered pagination; rows become cards under 640px. Secondary columns (`hideOnMobile`) disappear under 1180px.
