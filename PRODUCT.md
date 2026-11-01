# ItalFUT — Product brief

ItalFUT is an Italian-language multitenant SaaS for football competitions. Organizers independently customize their platform, publish matches, teams and standings, and can buy only the additional features they need.

The public information architecture comprises a marketing site, pricing configurator, sign-in, organizer console, private tenant administration and independent public tenant site at /t/:slug.

Primary users are tournament organizers, sports associations, amateur teams and spectators. The principal competitor is Copa Fácil; StreetLeagueWebsite provides product feature inspiration but not an architectural blueprint.

Commercial entitlements are always verified on the server. At initial release, prices are illustrative and Stripe does not charge customers. New organizations start in draft status; base modules are available to their owners for editing, with paid extra features pending administrative approval. Multiple users and tenants are isolated through Postgres RLS and composite foreign keys.

First release scope is a functional product foundation, not a production-paid SaaS until Stripe billing, legal review of the drafted policies, global admin and load testing are completed. Legal pages, consent, data export and self-service deletion are implemented; operator data is pending (docs/MANUAL_INFO_CHECKLIST.md).
