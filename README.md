# ItalFUT

ItalFUT è una piattaforma SaaS multi-tenant per la gestione dei tornei di calcio, sviluppata con React 19, TypeScript, React Router 7, Material UI 7, Tailwind CSS 4 e Supabase.

**Stato:** fondazione applicativa pre-pagamenti. Non è collegata automaticamente a un progetto Supabase live; Stripe non è ancora operativo. Ogni nuovo spazio nasce in bozza, con i moduli base per la preparazione dei contenuti.

## Funzionalità disponibili

- Landing page ItalFUT responsive, sezioni prodotto, CTA e demo visiva esplicitamente illustrativa.
- Configuratore durata + moduli aggiuntivi, stima indicativa e preventivo server-side.
- Registrazione con email e password, accesso anche con username e password tramite Edge Function.
- Console organizzatori con più piattaforme indipendenti e gestione identità visiva.
- Backoffice con CRUD per competizioni, iscrizioni squadre, giocatori, partite, eventi, staff, premi, sponsor, articoli, mercato e gallery.
- Vetrine pubbliche separate per tenant, calendario risultati, classifiche calcolate, squadre e giocatori.
- Moduli protetti da entitlement server-side e RLS, richieste upgrade senza addebiti automatici.

## Setup locale

Prerequisiti: Node.js 22+, npm, un NUOVO progetto Supabase. Non usare il database Street League come destinazione della migrazione perché lo schema è incompatibile.

1. Esegui npm install.
2. Copia .env.example in .env e configura VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Sono valori pubblici, mai una chiave service_role.
3. Applica la migrazione supabase/migrations/202610310001_initial.sql al nuovo progetto tramite SQL Editor o Supabase CLI.
4. Abilita il provider Email + Password in Supabase Auth e configura email di verifica, URL sito e URL redirect.
5. Installa Supabase CLI e distribuisci la Edge Function con: supabase functions deploy auth-username --no-verify-jwt.
6. Nelle variabili server-side della Edge Function configura ITALFUT_ALLOWED_ORIGINS come elenco di origini complete separate da virgola (esempio: https://italfut.it,https://www.italfut.it). SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY restano esclusivamente nell'ambiente Edge.
7. Esegui npm run dev per sviluppare e npm run build per verificare la build.

Il file supabase/config.toml imposta verify_jwt=false solo per la funzione di login perché, prima di autenticarsi, l'utente non dispone di un JWT. L'accesso viene comunque verificato da Supabase Auth, e occorre configurare rate limiting, protezione anti-abuso e monitoraggio prima della produzione.

## Flusso del cliente

Un cliente seleziona durata e funzionalità in /configura, crea un profilo in /registrati, conferma l'email e accede a /console. Crea uno spazio con nome e slug univoci, che è accessibile in anteprima a /t/:slug. Il tenant resta in bozza finché un operatore autorizzato non lo abilita. I cinque moduli base restano disponibili per il caricamento dei dati. Gli extra selezionati vengono registrati nel preventivo, ma NON attivati automaticamente.

L'abilitazione di un tenant in fase di test si effettua solo lato amministratore del database con una query come la seguente (dopo aver verificato il tenant):

    update public.tenants set status = 'active' where slug = 'nome-torneo';

Per simulare un grant MANUALE di un modulo già verificato in ambiente di test:

    insert into public.tenant_features (tenant_id,code,enabled,source)
    select id,'statistics',true,'manual' from public.tenants where slug='nome-torneo'
    on conflict (tenant_id,code) do update set enabled=true,source='manual';

Queste operazioni non devono MAI essere eseguite dal client o da una RPC pubblica. È necessario un backoffice ItalFUT centrale protetto e con audit log prima della vendita.

## Database e sicurezza

- profiles: profili Auth con username univoco. L'email non viene esposta ad altri utenti.
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

Su Cloudflare Pages: comando build npm run build; directory output dist. La configurazione public/_redirects gestisce le route SPA. Configura le variabili pubbliche in Cloudflare e l'elenco origini autorizzate in Supabase. Il progetto è distribuito separatamente da StreetLeagueWebsite.

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
