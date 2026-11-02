import { Fragment, type ReactNode } from 'react';
import { Alert } from '@mui/material';
import { Link as RouterLink, NavLink } from 'react-router-dom';
import { LEGAL_VERSION, legalConfig, legalNeedsReview, madeBy, requiredLegalFields, vatNote } from '../config/legal';
import { useCookiePreferences } from '../components/CookieNotice';

export type LegalPageId = 'privacy' | 'terms' | 'refund' | 'cookies' | 'business';
type Section = { id: string; title: string; body: ReactNode };

const v = (text: string | null | undefined): ReactNode =>
  text ? <span>{text}</span> : <span className="legal-missing">da completare</span>;
const mail = (address: string) => address ? <a href={'mailto:' + address}>{address}</a> : <span className="legal-missing">da completare</span>;

const titleMap: Record<LegalPageId, string> = {
  privacy: 'Privacy policy',
  terms: 'Termini di servizio',
  refund: 'Rimborsi e diritto di recesso',
  cookies: 'Cookie policy',
  business: 'Informazioni sull’operatore',
};
const summaryMap: Record<LegalPageId, string> = {
  privacy: 'Quali dati trattiamo, perché, per quanto tempo e come puoi esercitare i tuoi diritti.',
  terms: 'Le regole d’uso di ItalFUT per organizzatori e visitatori.',
  refund: 'Come funzionano recesso e rimborsi per i servizi a pagamento.',
  cookies: 'Gli strumenti che salvano informazioni sul tuo dispositivo e come gestirli.',
  business: 'Dati identificativi e recapiti del titolare del servizio.',
};

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
        <p>ItalFUT è un progetto realizzato e gestito da {v(c.operatorName)}, che è il titolare del trattamento. Sede legale: {v(c.registeredOffice)}. Contatto privacy: {mail(c.privacyEmail)}{c.dpoContact ? <>. Responsabile della protezione dei dati: {c.dpoContact}</> : null}.</p>
        <p>Per i dati di giocatori, staff e partecipanti inseriti in un torneo, l’organizzatore che li carica agisce come titolare autonomo e deve informare gli interessati. ItalFUT tratta tali dati per suo conto come fornitore della piattaforma; i rispettivi ruoli vanno formalizzati con un accordo (art. 28 GDPR).</p>
      </> },
      { id: 'dati', title: '2. Dati che trattiamo', body: <ul>
        <li><b>Account organizzatore:</b> username, indirizzo email, password (conservata dal servizio di autenticazione solo in forma cifrata con hash), data di creazione e accessi.</li>
        <li><b>Contenuti del torneo:</b> nomi di competizioni e squadre, nomi e cognomi dei giocatori, numero di maglia, ruolo, risultati, eventi di gara, immagini o link inseriti dall’organizzatore.</li>
        <li><b>Minorenni:</b> fascia d’età (maggiorenne/minorenne) e la conferma dell’organizzatore di aver raccolto l’autorizzazione del genitore o tutore. Non raccogliamo date di nascita, documenti o dati dei genitori.</li>
        <li><b>Dati tecnici:</b> indirizzo IP e informazioni del browser nei log di sicurezza del fornitore di hosting e del database.</li>
      </ul> },
      { id: 'finalita', title: '3. Finalità e basi giuridiche', body: <div className="table-wrap"><table className="legal-table">
        <thead><tr><th>Finalità</th><th>Base giuridica</th></tr></thead>
        <tbody>
          <tr><td>Creare e gestire l’account, erogare la piattaforma</td><td>Esecuzione del contratto (art. 6.1.b GDPR)</td></tr>
          <tr><td>Pubblicare i contenuti del torneo scelti dall’organizzatore</td><td>Esecuzione del contratto con l’organizzatore; per i dati dei partecipanti, la base giuridica individuata dall’organizzatore</td></tr>
          <tr><td>Sicurezza, prevenzione abusi, log tecnici</td><td>Legittimo interesse (art. 6.1.f GDPR)</td></tr>
          <tr><td>Adempimenti fiscali e contabili (quando saranno attivi i pagamenti)</td><td>Obbligo di legge (art. 6.1.c GDPR)</td></tr>
        </tbody></table></div> },
      { id: 'destinatari', title: '4. Fornitori e trasferimenti', body: <>
        <p>Usiamo solo due fornitori, entrambi necessari al funzionamento: {c.databaseProvider} per database, autenticazione ed email di servizio (regione {v(c.serverRegion)}) e {v(c.hostingProvider)} per dominio, DNS, rete di distribuzione e hosting del sito. Agiscono come responsabili del trattamento. Nessun altro servizio esterno riceve i tuoi dati.</p>
        <p>Alcuni fornitori hanno sede negli Stati Uniti: eventuali trasferimenti avvengono sulla base delle Clausole Contrattuali Standard della Commissione europea o del Data Privacy Framework, ove applicabile. Non vendiamo dati e non usiamo strumenti pubblicitari o di profilazione.</p>
      </> },
      { id: 'conservazione', title: '5. Per quanto tempo', body: <ul>
        <li>Account: {v(c.accountRetention)}</li>
        <li>Dati dei tornei: {v(c.tenantRetention)}</li>
        <li>Log tecnici: {v(c.logRetention)}</li>
        <li>Documenti fiscali: {v(c.legalRecordsRetention)}</li>
        <li>Puoi cancellare in autonomia tornei e account dalla pagina <RouterLink to="/account">Account e dati</RouterLink>. Le copie di backup del fornitore vengono sovrascritte secondo i suoi cicli di rotazione.</li>
      </ul> },
      { id: 'diritti', title: '6. I tuoi diritti', body: <>
        <p>Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità e opporti al trattamento (artt. 15–22 GDPR) scrivendo a {mail(c.privacyEmail)}. Rispondiamo entro un mese.</p>
        <p>Hai diritto di proporre reclamo al Garante per la protezione dei dati personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">garanteprivacy.it</a>).</p>
      </> },
      { id: 'minori', title: '7. Minorenni', body: <>
        <p>Gli account organizzatore sono riservati ai maggiorenni: lo dichiari in fase di registrazione. Questa dichiarazione non è una verifica dell’età.</p>
        <p>Prima di pubblicare nome o foto di un atleta minorenne, l’organizzatore deve ottenere l’autorizzazione di chi esercita la responsabilità genitoriale e conservarne prova. La piattaforma registra chi ha confermato e quando, e non mostra pubblicamente i giocatori minorenni senza questa conferma. Genitori e tutori possono chiedere la rimozione scrivendo a {mail(c.privacyEmail)}.</p>
      </> },
      { id: 'sicurezza', title: '8. Sicurezza', body: <p>Connessioni cifrate (HTTPS), isolamento dei dati tra tornei con regole di sicurezza a livello di database, password mai visibili al personale, intestazioni di sicurezza del browser e accessi amministrativi limitati.</p> },
      { id: 'modifiche', title: '9. Modifiche', body: <p>Pubblicheremo qui ogni aggiornamento indicando la data della versione. Le modifiche sostanziali saranno comunicate agli organizzatori via email.</p> },
    ];
    case 'terms': return [
      { id: 'oggetto', title: '1. Il servizio', body: <p>ItalFUT è un progetto realizzato e gestito da {v(c.operatorName)}: una piattaforma per organizzare competizioni calcistiche: gestione di squadre, giocatori, partite e classifiche, con un sito pubblico per ciascun torneo. Le funzioni disponibili dipendono dai moduli attivi.</p> },
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
      { id: 'prezzi', title: '4. Prezzi e attivazioni', body: <>
        <p>Il configuratore mostra prezzi mensili per la piattaforma base e per ogni modulo, gli sconti per durata e il totale, senza voci nascoste. Trattamento IVA: {vatNote}.</p>
        <p>Allo stato attuale non è attivo alcun pagamento online e nessun importo viene addebitato. Le richieste di moduli aggiuntivi non attivano né addebitano nulla. Prima di qualsiasi acquisto riceverai il riepilogo definitivo con prezzo totale, metodi di pagamento ({v(c.acceptedPaymentMethods)}), decorrenza ({v(c.billingStartCondition)}) e rinnovo ({v(c.autoRenewal)}).</p>
      </> },
      { id: 'disponibilita', title: '5. Disponibilità e responsabilità', body: <p>Ci impegniamo a mantenere il servizio disponibile e sicuro, ma possono verificarsi interruzioni per manutenzione o cause esterne. Nei limiti consentiti dalla legge non rispondiamo di danni indiretti; restano salvi i diritti inderogabili dei consumatori.</p> },
      { id: 'recesso', title: '6. Durata, recesso e chiusura', body: <p>Il servizio dura per il periodo scelto. Le regole su recesso e rimborsi sono descritte nella pagina <RouterLink to="/refund-policy">Rimborsi e recesso</RouterLink>. Alla chiusura puoi esportare i dati e poi cancellarli.</p> },
      { id: 'legge', title: '7. Legge applicabile e controversie', body: <p>Si applica la legge italiana ({c.jurisdiction}). Per i consumatori è competente il giudice del luogo di residenza o domicilio. È disponibile la piattaforma europea di risoluzione delle controversie online e, in alternativa, le procedure ADR previste dal Codice del Consumo.</p> },
      { id: 'contatti', title: '8. Contatti', body: <p>Assistenza: {mail(c.supportEmail)}{c.telephone ? <> · Tel. {c.telephone}</> : null}. PEC: {v(c.certifiedEmail)}.</p> },
    ];
    case 'refund': return [
      { id: 'stato', title: '1. Situazione attuale', body: <p>ItalFUT oggi non effettua addebiti: il configuratore produce un preventivo indicativo e i moduli aggiuntivi si richiedono senza pagamento. Questa pagina descrive le regole che si applicheranno quando i pagamenti saranno attivi.</p> },
      { id: 'recesso', title: '2. Diritto di recesso (consumatori)', body: <>
        <p>Se sei un consumatore, puoi recedere entro 14 giorni dalla conclusione del contratto senza indicarne il motivo (artt. 52 e ss. Codice del Consumo), comunicandolo a {mail(c.refundContact || c.supportEmail)}.</p>
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
        <nav aria-label="Documenti legali" className="legal__docs">
          {(Object.keys(titleMap) as LegalPageId[]).map(id => <NavLink key={id}
            to={{ privacy: '/privacy-policy', terms: '/terms-of-service', refund: '/refund-policy', cookies: '/cookie-policy', business: '/business' }[id]}
            className={({ isActive }) => isActive ? 'is-active' : ''}>{titleMap[id]}</NavLink>)}
        </nav>
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
          Bozza in revisione: i campi indicati come “da completare” verranno compilati con i dati reali dell’operatore prima dell’apertura commerciale del servizio.
        </Alert>}
        {page === 'business' ? <section className="legal__section">
          <p>ItalFUT è il nome di un progetto e di una piattaforma realizzati dall’operatore indicato qui sotto: non è una società autonoma. Altri progetti dell’operatore: <a href={madeBy.url} target="_blank" rel="noopener">{madeBy.label}</a>.</p>
          <h2>Dati identificativi</h2>
          <dl className="legal__dl">{requiredLegalFields.filter(field => field.key !== 'dpoContact' || legalConfig.dpoContact).map(field => <Fragment key={field.key}>
            <dt>{field.label}</dt><dd>{field.key.toLowerCase().includes('email') ? mail(String(legalConfig[field.key] ?? '')) : v(String(legalConfig[field.key] ?? ''))}</dd>
          </Fragment>)}</dl>
          <h2>Infrastruttura</h2>
          <dl className="legal__dl">
            <dt>Dominio, DNS e hosting</dt><dd>{v(legalConfig.hostingProvider)}</dd>
            <dt>Database e autenticazione</dt><dd>{legalConfig.databaseProvider} · {v(legalConfig.serverRegion)}</dd>
            <dt>Dominio ufficiale</dt><dd>{v(legalConfig.officialDomain)}</dd>
          </dl>
        </section> : list.map(section => <section className="legal__section" id={section.id} key={section.id}>
          <h2>{section.title}</h2>{section.body}
        </section>)}
      </article>
    </div>
  </div>;
}
