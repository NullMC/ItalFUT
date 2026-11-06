import type { ReactNode } from 'react';
import { ScrollRail } from '../components/ScrollRail';
import { Link as RouterLink, NavLink } from 'react-router-dom';
import { LEGAL_UPDATED, legalConfig, madeBy, vatNote } from '../config/legal';
import { useCookiePreferences } from '../components/CookieNotice';

export type LegalPageId = 'privacy' | 'terms' | 'refund' | 'cookies' | 'business';
type Section = { id: string; title: string; body: ReactNode };

const contactForm = <RouterLink to="/contatti">modulo Contatti</RouterLink>;
/** Optional extra channel: shown only if an address has been configured. */
const orMail = (address: string) => address ? <> o all’indirizzo <a href={'mailto:' + address}>{address}</a></> : null;

const titleMap: Record<LegalPageId, string> = {
  privacy: 'Privacy policy',
  terms: 'Termini di servizio',
  refund: 'Rimborsi e diritto di recesso',
  cookies: 'Cookie policy',
  business: 'Chi gestisce ItalFUT',
};
const summaryMap: Record<LegalPageId, string> = {
  privacy: 'Quali dati trattiamo, perché, per quanto tempo e come puoi esercitare i tuoi diritti.',
  terms: 'Le regole d’uso di ItalFUT per organizzatori e visitatori.',
  refund: 'Come funzionano recesso e rimborsi per i servizi a pagamento.',
  cookies: 'Gli strumenti che salvano informazioni sul tuo dispositivo e come gestirli.',
  business: 'Chi c’è dietro ItalFUT, come contattarlo e su quale infrastruttura funziona.',
};
const paths: Record<LegalPageId, string> = {
  privacy: '/privacy-policy', terms: '/terms-of-service', refund: '/refund-policy', cookies: '/cookie-policy', business: '/business',
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
        <p>ItalFUT è gestito da {c.operatorName}, titolare del trattamento (vedi <RouterLink to="/business">Chi gestisce ItalFUT</RouterLink>). Per qualsiasi richiesta usa il {contactForm}{orMail(c.supportEmail)}.</p>
        <p>Per i dati di giocatori, staff e partecipanti inseriti in un torneo, l’organizzatore che li carica agisce come titolare autonomo e deve informare gli interessati. ItalFUT tratta tali dati per suo conto come fornitore della piattaforma.</p>
      </> },
      { id: 'dati', title: '2. Dati che trattiamo', body: <ul>
        <li><b>Account organizzatore:</b> username e password (conservata solo in forma cifrata con hash), codice di recupero (anch’esso cifrato), data di creazione e ultimi accessi. Non chiediamo né conserviamo indirizzi email.</li>
        <li><b>Richieste dal modulo Contatti:</b> argomento, messaggio e, solo se lo inserisci tu, un recapito per la risposta.</li>
        <li><b>Contenuti del torneo:</b> nomi di competizioni e squadre, nomi e cognomi dei giocatori, numero di maglia, ruolo, risultati, eventi di gara, immagini caricate dall’organizzatore (convertite in WebP e conservate su Supabase Storage, nella stessa regione del database) o link a immagini esterne.</li>
        <li><b>Minorenni:</b> fascia d’età (maggiorenne/minorenne) e la conferma dell’organizzatore di aver raccolto l’autorizzazione del genitore o tutore. Non raccogliamo date di nascita, documenti o dati dei genitori.</li>
        <li><b>Dati tecnici:</b> indirizzo IP e informazioni del browser nei log di sicurezza del fornitore di hosting e del database.</li>
      </ul> },
      { id: 'finalita', title: '3. Finalità e basi giuridiche', body: <div className="table-wrap"><table className="legal-table">
        <thead><tr><th>Finalità</th><th>Base giuridica</th></tr></thead>
        <tbody>
          <tr><td>Creare e gestire l’account, erogare la piattaforma</td><td>Esecuzione del contratto (art. 6.1.b GDPR)</td></tr>
          <tr><td>Pubblicare i contenuti del torneo scelti dall’organizzatore</td><td>Esecuzione del contratto con l’organizzatore; per i dati dei partecipanti, la base giuridica individuata dall’organizzatore</td></tr>
          <tr><td>Rispondere alle richieste inviate dal modulo Contatti</td><td>Esecuzione del contratto o misure precontrattuali (art. 6.1.b GDPR); legittimo interesse per le richieste senza account</td></tr>
          <tr><td>Sicurezza, prevenzione abusi, log tecnici</td><td>Legittimo interesse (art. 6.1.f GDPR)</td></tr>
          <tr><td>Gestione dei pagamenti</td><td>Esecuzione del contratto e obblighi di legge (art. 6.1.b e 6.1.c GDPR)</td></tr>
        </tbody></table></div> },
      { id: 'destinatari', title: '4. Fornitori e trasferimenti', body: <>
        <p>Usiamo solo due fornitori, entrambi necessari al funzionamento: {c.databaseProvider} per database e autenticazione (regione {c.serverRegion}) e {c.hostingProvider} per dominio, DNS, rete di distribuzione e hosting del sito. Agiscono come responsabili del trattamento. Nessun altro servizio esterno riceve i tuoi dati.</p>
        <p>Alcuni fornitori hanno sede negli Stati Uniti: eventuali trasferimenti avvengono sulla base delle Clausole Contrattuali Standard della Commissione europea o del Data Privacy Framework, ove applicabile. Non vendiamo dati e non usiamo strumenti pubblicitari o di profilazione.</p>
      </> },
      { id: 'conservazione', title: '5. Per quanto tempo', body: <ul>
        <li>Account: {c.accountRetention}.</li>
        <li>Dati dei tornei: {c.tenantRetention}.</li>
        <li>Richieste dal modulo Contatti: {c.requestRetention}.</li>
        <li>Log tecnici: {c.logRetention}.</li>
        <li>Puoi cancellare in autonomia tornei e account dalla pagina <RouterLink to="/account">Account e dati</RouterLink>. Le copie di backup del fornitore vengono sovrascritte secondo i suoi cicli di rotazione.</li>
      </ul> },
      { id: 'diritti', title: '6. I tuoi diritti', body: <>
        <p>Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità e opporti al trattamento (artt. 15–22 GDPR) tramite il {contactForm}{orMail(c.supportEmail)}. Rispondiamo entro un mese. Puoi anche scaricare i tuoi dati e cancellare tornei e account in autonomia dalla pagina <RouterLink to="/account">Account e dati</RouterLink>.</p>
        <p>Hai diritto di proporre reclamo al Garante per la protezione dei dati personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">garanteprivacy.it</a>).</p>
      </> },
      { id: 'minori', title: '7. Minorenni', body: <>
        <p>Gli account organizzatore sono riservati ai maggiorenni: lo dichiari in fase di registrazione. Questa dichiarazione non è una verifica dell’età.</p>
        <p>Prima di pubblicare nome o foto di un atleta minorenne, l’organizzatore deve ottenere l’autorizzazione di chi esercita la responsabilità genitoriale e conservarne prova. La piattaforma registra chi ha confermato e quando, e non mostra pubblicamente i giocatori minorenni senza questa conferma. Genitori e tutori possono chiedere la rimozione tramite il {contactForm}, argomento “Dati o foto di un minore”, anche senza account.</p>
      </> },
      { id: 'sicurezza', title: '8. Sicurezza', body: <p>Connessioni cifrate (HTTPS), isolamento dei dati tra tornei con regole di sicurezza a livello di database, password mai visibili al personale, intestazioni di sicurezza del browser e accessi amministrativi limitati.</p> },
      { id: 'modifiche', title: '9. Modifiche', body: <p>Pubblicheremo qui ogni aggiornamento indicando la data. Le modifiche sostanziali saranno segnalate agli organizzatori nella console.</p> },
    ];
    case 'terms': return [
      { id: 'oggetto', title: '1. Il servizio', body: <p>ItalFUT è una piattaforma per organizzare competizioni calcistiche: gestione di squadre, giocatori, partite e classifiche, con un sito pubblico per ciascun torneo. Le funzioni disponibili dipendono dai moduli attivi. ItalFUT è gestito da {c.operatorName} (vedi <RouterLink to="/business">Chi gestisce ItalFUT</RouterLink>).</p> },
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
        <p>Il configuratore mostra prezzi mensili per la piattaforma base e per ogni modulo, gli sconti per durata e il totale, senza voci nascoste.{vatNote ? ' Prezzi ' + vatNote + '.' : ''}</p>
        <p>Allo stato attuale non è attivo alcun pagamento online e nessun importo viene addebitato. Le richieste di moduli aggiuntivi non attivano né addebitano nulla. Prima di qualsiasi acquisto riceverai il riepilogo definitivo con prezzo totale, metodo di pagamento e durata. Gli abbonamenti non si rinnovano automaticamente.</p>
      </> },
      { id: 'disponibilita', title: '5. Disponibilità e responsabilità', body: <p>Ci impegniamo a mantenere il servizio disponibile e sicuro, ma possono verificarsi interruzioni per manutenzione o cause esterne. Nei limiti consentiti dalla legge non rispondiamo di danni indiretti; restano salvi i casi di dolo o colpa grave e i diritti inderogabili dei consumatori.</p> },
      { id: 'recesso', title: '6. Durata, recesso e chiusura', body: <p>Il servizio dura per il periodo scelto. Le regole su recesso e rimborsi sono descritte nella pagina <RouterLink to="/refund-policy">Rimborsi e diritto di recesso</RouterLink>. Alla chiusura puoi esportare i dati e poi cancellarli.</p> },
      { id: 'legge', title: '7. Legge applicabile', body: <p>Si applica la legge italiana ({c.jurisdiction}). Se agisci come consumatore è competente il giudice del luogo della tua residenza o domicilio.</p> },
      { id: 'contatti', title: '8. Contatti', body: <p>Assistenza tramite il {contactForm}{orMail(c.supportEmail)}.</p> },
    ];
    case 'refund': return [
      { id: 'stato', title: '1. Situazione attuale', body: <p>ItalFUT oggi non effettua addebiti: il configuratore produce un preventivo e i moduli aggiuntivi si richiedono senza pagamento. Le regole qui sotto si applicano a ogni acquisto.</p> },
      { id: 'recesso', title: '2. Diritto di recesso (consumatori)', body: <>
        <p>Se sei un consumatore, puoi recedere entro 14 giorni dalla conclusione del contratto senza indicarne il motivo, comunicandolo tramite il {contactForm} (argomento “Pagamenti e rimborsi”){orMail(c.supportEmail)}.</p>
        <p>Se chiedi espressamente che il servizio inizi prima della fine dei 14 giorni, in caso di recesso pagherai solo la quota proporzionale al servizio già fornito. Non useremo caselle preselezionate per questa richiesta.</p>
      </> },
      { id: 'rimborsi', title: '3. Come avviene il rimborso', body: <ul>
        <li>Rimborso entro 14 giorni dalla comunicazione di recesso, con lo stesso mezzo di pagamento usato, senza costi aggiuntivi.</li>
        <li>Gli abbonamenti non si rinnovano automaticamente: alla scadenza scegli tu se rinnovare.</li>
        <li>Nessuna esclusione generalizzata del rimborso e nessuna penale nascosta.</li>
      </ul> },
      { id: 'b2b', title: '4. Clienti professionali', body: <p>Per chi acquista come impresa o associazione (rapporto B2B) il diritto di recesso dei consumatori non si applica; valgono le condizioni concordate.</p> },
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
        <p>Gli strumenti tecnici non richiedono consenso. Se in futuro introdurremo strumenti facoltativi, resteranno bloccati finché non li accetti e potrai rifiutarli con la stessa facilità.</p>
        <p><button type="button" className="link-button" onClick={openPreferences}>Apri le preferenze cookie</button> · Puoi anche cancellare i dati salvati dalle impostazioni del browser.</p>
      </> },
    ];
    case 'business': return [];
  }
}

export function LegalPage({ page }: { page: LegalPageId }) {
  const { openPreferences } = useCookiePreferences();
  const list = sections(page, openPreferences);
  const c = legalConfig;
  return <div className="page legal">
    <div className="page-glow" aria-hidden="true" />
    <div className="container legal__grid">
      <aside className="legal__aside">
        <ScrollRail as="nav" label="Documenti legali" className="legal__docs" activeKey={page}>
          {(Object.keys(titleMap) as LegalPageId[]).map(id => <NavLink key={id} to={paths[id]}
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
          {page !== 'business' && <p className="legal__version">Ultimo aggiornamento: {LEGAL_UPDATED}</p>}
        </header>
        {page === 'business' ? <section className="legal__section">
          <p>ItalFUT è un progetto ideato e gestito da {c.operatorName}. Altri progetti: <a href={madeBy.url} target="_blank" rel="noopener">{madeBy.label}</a>.</p>
          <h2>Gestore e contatti</h2>
          <dl className="legal__dl">
            <dt>Gestore</dt><dd>{c.operatorName}</dd>
            <dt>Contatti</dt><dd>{contactForm}{orMail(c.supportEmail)} — le richieste arrivano direttamente al gestore e la risposta compare nella pagina Account (o al recapito che indichi, se scrivi senza account).</dd>
          </dl>
          <h2>Infrastruttura</h2>
          <dl className="legal__dl">
            <dt>Dominio, DNS e hosting</dt><dd>{c.hostingProvider}</dd>
            <dt>Database e autenticazione</dt><dd>{c.databaseProvider} · {c.serverRegion}</dd>
            {c.officialDomain && <><dt>Dominio ufficiale</dt><dd>{c.officialDomain}</dd></>}
          </dl>
        </section> : list.map(section => <section className="legal__section" id={section.id} key={section.id}>
          <h2>{section.title}</h2>{section.body}
        </section>)}
      </article>
    </div>
  </div>;
}
