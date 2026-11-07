# ItalFUT — Cosa configurare e inserire a mano

ItalFUT è un progetto personale, che verrà lanciato commercialmente dopo l’apertura della Partita IVA (con Stripe per i pagamenti).
Infrastruttura: **solo Cloudflare** (dominio, DNS, hosting) **+ Supabase** (database, autenticazione, richieste). Nessun servizio email: nessuna email viene mai inviata agli utenti.

Le pagine legali mostrano solo i dati presenti in `src/config/legal.ts`: un campo vuoto viene omesso, senza segnaposto.

> Non sono un avvocato né un commercialista: i testi in `src/pages/Legal.tsx` sono bozze da far revisionare prima del lancio commerciale.

---

## A. Da fare subito (sviluppo / beta senza pagamenti)

### 1. Supabase → SQL Editor
Esegui, in quest’ordine, i file non ancora applicati:
1. `supabase/migrations/202611020001_security_hardening.sql`
2. `supabase/migrations/202611020002_email_free_auth.sql`
3. `supabase/migrations/202611060001_tenant_media.sql`
4. `supabase/migrations/202611070001_stripe_payments.sql`
5. `supabase/migrations/202611080001_custom_duration.sql`
6. `supabase/migrations/202611090001_event_tournaments.sql` (tornei di un giorno gratuiti: **obbligatoria** con il codice attuale, la console legge le colonne `kind`, `event_date`, `published_at`)
7. `supabase/migrations/202611100001_promotion_codes.sql` (codici sconto Stripe: sconto registrato su ogni pagamento)
8. `supabase/migrations/202611110001_organizer_contacts.sql` (recapiti degli organizzatori: nome, email, telefono; obbligatori per creare un torneo o pagare)

Sono rieseguibili senza errori.

### 2. Supabase → Authentication
- **Sign In / Providers → Email:** lascia il provider *attivo* ma **disattiva “Confirm email”**. Senza questo passo la registrazione crea l’account ma non lo attiva (nessuna email può confermarlo).
- **Secure password change:** disattivato (richiederebbe un’email).
- **Password:** lunghezza minima **10**.
- **URL Configuration → Site URL:** il dominio del sito (in locale `http://localhost:5173`).
- **Rate limits:** lascia i valori predefiniti per sign-in e sign-up.

### 3. Supabase → Edge Functions (pulizia, facoltativo)
Le Edge Function non servono più. Se nel progetto risulta pubblicata `delete-account`, puoi eliminarla dalla Dashboard: ora la cancellazione dell’account è la funzione SQL `delete_my_account`.

### 4. Prova di registrazione
Crea un account di prova da `/registrati`. Gli account usano internamente un indirizzo fittizio `username@users.italfut.invalid` (dominio riservato: nessuna email può esistere o essere recapitata).
Se compare “Registrazione bloccata da Supabase” o “indirizzo non valido”, quasi sempre **“Confirm email” è ancora attivo** (punto 2): Supabase controlla l’indirizzo solo quando deve inviare un’email. Disattivalo e riprova.
Solo se l’errore resta anche con la conferma disattivata, imposta un dominio che possiedi nel file `.env.local` e nelle variabili di Cloudflare:
```
VITE_AUTH_EMAIL_DOMAIN=utenti.franksitez.com
```
⚠ Decidi il dominio interno **prima** del lancio: cambiarlo dopo impedisce l’accesso agli account già creati.

### 5. Variabili d’ambiente del frontend
**File:** `.env.local` (non versionato) e Cloudflare Pages → Settings → Variables
```
VITE_SUPABASE_URL=https://abehoquivbewvumbgqrp.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<chiave publishable del progetto>
# facoltativa, vedi punto 4
VITE_AUTH_EMAIL_DOMAIN=users.italfut.invalid
```

### 6. Superadmin (dashboard `/admin`)
1. SQL Editor → esegui `supabase/migrations/202611030001_superadmin.sql`.
2. Registrati sul sito con il tuo account (se non l’hai già fatto).
3. SQL Editor → nominati superadmin (sostituisci lo username):
   ```sql
   insert into public.platform_admins(user_id)
   select id from public.profiles where username = 'il_tuo_username';
   ```
4. Ricarica la pagina (o torna sulla scheda del sito: il ruolo viene ricontrollato al rientro e ogni minuto). In alto a destra compaiono il tuo **@username** con il ruolo *Superadmin* e i link **Superadmin** e **Richieste**; dopo l’accesso vieni portato direttamente su `/admin`.

Dalla dashboard gestisci tutte le tabelle (aggiungi, modifica, elimina, cerca). Ogni operazione finisce nel **Registro attività**. Altri superadmin si aggiungono dalla scheda “Superadmin”; l’ultimo non può essere rimosso.

### 6b. Caricamento immagini dal computer (loghi, foto, copertine)
1. SQL Editor → esegui `supabase/migrations/202611060001_tenant_media.sql` (rieseguibile).
   Crea in **Storage** il bucket pubblico `tenant-media`: solo file `.webp`, massimo 2 MB, cartelle `<id torneo>/<campo>/<file>.webp`.
2. Verifica in Supabase → Storage che il bucket compaia con “Allowed MIME types: image/webp”.
3. Fatto: in console ogni campo immagine ha “Carica dal computer” (anche trascinando il file). Il browser converte JPG/PNG/AVIF in WebP e li ridimensiona prima dell’invio; resta possibile incollare un link.

Solo lo staff del torneo (proprietario, amministratore, editor) e i superadmin possono caricare o eliminare file. Le immagini sostituite, rimosse o caricate e poi annullate vengono cancellate automaticamente; eliminando un torneo vengono cancellati tutti i suoi file.

---

## B. Gestione quotidiana (tutto dalla Dashboard Supabase)

| Cosa | Dove |
| --- | --- |
| Tutto quanto sotto | Più comodo dalla dashboard **`/admin`** (punto 6); la Dashboard Supabase resta un’alternativa. |
| Richieste da `/contatti` (assistenza, privacy, minori, pagamenti) | Scheda “Richieste di supporto” o Table Editor → `support_requests`. Rispondi scrivendo in `reply`, imposta `status = answered` e `answered_at = now()`: l’utente vede la risposta nella pagina Account. Le richieste anonime hanno un recapito facoltativo in `contact`. |
| Richieste di moduli extra | Table Editor → `upgrade_requests` |
| Pubblicare un torneo | `update public.tenants set status = 'active' where slug = '...';` |
| Attivare un modulo | esempio in `README.md` |
| Utente che ha perso password **e** codice di recupero | Verifica che l’account sia davvero suo (es. nomi dei tornei creati), poi in SQL Editor:<br>`update auth.users set encrypted_password = extensions.crypt('PasswordTemporanea2026', extensions.gen_salt('bf', 10)) where id = (select id from public.profiles where username = 'nome_utente');`<br>Comunica la password temporanea nel campo `reply` della sua richiesta e chiedigli di cambiarla subito. |

---

## C. Prima del lancio commerciale (dopo la Partita IVA)

### 7. Dati del gestore
**File:** `src/config/legal.ts` → `legalConfig`

| Campo | Cosa contiene |
| --- | --- |
| `operatorName` | Il tuo nome (pagina “Chi gestisce ItalFUT”, privacy, termini) |
| `supportEmail` | Facoltativo: se compilato compare accanto al modulo Contatti |
| `officialDomain` | Es. `https://italfut.it` |

Dati fiscali, sede, PEC e recapiti non sono più previsti dal file: se ti servono, aggiungili tu nella pagina “Chi gestisce ItalFUT” in `src/pages/Legal.tsx` (blocco `page === 'business'`).
Il credito “made with ♥ by FrankSitez” si modifica in `madeBy`, nello stesso file.

### 8. Conservazione dati e fornitori
| Campo | Cosa inserire |
| --- | --- |
| `serverRegion` | Regione del progetto Supabase (Project Settings → General). Oggi “UE — Francia (eu-west-3)”: **verificare** |
| `accountRetention`, `tenantRetention`, `requestRetention`, `logRetention` | Tempi di conservazione mostrati nella privacy policy (già compilati: rivedili) |

Accetta i **DPA** di Supabase e Cloudflare dalle rispettive dashboard.

### 9. Pagamenti (Stripe)
L’integrazione è pronta nel codice e **spenta** finché `VITE_PAYMENTS_ENABLED` non vale `true`. Tutti i passaggi (account e sandbox Stripe, Stripe Tax, migrazione `202611070001_stripe_payments.sql`, secret, deploy delle due Edge Functions, webhook, test, passaggio al live) sono in **`STRIPE_INTEGRATION_TODO.md`** nella radice del progetto.

| Campo / file | Cosa fare |
| --- | --- |
| `pricesIncludeVat` | `true` (IVA inclusa), `false` (IVA esclusa) o `null` per non mostrare nulla accanto ai prezzi. Gli importi inviati a Stripe sono “tasse incluse” (`tax_behavior: inclusive`). |
| `src/pages/Legal.tsx` | Con i pagamenti attivi privacy, termini (sezione 4), rimborsi e cookie mostrano già i testi su Stripe: rileggili e completali. |
| Rimborsi | Si fanno dalla Dashboard Stripe (Pagamenti → Rimborsa). Il webhook segna il pagamento come `refunded`; se vuoi anche spegnere i moduli, modifica `tenant_features` / `subscriptions` dalla scheda Superadmin. |

Prezzi: `src/lib/catalog.ts` **e** tabella `feature_catalog` / funzione `quote_plan` nel database (devono coincidere: l’importo addebitato è sempre quello del database).
La CSP non va cambiata: il pagamento è un reindirizzamento alla pagina di Stripe, nessuno script Stripe viene caricato sul sito.

### 10. Testi legali (`src/pages/Legal.tsx`)
- Accordo con gli organizzatori sui dati dei partecipanti (art. 28 GDPR).
- Trasferimenti extra-UE (Supabase e Cloudflare sono statunitensi: verificare SCC/DPF nei DPA).
- Foro competente, ADR/ODR se vendi a consumatori.

### 11. Minorenni
Procedura esterna per raccogliere e conservare i consensi firmati dei genitori. Le richieste di rimozione arrivano in `support_requests` con `kind = 'minor'`.

---

## D. Cloudflare (dominio + hosting)

1. **Dominio:** acquistalo con Cloudflare Registrar e inseriscilo in `officialDomain`.
2. **Pages:** Workers & Pages → Create → Pages → collega `NullMC/ItalFUT`.
   - Build command `npm run build` · Output `dist` · variabile `NODE_VERSION` = `22`.
   - Variabili d’ambiente del punto 5 (Production e Preview).
   - Custom domains → `tuodominio.it` e `www.tuodominio.it`.
3. `public/_redirects` e `public/_headers` sono già pronti (routing SPA, CSP, HSTS, cache).
4. **Lascia spenti:** Web Analytics / RUM, Rocket Loader, Email Address Obfuscation, Zaraz (iniettano script bloccati dalla CSP e aggiungono servizi).
5. **SSL/TLS:** *Full (strict)* e *Always Use HTTPS*.
6. **Supabase:** aggiorna Site URL con il dominio definitivo.
7. Se attivi la protezione anti-bot può comparire il cookie tecnico `__cf_bm`: è già nella cookie policy.

---

## Pubblicazione live (italfut.it)

1. **Cloudflare Pages → Settings → Variables (Production):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_PAYMENTS_ENABLED=true` (e `VITE_AUTH_EMAIL_DOMAIN` se lo usi). Build command `npm run build`, output `dist`.
2. **Dominio:** collega `italfut.it` al progetto Pages e reindirizza `www.italfut.it` → `https://italfut.it` (Redirect Rules), così canonical, sitemap e CORS coincidono.
3. **Supabase → Authentication → URL Configuration:** Site URL `https://italfut.it`. Password: minimo 10 caratteri. “Confirm email” disattivato (già così).
4. **Supabase → Edge Functions → Secrets:** `DOMAIN=https://italfut.it`, `STRIPE_SECRET_KEY` live (`sk_live_…`), `STRIPE_WEBHOOK_SECRET` del webhook live.
5. **Stripe live:** attivazione account, Stripe Tax live, webhook live verso `https://abehoquivbewvumbgqrp.supabase.co/functions/v1/stripe-webhook` con i 5 eventi, codici sconto ricreati in live.
6. **Pulizia dati di prova:** elimina dal superadmin tornei, account e pagamenti di test (es. il torneo pubblico `test`).
7. **SEO:** Google Search Console → aggiungi la proprietà `italfut.it` → invia `https://italfut.it/sitemap.xml`. Anteprima social: https://www.opengraph.xyz/url/https%3A%2F%2Fitalfut.it
8. **Repository:** se è pubblico, valuta di renderlo privato (cronologia con dati personali e cartella `marketing/` con file audio/video).
