# ItalFUT — Cosa configurare e inserire a mano

ItalFUT è un progetto personale gestito da una persona fisica, **gratuito**: oggi non chiede e non accetta pagamenti (`OPERATOR_MODE = 'privato'`, `PAYMENTS_ACTIVE = false` in `src/config/legal.ts`). Diventerà a pagamento solo dopo l’apertura di una partita IVA che copra questa attività (con Stripe per i pagamenti).
Infrastruttura: **solo Cloudflare** (dominio, DNS, hosting) **+ Supabase** (database, autenticazione, richieste). Nessun servizio email: nessuna email viene mai inviata agli utenti.

Finché un campo resta vuoto, le pagine legali mostrano “da completare” e il footer non mostra dati fiscali.

**Subito, anche nella fase gratuita:** in `legalConfig` compila `operatorName` (nome e cognome: serve a identificare il titolare del trattamento nella privacy policy) e, se vuoi, `operatorCity`. Rivedi `requestRetention` e gli altri tempi di conservazione già proposti. Non pubblicare codice fiscale o indirizzo di casa: non sono richiesti in questa fase.

> Perché gratuito: incassare abbonamenti ricorrenti da più clienti è un’attività abituale, non una prestazione occasionale; per farlo serve la partita IVA indipendentemente dalla soglia dei 5.000 € (che riguarda solo i contributi INPS). Vedi la sezione C e chiedi conferma a un commercialista.

> Non sono un avvocato né un commercialista: i testi in `src/pages/Legal.tsx` sono bozze da far revisionare prima del lancio commerciale.

---

## A. Da fare subito (sviluppo / beta senza pagamenti)

### 1. Supabase → SQL Editor
Esegui, in quest’ordine, i file non ancora applicati:
1. `supabase/migrations/202611020001_security_hardening.sql`
2. `supabase/migrations/202611020002_email_free_auth.sql`

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

## C. Prima di incassare (dopo l’apertura della partita IVA)

Ordine: 1) partita IVA aperta con il codice ATECO concordato con il commercialista; 2) `OPERATOR_MODE = 'partita-iva'` e campi qui sotto compilati; 3) Stripe collegato e testato; 4) solo allora `PAYMENTS_ACTIVE = true`. Avvisa gli utenti nella console almeno 30 giorni prima (lo promettono i Termini).

### 7. Dati dell’operatore
Con la partita IVA vanno pubblicati **i tuoi dati fiscali** (la partita IVA anche nel footer di ogni pagina).
**File:** `src/config/legal.ts` → `legalConfig`

| Campo | Cosa inserire |
| --- | --- |
| `operatorName` | Nome e cognome (o denominazione della ditta) |
| `legalForm` | Es. “Ditta individuale”, “Libero professionista” |
| `vatNumber` | Partita IVA |
| `taxCode` | Codice fiscale |
| `reaRegistration` | Numero REA, solo se iscritto al Registro Imprese |
| `registeredOffice` | Indirizzo della sede / domicilio fiscale |
| `certifiedEmail` | PEC (obbligatoria per le imprese iscritte al Registro Imprese) |
| `supportEmail` / `privacyEmail` | **Un indirizzo email di sola ricezione.** Per la vendita online la legge chiede che sul sito compaia un indirizzo email (D.Lgs. 70/2003, art. 7). Non serve un servizio di invio: basta una casella gratuita, oppure un indirizzo del tuo dominio inoltrato con Cloudflare Email Routing. Il modulo Contatti resta il canale principale. |
| `officialDomain` | Es. `https://italfut.it` |

Il credito “made with ♥ by franksitez.com” si modifica in `madeBy`, nello stesso file.

### 8. Conservazione dati e fornitori
| Campo | Cosa inserire |
| --- | --- |
| `serverRegion` | Regione del progetto Supabase (Project Settings → General). Oggi “UE — Francia (eu-west-3)”: **verificare** |
| `accountRetention`, `tenantRetention`, `logRetention`, `legalRecordsRetention` | Tempi di conservazione decisi (documenti fiscali: di norma 10 anni) |

Accetta i **DPA** di Supabase e Cloudflare dalle rispettive dashboard.

### 9. Pagamenti (Stripe)
| Campo | Cosa inserire |
| --- | --- |
| `pricesIncludeVat` | `true` (IVA inclusa) o `false`; ai consumatori i prezzi vanno mostrati IVA inclusa |
| `acceptedPaymentMethods` | Es. “Carte di pagamento tramite Stripe” |
| `billingStartCondition`, `autoRenewal` | Decorrenza dell’addebito, rinnovo e disdetta |
| `contractualCustomerTypes` | “B2B”, “B2C” o entrambi |
| `LEGAL_REVIEWED`, `lastReviewedOn` | Solo dopo la revisione di un professionista |

Prezzi: `src/lib/catalog.ts` **e** tabella `feature_catalog` / funzione `quote_plan` nel database (devono coincidere).
Con Stripe andranno aggiunti alla CSP in `public/_headers` i domini di Stripe, e aggiornate privacy e cookie policy.

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
