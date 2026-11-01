# ItalFUT — Informazioni da inserire manualmente

Tutto ciò che il codice **non può e non deve inventare**: dati personali, legali, fiscali e configurazioni di account esterni.
Finché un campo resta vuoto, le pagine legali mostrano l’etichetta “da completare” e il footer non mostra dati societari.

> Non sono un avvocato né un commercialista: i testi in `src/pages/Legal.tsx` sono bozze strutturate da far revisionare a un professionista prima dell’apertura commerciale.

---

## 1. Dati dell’operatore e business details

**File:** `src/config/legal.ts` → oggetto `legalConfig`

| Campo | Cosa inserire | Obbligatorio |
| --- | --- | --- |
| `operatorName` | Nome e cognome (ditta individuale) o ragione sociale | Sì |
| `legalForm` | Es. “Ditta individuale”, “S.r.l.”, “Associazione” | Sì |
| `vatNumber` | Partita IVA (11 cifre) — va pubblicata sul sito se c’è attività d’impresa | Sì (se P.IVA) |
| `taxCode` | Codice fiscale dell’impresa / del titolare | Sì |
| `reaRegistration` | Numero REA, es. “BA-123456” | Se iscritto al Registro Imprese |
| `shareCapital` | Capitale sociale versato | Solo società di capitali |
| `registeredOffice` | Indirizzo completo della sede legale | Sì |
| `businessAddress` | Sede operativa | Solo se diversa |
| `supportEmail` | Email di assistenza attiva | Sì |
| `privacyEmail` | Email per le richieste GDPR (può coincidere) | Sì |
| `certifiedEmail` | PEC | Sì per imprese/società |
| `telephone` | Telefono commerciale | Facoltativo |
| `contactUrl` | Pagina contatti, se esiste | Facoltativo |
| `dpoContact` | Contatto del DPO | Solo se nominato |
| `officialDomain` | Dominio di produzione, es. `https://italfut.it` | Sì |

## 2. Fornitori, hosting e conservazione dati

**File:** `src/config/legal.ts`

| Campo | Cosa inserire |
| --- | --- |
| `hostingProvider` | Chi ospita il sito (es. “Cloudflare, Inc. — Cloudflare Pages”) |
| `serverRegion` | Regione reale del progetto Supabase (Dashboard → Project Settings → General). Oggi indicata “UE — Francia (eu-west-3)”: **verificare** |
| `accountRetention` | Per quanto conservi i dati di un account dopo la chiusura |
| `tenantRetention` | Per quanto conservi i dati di un torneo dopo la scadenza |
| `logRetention` | Durata dei log (Supabase e hosting) |
| `legalRecordsRetention` | Conservazione documenti fiscali (in Italia di norma 10 anni) |

Firmare/accettare i **DPA** (Data Processing Agreement) di Supabase e del provider di hosting.

## 3. Condizioni commerciali (prima di attivare i pagamenti)

**File:** `src/config/legal.ts` e prezzi in `src/lib/catalog.ts` + `supabase/migrations/202610310001_initial.sql` (`feature_catalog`, `quote_plan`)

| Campo | Cosa inserire |
| --- | --- |
| `pricesIncludeVat` | `true` se i prezzi mostrati sono IVA inclusa, `false` se esclusa (per i consumatori vanno mostrati IVA inclusa) |
| `acceptedPaymentMethods` | Es. “Carta di credito/debito tramite Stripe” |
| `billingStartCondition` | Quando nasce l’obbligo di pagamento |
| `autoRenewal` | Se e come avviene il rinnovo, come disdire |
| `refundContact` | Email per recesso e rimborsi |
| `contractualCustomerTypes` | “B2B”, “B2C” o “B2B e B2C” |
| `supportResponsePolicy` | Tempi di risposta solo se realmente garantiti |
| `LEGAL_REVIEWED` / `lastReviewedOn` | `true` e data **solo dopo** la revisione di un professionista |

## 4. Testi legali da revisionare

**File:** `src/pages/Legal.tsx` (privacy, termini, rimborsi, cookie, operatore)

- Basi giuridiche, ruoli titolare/responsabile con gli organizzatori (accordo ex art. 28 GDPR da predisporre).
- Trasferimenti extra-UE (Supabase Inc. è statunitense: verificare SCC/DPF nel DPA).
- Foro competente, ADR e link alla piattaforma ODR se vendi a consumatori.
- Aggiorna la tabella cookie se aggiungi strumenti (analytics, chat, pagamenti).

## 5. Minorenni

- Procedura **esterna** per raccogliere e conservare il consenso scritto dei genitori/tutori (modulo cartaceo o digitale firmato). La piattaforma registra solo chi ha dichiarato e quando.
- Indirizzo a cui genitori/tutori chiedono la rimozione: è `privacyEmail`.

## 6. Supabase — configurazione da fare nella Dashboard

1. **SQL Editor** → eseguire `supabase/migrations/202611020001_security_hardening.sql` (le migrazioni precedenti risultano già applicate).
2. **Edge Functions** → deploy della funzione di login con username (oggi **non pubblicata**: il login con username risponde 404, quello con email funziona):
   `supabase functions deploy auth-username --no-verify-jwt`
3. **Edge Functions → Secrets** → `ITALFUT_ALLOWED_ORIGINS` = origini di produzione separate da virgola, es. `https://italfut.it,https://www.italfut.it` (vale per `auth-username` e `delete-account`).
4. **Authentication → Providers → Email**: lunghezza minima password **10**, conferma email attiva (già attiva); “Leaked password protection” se il piano lo consente (Pro).
5. **Authentication → URL Configuration**: Site URL = dominio di produzione; Redirect URLs = `https://<dominio>/accesso` e `https://<dominio>/reimposta-password`.
6. **Authentication → Email Templates / SMTP**: mittente personalizzato con un dominio tuo (SMTP proprio) prima del lancio.
7. **Authentication → Rate Limits**: verificare i limiti di sign-in/sign-up.

## 7. Variabili d’ambiente del frontend

**File:** `.env.local` (non versionato) e variabili del provider di hosting

```
VITE_SUPABASE_URL=https://abehoquivbewvumbgqrp.supabase.co
VITE_SUPABASE_ANON_KEY=<chiave publishable del progetto>
```

## 8. Hosting

- `public/_headers` contiene CSP e intestazioni di sicurezza per Cloudflare Pages/Netlify. Su un altro hosting vanno replicate.
- Se aggiungi domini esterni (es. Stripe, analytics) vanno aggiunti alla CSP **e** bloccati fino al consenso (`useCookiePreferences().allows('analytics')`).
