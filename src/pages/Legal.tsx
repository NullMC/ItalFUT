import { Fragment, type ReactNode } from 'react';
import { ScrollRail } from '../components/ScrollRail';
import { Alert } from '@mui/material';
import { Link as RouterLink, NavLink } from 'react-router-dom';
import { isPrivate, LEGAL_VERSION, legalConfig, legalNeedsReview, madeBy, paymentsActive, requiredLegalFields, vatNote } from '../config/legal';
import { useCookiePreferences } from '../components/CookieNotice';

export type LegalPageId = 'privacy' | 'terms' | 'refund' | 'cookies' | 'business';
type Section = { id: string; title: string; body: ReactNode };

const v = (text: string | null | undefined): ReactNode =>
  text ? <span>{text}</span> : <span className="legal-missing">da completare</span>;
const contactForm = <RouterLink to="/contatti">modulo Contatti</RouterLink>;
/** Optional extra channel: shown only if an address has been configured. */
const orMail = (address: string) => address ? <> o all’indirizzo <a href={'mailto:' + address}>{address}</a></> : null;
const mail = (address: string) => address ? <a href={'mailto:' + address}>{address}</a> : <span className="legal-missing">da completare</span>;

const titleMap: Record<LegalPageId, string> = {
  privacy: 'Privacy policy',
  terms: 'Termini di servizio',
  refund: isPrivate ? 'Prezzi e pagamenti' : 'Rimborsi e diritto di recesso',
  cookies: 'Cookie policy',
  business: isPrivate ? 'Chi gestisce ItalFUT' : 'Informazioni sull’operatore',
};
const summaryMap: Record<LegalPageId, string> = {
  privacy: 'Quali dati trattiamo, perché, per quanto tempo e come puoi esercitare i tuoi diritti.',
  terms: 'Le regole d’uso di ItalFUT per organizzatori e visitatori.',
  refund: isPrivate ? 'Oggi ItalFUT è gratuito: cosa significano i prezzi che vedi e cosa cambierebbe in futuro.' : 'Come funzionano recesso e rimborsi per i servizi a pagamento.',
  cookies: 'Gli strumenti che salvano informazioni sul tuo dispositivo e come gestirli.',
  business: isPrivate ? 'Chi c’è dietro il progetto, a che titolo lo gestisce e come contattarlo.' : 'Dati identificativi e recapiti del titolare del servizio.',
};

/** Who runs the service, in the wording that fits the current mode. */
const operator = (c: typeof legalConfig) => isPrivate
  ? <>{v(c.operatorName)}, persona fisica{c.operatorCity ? <> residente a {c.operatorCity}</> : null}, a titolo personale e non professionale (vedi <RouterLink to="/business">Chi gestisce ItalFUT</RouterLink>)</>
  : <>{v(c.operatorName)} (vedi <RouterLink to="/business">Informazioni sull’operatore</RouterLink>)</>;

const storageRows = [
  ['sb-<progetto>-auth-token', 'Supabase (prima parte)', 'Mantiene la sessione di accesso dell’organizzatore', 'Fino al logout; il token si rinnova ogni ora', 'Tecnico — necessario', 'localStorage'],
  ['italfut-appearance', 'ItalFUT', 'Ricorda il tema chiaro o scuro scelto', 'Fino alla cancellazione dal browser', 'Tecnico — funzionale', 'localStorage'],
  ['italfut_consent_v2', 'ItalFUT', 'Registra le tue scelte sui cookie e la data', '6 mesi, poi la scelta viene richiesta di nuovo', 'Tecnico — necessario', 'localStorage'],
  ['italfut_configuration', 'ItalFUT', 'Conserva durata e moduli scelti nel configuratore', 'Fino alla chiusura della scheda', 'Tecnico — necessario', 'sessionStorage'],
  ['__cf_bm (solo se la protezione anti-bot è attiva)', 'Cloudflare', 'Distingue il traffico umano dai bot per proteggere il sito', '30 minuti', 'Tecnico — necessario', 'Cookie'],
];

function sections(page: LegalPageId, openPreferences: () => void): Section[] {
  const c = legalConfig;
  switch (page) {
    case 'privacy': return [
      { id: 'titolare', title: '1. Titolare del trattamento', body: <>
        <p>ItalFUT è un progetto gestito da {operator(c)}, che è il titolare del trattamento.{!isPrivate ? <> Sede legale: {v(c.registeredOffice)}.</> : null} Per qualsiasi richiesta usa il {contactForm}{orMail(c.privacyEmail)}{c.dpoContact ? <>. Responsabile della protezione dei dati: {c.dpoContact}</> : null}.</p>
        {isPrivate && <p>Anche se il progetto è gestito da un privato e senza scopo di lucro, il GDPR si applica per intero: il servizio è aperto al pubblico e tratta dati di altre persone.</p>}
        <p>Per i dati di giocatori, staff e partecipanti inseriti in un torneo, l’organizzatore che li carica agisce come titolare autonomo e deve informare gli interessati. ItalFUT tratta tali dati per suo conto come fornitore della piattaforma; i rispettivi ruoli vanno formalizzati con un accordo (art. 28 GDPR).</p>
      </> },
      { id: 'dati', title: '2. Dati che trattiamo', body: <ul>
        <li><b>Account organizzatore:</b> username e password (conservata solo in forma cifrata con hash), codice di recupero (anch’esso cifrato), data di creazione e ultimi accessi. Non chiediamo né conserviamo indirizzi email.</li>
        <li><b>Richieste dal modulo Contatti:</b> argomento, messaggio e, solo se lo inserisci tu, un recapito per la risposta.</li>
        <li><b>Contenuti del torneo:</b> nomi di competizioni e squadre, nomi e cognomi dei giocatori, numero di maglia, ruolo, risultati, eventi di gara, immagini o link inseriti dall’organizzatore.</li>
        <li><b>Minorenni:</b> fascia d’età (maggiorenne/minorenne) e la conferma dell’organizzatore di aver raccolto l’autorizzazione del genitore o tutore. Non raccogliamo date di nascita, documenti o dati dei genitori.</li>
        <li><b>Dati tecnici:</b> indirizzo IP e informazioni del browser nei log di sicurezza del fornitore di hosting e del database.</li>
        {!paymentsActive && <li><b>Pagamenti:</b> nessuno. ItalFUT non chiede e non conserva dati di carte, conti o fatturazione.</li>}
      </ul> },
      { id: 'finalita', title: '3. Finalità e basi giuridiche', body: <div className="table-wrap"><table className="legal-table">
        <thead><tr><th>Finalità</th><th>Base giuridica</th></tr></thead>
        <tbody>
          <tr><td>Creare e gestire l’account, erogare la piattaforma</td><td>Esecuzione del contratto (art. 6.1.b GDPR)</td></tr>
          <tr><td>Pubblicare i contenuti del torneo scelti dall’organizzatore</td><td>Esecuzione del contratto con l’organizzatore; per i dati dei partecipanti, la base giuridica individuata dall’organizzatore</td></tr>
          <tr><td>Sicurezza, prevenzione abusi, log tecnici</td><td>Legittimo interesse (art. 6.1.f GDPR)</td></tr>
          {paymentsActive ? <tr><td>Adempimenti fiscali e contabili sui pagamenti</td><td>Obbligo di legge (art. 6.1.c GDPR)</td></tr>
            : <tr><td>Rispondere alle richieste inviate dal modulo Contatti</td><td>Esecuzione del contratto o misure precontrattuali (art. 6.1.b GDPR); legittimo interesse per le richieste senza account</td></tr>}
        </tbody></table></div> },
      { id: 'destinatari', title: '4. Fornitori e trasferimenti', body: <>
        <p>Usiamo solo due fornitori, entrambi necessari al funzionamento: {c.databaseProvider} per database e autenticazione (regione {v(c.serverRegion)}) e {v(c.hostingProvider)} per dominio, DNS, rete di distribuzione e hosting del sito. Agiscono come responsabili del trattamento. Nessun altro servizio esterno riceve i tuoi dati.</p>
        <p>Alcuni fornitori hanno sede negli Stati Uniti: eventuali trasferimenti avvengono sulla base delle Clausole Contrattuali Standard della Commissione europea o del Data Privacy Framework, ove applicabile. Non vendiamo dati e non usiamo strumenti pubblicitari o di profilazione.</p>
      </> },
      { id: 'conservazione', title: '5. Per quanto tempo', body: <ul>
        <li>Account: {v(c.accountRetention)}</li>
        <li>Dati dei tornei: {v(c.tenantRetention)}</li>
        <li>Log tecnici: {v(c.logRetention)}</li>
        <li>Richieste dal modulo Contatti: {c.requestRetention}</li>
        {paymentsActive && <li>Documenti fiscali: {v(c.legalRecordsRetention)}</li>}
        <li>Puoi cancellare in autonomia tornei e account dalla pagina <RouterLink to="/account">Account e dati</RouterLink>. Le copie di backup del fornitore vengono sovrascritte secondo i suoi cicli di rotazione.</li>
      </ul> },
      { id: 'diritti', title: '6. I tuoi diritti', body: <>
        <p>Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità e opporti al trattamento (artt. 15–22 GDPR) tramite il {contactForm}{orMail(c.privacyEmail)}. Rispondiamo entro un mese. Puoi anche scaricare i tuoi dati e cancellare tornei e account in autonomia dalla pagina <RouterLink to="/account">Account e dati</RouterLink>.</p>
        <p>Hai diritto di proporre reclamo al Garante per la protezione dei dati personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">garanteprivacy.it</a>).</p>
      </> },
      { id: 'minori', title: '7. Minorenni', body: <>
        <p>Gli account organizzatore sono riservati ai maggiorenni: lo dichiari in fase di registrazione. Questa dichiarazione non è una verifica dell’età.</p>
        <p>Prima di pubblicare nome o foto di un atleta minorenne, l’organizzatore deve ottenere l’autorizzazione di chi esercita la responsabilità genitoriale e conservarne prova. La piattaforma registra chi ha confermato e quando, e non mostra pubblicamente i giocatori minorenni senza questa conferma. Genitori e tutori possono chiedere la rimozione tramite il {contactForm}, argomento “Dati o foto di un minore”, anche senza account.</p>
      </> },
      { id: 'sicurezza', title: '8. Sicurezza', body: <p>Connessioni cifrate (HTTPS), isolamento dei dati tra tornei con regole di sicurezza a livello di database, password mai visibili al personale, intestazioni di sicurezza del browser e accessi amministrativi limitati.</p> },
      { id: 'modifiche', title: '9. Modifiche', body: <p>Pubblicheremo qui ogni aggiornamento indicando la data della versione. Le modifiche sostanziali saranno segnalate agli organizzatori nella console.</p> },
    ];
    case 'terms': return [
      { id: 'oggetto', title: '1. Il servizio', body: <>
        <p>ItalFUT è una piattaforma per organizzare competizioni calcistiche: gestione di squadre, giocatori, partite e classifiche, con un sito pubblico per ciascun torneo. È un progetto gestito da {operator(c)}.</p>
        {isPrivate && <p>ItalFUT è in fase di lancio e viene offerto <b>gratuitamente</b>: per usarlo non è richiesto né accettato alcun pagamento. Il servizio è in continuo sviluppo e alcune funzioni possono cambiare.</p>}
      </> },
      { id: 'account', title: '2. Account', body: <ul>
        <li>Per creare un account devi avere almeno 18 anni e fornire dati veritieri.</li>
        <li>Sei responsabile della riservatezza di username e password e di quanto avviene con il tuo account.</li>
        <li>Puoi chiudere l’account in qualsiasi momento dalla pagina <RouterLink to="/account">Account e dati</RouterLink>.</li>
      </ul> },
      { id: 'contenuti', title: '3. Contenuti dell’organizzatore', body: <ul>
        <li>Pubblichi solo contenuti su cui hai i diritti (nomi, loghi, foto) e solo i dati personali necessari.</li>
        <li>Per i minorenni devi raccogliere e conservare l’autorizzazione di genitori o tutori prima della pubblicazione.</li>
        <li>Sono vietati contenuti illeciti, offensivi o che violino diritti di terzi: possiamo rimuoverli e sospendere l’account dopo averti avvisato, salvo urgenze.</li>
      </ul> },
      { id: 'prezzi', title: isPrivate ? '4. Gratuità, prezzi indicativi e moduli' : '4. Prezzi e attivazioni', body: isPrivate ? <>
        <p>Oggi ItalFUT è gratuito. I prezzi mostrati nel configuratore e nella console sono <b>solo indicativi</b> del listino che potrebbe essere applicato in futuro: non vengono addebitati e non costituiscono un’offerta di vendita.</p>
        <p>I moduli aggiuntivi si richiedono dalla console: la richiesta viene valutata e, se accolta, il modulo viene attivato senza costi. Nessuna funzione già attiva viene tolta per obbligarti a pagare.</p>
        <p>Se in futuro il servizio diventerà a pagamento, lo comunicheremo nella console con almeno 30 giorni di anticipo, insieme a nuove condizioni che dovrai accettare in modo esplicito: senza la tua accettazione e un acquisto da parte tua non sarà addebitato nulla, e potrai esportare i dati e chiudere l’account.</p>
      </> : <>
        <p>Il configuratore mostra prezzi mensili per la piattaforma base e per ogni modulo, gli sconti per durata e il totale, senza voci nascoste. Trattamento IVA: {vatNote}.</p>
        <p>{paymentsActive ? 'I pagamenti avvengono solo dopo il riepilogo definitivo' : 'Allo stato attuale non è attivo alcun pagamento online e nessun importo viene addebitato. Prima di qualsiasi acquisto riceverai il riepilogo definitivo'} con prezzo totale, metodi di pagamento ({v(c.acceptedPaymentMethods)}), decorrenza ({v(c.billingStartCondition)}) e rinnovo ({v(c.autoRenewal)}).</p>
      </> },
      { id: 'disponibilita', title: '5. Disponibilità e responsabilità', body: <p>{isPrivate ? 'Il servizio è gratuito e gestito da una sola persona: facciamo il possibile per mantenerlo disponibile e sicuro, ma possono verificarsi interruzioni per manutenzione o cause esterne e non sono garantiti livelli minimi di servizio. Ti consigliamo di esportare periodicamente i tuoi dati dalla pagina Account. ' : 'Ci impegniamo a mantenere il servizio disponibile e sicuro, ma possono verificarsi interruzioni per manutenzione o cause esterne. '}Nei limiti consentiti dalla legge non rispondiamo di danni indiretti; restano salvi i casi di dolo o colpa grave e i diritti inderogabili dei consumatori.</p> },
      { id: 'recesso', title: '6. Durata, recesso e chiusura', body: isPrivate
        ? <p>Puoi smettere di usare ItalFUT e cancellare tornei e account quando vuoi, senza costi. Se il progetto dovesse essere sospeso o chiuso, lo comunicheremo nella console con almeno 30 giorni di anticipo, salvo cause di forza maggiore, così da permetterti di esportare i dati.</p>
        : <p>Il servizio dura per il periodo scelto. Le regole su recesso e rimborsi sono descritte nella pagina <RouterLink to="/refund-policy">{titleMap.refund}</RouterLink>. Alla chiusura puoi esportare i dati e poi cancellarli.</p> },
      { id: 'legge', title: '7. Legge applicabile e controversie', body: <p>Si applica la legge italiana ({c.jurisdiction}). Se agisci come consumatore è competente il giudice del luogo della tua residenza o domicilio.{paymentsActive ? ' È disponibile la piattaforma europea di risoluzione delle controversie online e, in alternativa, le procedure ADR previste dal Codice del Consumo.' : ''}</p> },
      { id: 'contatti', title: '8. Contatti', body: <p>Assistenza tramite il {contactForm}{orMail(c.supportEmail)}{c.telephone ? <> · Tel. {c.telephone}</> : null}.{!isPrivate || c.certifiedEmail ? <> PEC: {isPrivate ? mail(c.certifiedEmail) : v(c.certifiedEmail)}.</> : null}</p> },
    ];
    case 'refund': return isPrivate ? [
      { id: 'stato', title: '1. Oggi ItalFUT è gratuito', body: <ul>
        <li>Nessun pagamento è richiesto per creare un account, aprire tornei o usare i moduli attivati.</li>
        <li>La piattaforma non accetta pagamenti e non raccoglie dati di carte, conti o fatturazione: non c’è nulla da rimborsare.</li>
        <li>I prezzi del configuratore sono indicativi del possibile listino futuro: servono a farti capire quanto costerebbe la configurazione scelta, non vengono addebitati.</li>
      </ul> },
      { id: 'attenzione', title: '2. Attenzione alle richieste di denaro', body: <p>Nessuno può chiederti denaro per conto di ItalFUT. Se ricevi una richiesta di pagamento che sembra provenire da ItalFUT, non pagare e segnalacela tramite il {contactForm}.</p> },
      { id: 'futuro', title: '3. Se in futuro diventasse a pagamento', body: <>
        <p>I pagamenti verranno attivati solo dopo aver regolarizzato la gestione del servizio (con l’apertura della partita IVA) e pubblicato in questa pagina e in <RouterLink to="/business">Chi gestisce ItalFUT</RouterLink> i dati fiscali e le condizioni complete: prezzi, metodi di pagamento, rinnovo, recesso e rimborsi.</p>
        <p>Lo comunicheremo nella console con almeno 30 giorni di anticipo e nulla verrà addebitato senza un tuo acquisto esplicito. Se acquisterai come consumatore, avrai il diritto di recesso entro 14 giorni previsto dal Codice del Consumo.</p>
      </> },
    ] : [
      { id: 'stato', title: '1. Situazione attuale', body: <p>{paymentsActive ? 'Questa pagina descrive le regole di recesso e rimborso dei servizi a pagamento.' : 'ItalFUT oggi non effettua addebiti: il configuratore produce un preventivo indicativo e i moduli aggiuntivi si richiedono senza pagamento. Questa pagina descrive le regole che si applicheranno quando i pagamenti saranno attivi.'}</p> },
      { id: 'recesso', title: '2. Diritto di recesso (consumatori)', body: <>
        <p>Se sei un consumatore, puoi recedere entro 14 giorni dalla conclusione del contratto senza indicarne il motivo (artt. 52 e ss. Codice del Consumo), comunicandolo tramite il {contactForm} (argomento “Pagamenti e rimborsi”){orMail(c.refundContact || c.supportEmail)}.</p>
        <p>Se chiedi espressamente che il servizio inizi prima della fine dei 14 giorni, in caso di recesso pagherai solo la quota proporzionale al servizio già fornito. Non useremo caselle preselezionate per questa richiesta.</p>
      </> },
      { id: 'rimborsi', title: '3. Come avviene il rimborso', body: <ul>
        <li>Rimborso entro 14 giorni dalla comunicazione di recesso, con lo stesso mezzo di pagamento usato, senza costi aggiuntivi.</li>
        <li>Per abbonamenti pluri-mensili annullati dopo il periodo di recesso: {v(c.autoRenewal)}.</li>
        <li>Nessuna esclusione generalizzata del rimborso e nessuna penale nascosta.</li>
      </ul> },
      { id: 'b2b', title: '4. Clienti professionali', body: <p>Per chi acquista come impresa o associazione con partita IVA (rapporto B2B) il diritto di recesso del Codice del Consumo non si applica; valgono le condizioni contrattuali specifiche. Tipologia di clienti servita: {v(c.contractualCustomerTypes)}.</p> },
    ];
    case 'cookies': return [
      { id: 'cosa', title: '1. Cosa usiamo', body: <>
        <p>ItalFUT usa esclusivamente strumenti tecnici, necessari al funzionamento del sito o a ricordare le tue scelte. Non usiamo cookie di profilazione, pixel pubblicitari o analytics di terze parti. I caratteri tipografici sono ospitati sui nostri server: non contattiamo servizi esterni al caricamento della pagina.</p>
        <div className="table-wrap"><table className="legal-table">
          <thead><tr><th>Nome</th><th>Fornitore</th><th>Scopo</th><th>Durata</th><th>Categoria</th><th>Tipo</th></tr></thead>
          <tbody>{storageRows.map(row => <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{index === 0 ? <code>{cell}</code> : cell}</td>)}</tr>)}</tbody>
        </table></div>
      </> },
      { id: 'terzi', title: '2. Contenuti di terze parti', body: <p>Le pagine pubbliche dei tornei possono mostrare immagini ospitate su siti esterni indicati dagli organizzatori: il browser le scarica direttamente da quei siti, che ricevono l’indirizzo IP. Non inviamo il referrer a questi siti.</p> },
      { id: 'scelte', title: '3. Le tue scelte', body: <>
        <p>Gli strumenti tecnici non richiedono consenso (art. 122 Codice Privacy; Linee guida del Garante del 10 giugno 2021). Se in futuro introdurremo strumenti facoltativi, resteranno bloccati finché non li accetti e potrai rifiutarli con la stessa facilità.</p>
        <p><button type="button" className="link-button" onClick={openPreferences}>Apri le preferenze cookie</button> · Puoi anche cancellare i dati salvati dalle impostazioni del browser.</p>
      </> },
    ];
    case 'business': return [];
  }
}

export function LegalPage({ page }: { page: LegalPageId }) {
  const { openPreferences } = useCookiePreferences();
  const list = sections(page, openPreferences);
  return <div className="page legal">
    <div className="page-glow" aria-hidden="true" />
    <div className="container legal__grid">
      <aside className="legal__aside">
        <ScrollRail as="nav" label="Documenti legali" className="legal__docs" activeKey={page}>
          {(Object.keys(titleMap) as LegalPageId[]).map(id => <NavLink key={id}
            to={{ privacy: '/privacy-policy', terms: '/terms-of-service', refund: '/refund-policy', cookies: '/cookie-policy', business: '/business' }[id]}
            className={({ isActive }) => isActive ? 'is-active' : ''}>{titleMap[id]}</NavLink>)}
        </ScrollRail>
        {list.length > 0 && <nav aria-label="In questa pagina" className="legal__toc">
          <p>In questa pagina</p>
          {list.map(section => <a key={section.id} href={'#' + section.id}>{section.title.replace(/^\d+\.\s/, '')}</a>)}
        </nav>}
      </aside>
      <article className="legal__body">
        <header className="legal__head">
          <h1 className="page-title">{titleMap[page]}</h1>
          <p className="lead">{summaryMap[page]}</p>
          <p className="legal__version">Versione: {LEGAL_VERSION}{legalConfig.lastReviewedOn ? ' · revisionata il ' + legalConfig.lastReviewedOn : ''}</p>
        </header>
        {legalNeedsReview && <Alert severity="warning" sx={{ mb: 4 }}>
          {isPrivate ? 'Bozza in revisione: i campi indicati come “da completare” verranno compilati con i dati reali del gestore prima della pubblicazione del servizio.' : 'Bozza in revisione: i campi indicati come “da completare” verranno compilati con i dati reali dell’operatore prima dell’apertura commerciale del servizio.'}
        </Alert>}
        {page === 'business' ? <section className="legal__section">
          {isPrivate ? <>
            <p>ItalFUT è un progetto personale: non è una società né un’attività d’impresa. Lo ha ideato e lo gestisce una persona fisica, a titolo non professionale, insieme agli altri suoi progetti su <a href={madeBy.url} target="_blank" rel="noopener">{madeBy.label}</a>.</p>
            <p>Per questo oggi il servizio è <b>gratuito</b>: non ci sono partita IVA, fatture o pagamenti, e la piattaforma non accetta denaro. Se in futuro ItalFUT diventerà a pagamento, prima di qualsiasi addebito qui verranno pubblicati i dati fiscali di chi lo gestirà (partita IVA, sede, recapiti) e verranno aggiornati i termini.</p>
          </> : <p>ItalFUT è il nome di un progetto e di una piattaforma realizzati dall’operatore indicato qui sotto: non è una società autonoma. Altri progetti dell’operatore: <a href={madeBy.url} target="_blank" rel="noopener">{madeBy.label}</a>.</p>}
          <h2>{isPrivate ? 'Chi è' : 'Dati identificativi'}</h2>
          <dl className="legal__dl">{requiredLegalFields.filter(field => field.key !== 'dpoContact' || legalConfig.dpoContact).map(field => <Fragment key={field.key}>
            <dt>{field.label}</dt><dd>{field.key.toLowerCase().includes('email') ? mail(String(legalConfig[field.key] ?? '')) : v(String(legalConfig[field.key] ?? ''))}</dd>
          </Fragment>)}
            <dt>Contatti</dt><dd>{contactForm}{orMail(legalConfig.supportEmail)} — le richieste arrivano direttamente al gestore e la risposta compare nella pagina Account (o al recapito che indichi, se scrivi senza account).</dd>
            {isPrivate && legalConfig.telephone && <><dt>Telefono</dt><dd><a href={'tel:' + legalConfig.telephone.replace(/\s+/g, '')}>{legalConfig.telephone}</a></dd></>}
            {isPrivate && legalConfig.certifiedEmail && <><dt>PEC</dt><dd>{mail(legalConfig.certifiedEmail)}</dd></>}
          </dl>
          <h2>Infrastruttura</h2>
          <dl className="legal__dl">
            <dt>Dominio, DNS e hosting</dt><dd>{v(legalConfig.hostingProvider)}</dd>
            <dt>Database e autenticazione</dt><dd>{legalConfig.databaseProvider} · {v(legalConfig.serverRegion)}</dd>
            {legalConfig.officialDomain && <><dt>Dominio ufficiale</dt><dd>{legalConfig.officialDomain}</dd></>}
          </dl>
        </section> : list.map(section => <section className="legal__section" id={section.id} key={section.id}>
          <h2>{section.title}</h2>{section.body}
        </section>)}
      </article>
    </div>
  </div>;
}
