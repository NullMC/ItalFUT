# ItalFUT — Checklist manuale prima del lancio

**Stato:** configurazione e testi legali ancora **in bozza**. Le pagine sono predisposte, ma non certificano conformità legale; farle rivedere da professionisti prima di vendere, pubblicare dati di minori o mettere online la piattaforma.

## Punto unico in cui inserire i dati legali

File da modificare: **`src/config/legal.ts`**. L'oggetto `legalConfig` contiene valori vuoti intenzionalmente. Inserire solo dati verificati; non pubblicare informazioni inventate. Dopo la revisione documentata, cambiare `LEGAL_REVIEWED` da `false` a `true` e registrare `lastReviewedOn`.

| Dato da completare | Chiave in `src/config/legal.ts` | Che cosa occorre |
| --- | --- | --- |
| Titolare / ragione sociale | `operatorName` | Persona fisica / società effettiva, nome completo |
| Forma giuridica | `legalForm` | Ditta individuale, SRL, ecc. |
| Partita IVA | `vatNumber` | P.IVA reale, se applicabile |
| Codice fiscale | `taxCode` | Identificativo fiscale dell'impresa |
| Registro Imprese/REA | `reaRegistration` | Numero iscrizione, se dovuto |
| Sede legale | `registeredOffice` | Indirizzo completo |
| Recapito operativo | `businessAddress` | Solo se diverso dalla sede |
| Assistenza clienti | `supportEmail`, `telephone`, `contactUrl` | Email attiva e contatti professionali |
| Richieste privacy / DPO | `privacyEmail`, `dpoContact` | Email dedicata; DPO solo se nominato/obbligatorio |
| PEC | `certifiedEmail` | PEC aziendale se applicabile |
| Dominio pubblico | `officialDomain` | URL realmente attivo, incluso HTTPS |
| Titolare e giurisdizione | `jurisdiction` | Verificare luogo di stabilimento reale |
| Fornitori/hosting | `hostingProvider`, `serverRegion` | Integrare dominio/CDN/hosting, server, log e sub-responsabili |
| Conservazione account | `accountRetention` | Criteri e scadenze verificate |
| Conservazione tornei | `tenantRetention` | Politica di esportazione, chiusura, backup e dati atleti |
| Conservazione log | `logRetention` | Durata di retention per auth, host e audit |
| Documenti fiscali | `legalRecordsRetention` | Eccezioni di conservazione obbligatoria |
| Supporto | `supportResponsePolicy` | SLA solo se effettivamente rispettato |
| Pagamenti | `acceptedPaymentMethods` | Compilare quando i pagamenti verranno attivati |
| Attivazione servizio | `billingStartCondition` | Quando nasce obbligo di pagamento |
| Rinnovi | `autoRenewal` | Se rinnovo manuale/automatico, preavviso e cessazione |
| Rimborsi / recesso | `refundContact`, `contractualCustomerTypes` | Procedura verificata, distinzione B2C/B2B, tempi e condizioni |
| Data revisione | `lastReviewedOn` | Data dell'ultima approvazione formale |

## Pagine da revisionare nei testi

File: **`src/pages/Legal.tsx`**.

- `/privacy-policy`: titolari/responsabili reali, categorie dati, finalità e basi giuridiche per ogni trattamento, destinatari, paesi di trasferimento, diritti, reclami, retention e processi per minorenni. La responsabilità fra piattaforma e singoli organizzatori va definita con accordi verificati.
- `/terms-of-service`: identità del venditore, ammissibilità clienti, natura servizio, contenuti degli organizzatori, sospensione e chiusura, responsabilità, copyright, gestione dispute, giurisdizione e norme per clienti B2C/B2B.
- `/refund-policy`: diritto di recesso dei consumatori (normalmente 14 giorni per servizi a distanza, con condizioni ed eccezioni), processo di richiesta, eventuale avvio anticipato e dichiarazioni di rinuncia previste dalla legge. **Non impostare un “nessun rimborso” automatico.**
- `/cookie-policy`: aggiornare l'inventario ad ogni integrazione. Il codice attuale usa soltanto Supabase Auth, scelta tema, configuratore e presa visione dell'avviso. Non ci sono SDK marketing/analytics.
- `/business`: controllare che ragione sociale, P.IVA, REA, indirizzi e recapiti siano validi.

Non usare i documenti pubblicati in versione "BOZZA" come prova di conformità normativa.

## Minorenni: adempimenti reali

- Gli organizzatori che aprono un account devono essere maggiorenni. Il form richiede una dichiarazione di 18 anni; **non costituisce verifica documentale dell'età**. Valutare con un legale una procedura di verifica, se necessaria.
- Per i giocatori minori, il backoffice chiede dichiarazione specifica prima di salvare/presentare dati e immagini, e registra l'account che la rende. **La spunta non sostituisce il consenso del genitore/tutore o una base giuridica appropriata.**
- Predisporre una procedura esterna per informativa a genitori/tutori, raccolta prova dell'autorizzazione, revoca, verifica identità, rimozione foto e gestione reclami.
- In Italia la soglia GDPR dei 14 anni riguarda **solo alcuni trattamenti fondati sul consenso** per i servizi della società dell'informazione; non significa che un minore di 14/17 anni possa automaticamente concludere un contratto né che ogni pubblicazione di atleti minorenni sia coperta dal medesimo regime.
- Non raccogliere documenti, dati di nascita, nomi dei genitori o dati sanitari attraverso i campi normali del giocatore senza necessità e una procedura adeguata.

## Backend: ciò che va configurato manualmente

- Supabase progetto ItalFUT: applicate migration `202611010001_privacy_deletion.sql` e `202611010002_image_alt_text.sql`; verificare RLS dopo eventuali evoluzioni.
- Edge Function `delete-account`: richiede JWT, password corretta, testo di conferma, assenza di tornei propri e richieste commerciali bloccanti. La funzione è attiva, ma occorre impostare **`ITALFUT_ALLOWED_ORIGINS`** con origini HTTPS di produzione realmente possedute in Supabase → Edge Functions → Secrets. Il default abilita solo localhost/127.0.0.1:5173 per lo sviluppo.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` devono essere disponibili **solo nel runtime server**. Non mettere mai service role key in `.env` frontend, repository o schermate.
- `.env.local` sul client deve contenere solo `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (publishable).
- Effettuare una cancellazione **solo su un account di test**, senza dati di altri. Verificare rimozione del profilo, sessioni, dipendenze e impossibilità di login, più l'impossibilità di eliminare tornei con altri membri/sottoscrizioni.
- Configurare una casella privacy prima di offrire il self-service pubblicamente, per casi con obblighi di conservazione, richieste commerciali, copie esterne e backup.
- **Backup e log**: coordinare tempi e procedure di cancellazione/retention con Supabase e hosting. L'eliminazione dal database attivo non garantisce l'immediata scomparsa dai backup.
- **Storage/immagini esterne**: gli URL dei media caricati dagli organizzatori possono puntare a sistemi terzi. La cancellazione dei record ItalFUT non cancella immagini su Drive o provider esterni; serve una procedura dedicata e verifica dei link.
- **Prima di attivare Stripe**: integrare prezzi finali e IVA, checkout completo, disclosure di obbligo di pagamento, cancellazione abbonamento, webhook con firma verificata e DPA/termini dei fornitori.

## Test manuali di accettazione (browser reale)

- Modalità chiara/scura, contrasto dei form, accesso e leggibilità della navbar glass a 320, 375, 768, 1024 e 1440px.
- `Tab`, `Shift+Tab`, `Enter`, `Space`, `Esc`: navigazione, gestione cookie, menu, login e conferme distruttive. Verificare un lettore schermo.
- Stato senza cookie/localStorage, con riduzione movimento e trasparenze, con JavaScript bloccato e con connessione lenta.
- Nessun tracker attivato prima del consenso: aprire DevTools → Network / Application; confermare che non ci siano script o cookie di marketing.
- Testare il flusso di registrazione con caselle non selezionate; controllare che le foto dei minori richiedano dichiarazione specifica.
- Verificare email legali e condizioni commerciali prima del primo cliente.

## Riferimenti istituzionali

- Garante Cookie: https://www.gpdp.it/home/docweb/-/docweb-display/docweb/9677876
- Garante Minori: https://www.garanteprivacy.it/temi/minori
- Commissione UE cancellazione: https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/dealing-requests-individuals_en
- Your Europe acquisti a distanza: https://europa.eu/youreurope/business/selling-in-eu/selling-goods-services/ecommerce-distance-selling/index_it.htm
