# ItalFUT

ItalFUT è una piattaforma SaaS multi-tenant per la gestione dei tornei di calcio, sviluppata con React 19, TypeScript, React Router 7, Material UI 7, Motion, shader WebGL (Paper) e Supabase.

**Stato:** fondazione applicativa pre-pagamenti. Non è collegata automaticamente a un progetto Supabase live; Stripe non è ancora operativo. Ogni nuovo spazio nasce in bozza, con i moduli base per la preparazione dei contenuti.

## Funzionalità disponibili

- Landing page ItalFUT responsive, sezioni prodotto, CTA e demo visiva esplicitamente illustrativa.
- Configuratore durata + moduli aggiuntivi, stima indicativa e preventivo server-side.
- Account **solo username e password** (nessuna email raccolta né inviata), codice di recupero monouso per reimpostare la password, cambio password e cancellazione account tramite funzioni SQL.
- Modulo Contatti salvato nel database (`support_requests`): l'operatore risponde dalla Dashboard e l'utente legge la risposta nella pagina Account.
- Pagine legali (privacy, termini, rimborsi, cookie, operatore), consenso cookie senza dark pattern, esportazione JSON dei dati e cancellazione self-service di tornei e account.
- Console organizzatori con più piattaforme indipendenti e gestione identità visiva.
- Backoffice con CRUD per competizioni, iscrizioni squadre, giocatori, partite, eventi, staff, premi, sponsor, articoli, mercato e gallery.
- Vetrine pubbliche separate per tenant, calendario risultati, classifiche calcolate, squadre e giocatori.
- Moduli protetti da entitlement server-side e RLS, richieste upgrade senza addebiti automatici.

## Setup locale

Prerequisiti: Node.js 22+, npm, un NUOVO progetto Supabase. Non usare il database Street League come destinazione della migrazione perché lo schema è incompatibile.

1. Esegui npm install.
2. Copia .env.example in .env.local e configura VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY. Sono valori pubblici, mai una chiave service_role.
3. Applica in ordine tutte le migrazioni in supabase/migrations/ (initial, privacy_deletion, image_alt_text, security_hardening) tramite SQL Editor o `supabase db push`.
4. In Supabase Auth lascia attivo il provider Email ma disattiva **Confirm email** (nessuna email viene inviata) e imposta il Site URL.
5. Non servono Edge Function: autenticazione, recupero, cancellazione e richieste sono gestiti da Supabase Auth e da funzioni SQL.
6. Guida completa a Supabase e Cloudflare: docs/MANUAL_INFO_CHECKLIST.md.
7. Esegui npm run dev per sviluppare e npm run build per verificare la build.

Il file supabase/config.toml imposta verify_jwt=false solo per la funzione di login perché, prima di autenticarsi, l'utente non dispone di un JWT. L'accesso viene comunque verificato da Supabase Auth, e occorre configurare rate limiting, protezione anti-abuso e monitoraggio prima della produzione.

## Flusso del cliente

Un cliente seleziona durata e funzionalità in /configura, crea un profilo in /registrati (username e password), salva il codice di recupero e accede a /console. Crea uno spazio con nome e slug univoci, che è accessibile in anteprima a /t/:slug. Il tenant resta in bozza finché un operatore autorizzato non lo abilita. I cinque moduli base restano disponibili per il caricamento dei dati. Gli extra selezionati vengono registrati nel preventivo, ma NON attivati automaticamente.

L'abilitazione di un tenant in fase di test si effettua solo lato amministratore del database con una query come la seguente (dopo aver verificato il tenant):

    update public.tenants set status = 'active' where slug = 'nome-torneo';

Per simulare un grant MANUALE di un modulo già verificato in ambiente di test:

    insert into public.tenant_features (tenant_id,code,enabled,source)
    select id,'statistics',true,'manual' from public.tenants where slug='nome-torneo'
    on conflict (tenant_id,code) do update set enabled=true,source='manual';

Queste operazioni non devono MAI essere eseguite dal client o da una RPC pubblica. È necessario un backoffice ItalFUT centrale protetto e con audit log prima della vendita.

## Database e sicurezza

- profiles: profili Auth con username univoco (l'indirizzo Auth è un alias interno non recapitabile).
- support_requests: richieste di assistenza/privacy dal modulo Contatti; private.recovery_codes: hash bcrypt dei codici di recupero.
- tenants e tenant_members: identità, stato, ownership e ruoli per organizzazione.
- feature_catalog, tenant_features: prezzi autorevoli e concessioni dei moduli, in sola lettura dal client.
- plan_quotes, upgrade_requests: preventivi e richieste in stato pending.
- subscriptions: tabella dedicata al futuro Stripe, non modificabile da client.
- competitions, teams, competition_teams, players, matches, match_events, staff_members, awards, sponsors, articles, market_slots, galleries: tabelle di dominio, tutte separate con tenant_id.

Le policy RLS applicano l'isolamento per tenant e il gate sui moduli. Le foreign key composite tenant_id + id impediscono connessioni tra record di tenant differenti. Le funzioni private di autorizzazione usano SECURITY DEFINER con search_path bloccato. Lo status, il catalogo prezzi e gli entitlement non sono mutabili dai clienti.

## Integrazione Stripe futura

Il backend dovrà creare una Checkout Session solo dopo aver ricalcolato sul server quote e moduli richiesti. Il webhook dovrà verificare la firma Stripe sul corpo raw della richiesta, gestire idempotenza e correlare amount, durata, prodotti, tenant e customer a un ordine verificato. Soltanto la conferma server-side deve attivare tenant e moduli, con scadenze sincronizzate alle sottoscrizioni. Va predisposto anche Billing Portal, il trattamento IVA, gestione rinnovi, rimborsi, pagamenti falliti e recupero crediti.

**Non esiste ora un pagamento reale, né un checkout o uno sblocco automatico di funzionalità a pagamento.**

## Deploy

Hosting su Cloudflare Pages (unico altro fornitore oltre a Supabase): comando build npm run build; directory output dist. public/_redirects gestisce le route SPA e public/_headers applica CSP, HSTS e le altre intestazioni di sicurezza. Configura le variabili pubbliche in Cloudflare e l'elenco origini autorizzate in Supabase. Il progetto è distribuito separatamente da StreetLeagueWebsite.

## Checklist obbligatoria prima della produzione

- Registrare account A e B, creare tenant distinti e verificare che una mutazione sui record B eseguita da A fallisca.
- Testare select, insert, update e delete di moduli bloccati tramite API diretta: il client non deve aggirare l'RLS.
- Verificare che un match del tenant A non possa contenere team del tenant B.
- Verificare che tenant_features, subscriptions, plan_quotes, tenant_members e tenants.status siano non scrivibili da autenticati ordinari.
- Verificare anteprime draft, login via username, session expiry, password errata, logout e redirect.
- Verificare layout mobile, navigazione tastiera, escape del contenuto editoriale e unicità di sei slot di mercato.
- Effettuare un penetration test e un audit di sicurezza SQL/Auth/Edge prima di abilitare pagamenti.

## Limiti attuali

È una prima release strutturale, non il SaaS commerciale completo. Restano da sviluppare: Stripe Checkout/webhook, backoffice globale, inviti e ruoli avanzati, generatore automatico di calendari, esportazioni, editor rich text, upload con Supabase Storage, custom domains, dirette, statistiche avanzate come clean sheets e premi aggregati tra gironi, oltre a test end-to-end sul progetto Supabase reale. Lato pubblico le query hanno attualmente un limite di 500 righe per tabella: servirà paginazione server per i tornei più grandi.

## Sicurezza (revisione 2 novembre 2026)

- RLS su tutte le tabelle, isolamento per tenant con chiavi composite, funzioni SECURITY DEFINER con search_path bloccato.
- Gli utenti anonimi leggono solo le colonne pubbliche di `tenants` e `players` (niente owner_id o dati di audit sui minori).
- Vincoli `https://` e lunghezze massime sui campi URL/testo (NOT VALID: non toccano i dati esistenti).
- Login con username verso Supabase Auth (rate limit nativi); reset con codice di recupero monouso cifrato, throttling per username e per IP, revoca di tutte le sessioni.
- Frontend: nessun `dangerouslySetInnerHTML`, URL validati (`safeUrl`), testo normalizzato (`cleanText`), redirect post-login solo interni, CSP senza script inline, nessuna source map in produzione, `console.*` rimossi in build.
- Elenco di ciò che va configurato a mano: **docs/MANUAL_INFO_CHECKLIST.md**.
