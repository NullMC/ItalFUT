import { Alert, Container, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { LEGAL_VERSION, legalConfig, legalNeedsReview, requiredLegalFields } from '../config/legal';

export type LegalPageId = 'privacy' | 'terms' | 'refund' | 'cookies' | 'business';
type Section = { title: string; paragraphs: string[] };
const missing = 'Da completare e verificare prima del lancio.';

function value(text: string) {
  return text ? <span>{text}</span> : <span className="legal-missing">{missing}</span>;
}
const titleMap: Record<LegalPageId, string> = {
  privacy: 'Privacy policy',
  terms: 'Termini di servizio',
  refund: 'Rimborsi e diritto di recesso',
  cookies: 'Cookie policy',
  business: 'Informazioni sull’operatore',
};
function sections(page: LegalPageId): Section[] {
  switch (page) {
    case 'privacy':
      return [
        { title: 'Chi tratta i dati', paragraphs: [
          'Il titolare del trattamento sarà indicato nei recapiti aziendali. Il gestore di ciascun torneo può agire come autonomo titolare per i dati dei partecipanti inseriti; ruoli e accordi tra le parti devono essere formalizzati caso per caso.',
          'Prima di conferire dati relativi a giocatori, staff, foto o nominativi, l’organizzatore deve disporre di una valida base giuridica e informare gli interessati.',
        ] },
        { title: 'Dati e finalità effettivamente previste', paragraphs: [
          'Registrazione: email, username e credenziali protette da Supabase Auth. Password gestite dal servizio di autenticazione, non memorizzate nel frontend ItalFUT.',
          'Gestione dei tornei: nomi, rose, risultati, eventi, premi, contenuti e collegamenti multimediali immessi dagli organizzatori. Dati tecnici di sessione e preferenza del tema nel browser.',
          'Non richiediamo nel modulo di iscrizione indirizzo postale, data di nascita, numero di telefono o documenti. Non usiamo nel codice attuale SDK pubblicitari o di analytics.',
        ] },
        { title: 'Basi giuridiche e destinatari', paragraphs: [
          'L’esecuzione del servizio può richiedere il trattamento di dati dell’account e dei tornei. La sicurezza del servizio e gli obblighi di legge possono costituire ulteriori basi giuridiche secondo la finalità concreta. I trattamenti che richiedono consenso devono restare facoltativi e separati.',
          'Supabase è il fornitore tecnico per database e autenticazione. Il sito può essere ospitato da un ulteriore provider che il titolare deve identificare. Occorre verificare accordi, sottoservizi, trasferimenti e localizzazione effettiva dei log.',
        ] },
        { title: 'Durata della conservazione', paragraphs: [
          'La durata deve essere documentata dal titolare in base alla finalità, alle necessità contrattuali e agli obblighi legali. Non sono definite qui scadenze di conservazione inventate.',
          'Una cancellazione dell’account non implica automaticamente la cancellazione di dati soggetti a conservazione legale o in possesso di organizzatori autonomi.',
        ] },
        { title: 'I tuoi diritti', paragraphs: [
          'Puoi chiedere accesso, rettifica, cancellazione ove applicabile, limitazione, portabilità e opposizione. Puoi inoltre presentare reclamo al Garante per la protezione dei dati personali.',
          'Dalla sezione account puoi richiedere o avviare la cancellazione. Le richieste riguardanti dati pubblicati da un organizzatore devono essere gestite con il coinvolgimento del titolare competente.',
        ] },
        { title: 'Minorenni', paragraphs: [
          'Gli account organizzatore sono riservati a persone maggiorenni: non chiediamo data di nascita, ma una dichiarazione esplicita in registrazione. Questo non costituisce verifica dell’età.',
          'Per pubblicare dati o fotografie di partecipanti minori l’organizzatore deve verificare, prima della pubblicazione, la base giuridica e le eventuali autorizzazioni dei genitori o di chi esercita la responsabilità genitoriale. Il semplice checkbox dell’organizzatore non sostituisce la documentazione necessaria.',
        ] },
      ];
    case 'terms':
      return [
        { title: 'Ambito del servizio', paragraphs: [
          'ItalFUT mette a disposizione strumenti per organizzare competizioni calcistiche, gestire squadre e partite e pubblicare informazioni sui tornei. Le funzionalità disponibili dipendono dai moduli effettivamente attivati.',
          'L’accesso come organizzatore è riservato a persone maggiorenni. L’organizzatore è responsabile della correttezza e liceità dei contenuti immessi e del trattamento dei dati dei partecipanti.',
        ] },
        { title: 'Prezzi e attivazioni', paragraphs: [
          'Il configuratore mostra un preventivo indicativo, con moduli, durata e sconti espliciti. Non viene effettuato alcun addebito durante la fase attuale: i pagamenti automatici non sono implementati.',
          'Prima di qualunque futura vendita dovranno essere pubblicati prezzi finali comprensivi dei tributi e costi applicabili, modalità di pagamento, condizioni di attivazione, rinnovo e cessazione, inclusa l’eventuale natura B2B/B2C del rapporto.',
          'Una richiesta di upgrade non attiva automaticamente né addebita moduli a pagamento.',
        ] },
        { title: 'Contenuti e disponibilità', paragraphs: [
          'Il proprietario del torneo garantisce di avere diritti adeguati su nomi, immagini, marchi, foto e materiali pubblicati. Gli organizzatori non devono inserire dati personali non necessari.',
          'Per richieste di rimozione di contenuti o contestazioni contatta l’operatore e, se applicabile, il responsabile del torneo indicato nella pagina pubblica.',
        ] },
        { title: 'Sospensione, recesso e chiusura', paragraphs: [
          'Le modalità contrattuali definitive, incluse durata, diritto di recesso, eventuale cancellazione del rinnovo e gestione del servizio a pagamento, richiedono approvazione e configurazione del titolare.',
          'Gli organizzatori possono chiedere la cancellazione degli spazi gestiti e del proprio account, compatibilmente con obblighi di conservazione e diritti di eventuali altri membri del torneo.',
        ] },
      ];
    case 'refund':
      return [
        { title: 'Stato attuale', paragraphs: [
          'Non è attivo un checkout né un sistema di addebito online in ItalFUT. I valori del configuratore sono preventivi indicativi e non provano un acquisto.',
          'Questa pagina è una bozza informativa da approvare prima dell’attivazione di qualsiasi servizio a pagamento.',
        ] },
        { title: 'Diritto di recesso del consumatore', paragraphs: [
          'Per contratti a distanza conclusi con consumatori nell’UE si applicano generalmente diritti di recesso entro 14 giorni, salvo condizioni ed eccezioni previste dalla legge. I contratti B2B hanno un regime differente.',
          'L’inizio immediato di servizi o contenuti digitali non comporta automaticamente perdita del diritto: eventuali dichiarazioni o consensi espressi, riconoscimenti e conferme contrattuali devono essere raccolti quando richiesti dalla legge.',
        ] },
        { title: 'Rimborsi e richieste', paragraphs: [
          'Il titolare deve ancora definire modalità di richiesta, tempi e metodi di rimborso, gestione di proroghe/upgrade e trattamento delle imposte. Non viene qui promessa alcuna esclusione generalizzata del rimborso.',
          'Per assistenza è necessario un indirizzo aziendale verificato disponibile nella pagina informazioni sull’operatore.',
        ] },
      ];
    case 'cookies':
      return [
        { title: 'Strumenti necessari effettivamente presenti', paragraphs: [
          'Supabase Auth conserva le credenziali tecniche di sessione nel browser per permettere il login. La preferenza del tema è memorizzata localmente e il configuratore usa dati di sessione. Una preferenza locale evita di ripetere continuamente l’avviso privacy.',
          'Al momento il codice applicativo non include analytics di terze parti, pixel di marketing o strumenti di profilazione. Il banner illustra gli strumenti tecnici e non simula consensi per tecnologie inesistenti.',
        ] },
        { title: 'Condivisioni e risorse esterne', paragraphs: [
          'Occorre verificare regolarmente font, risorse caricate da URL esterni inseriti dagli organizzatori, hosting, log di rete e qualsiasi SDK aggiunto dopo la presente revisione.',
          'Se saranno attivati tracciamenti non strettamente necessari, dovranno restare bloccati prima del consenso libero, granulare e revocabile.',
        ] },
        { title: 'Gestisci le tue scelte', paragraphs: [
          'Puoi riaprire in qualsiasi momento il pannello “Preferenze cookie” nel footer. Le preferenze salvate sul dispositivo possono essere rimosse dalle impostazioni del browser.',
          'Disabilitando archiviazione locale o tecnologie necessarie, alcune funzionalità, come l’accesso continuativo, potrebbero non essere disponibili.',
        ] },
      ];
    case 'business': return [];
  }
}

export function LegalPage({ page }: { page: LegalPageId }) {
  return <div className="legal-page"><Container maxWidth="md">
    <nav aria-label="Percorso" className="legal-breadcrumb"><RouterLink to="/">Home</RouterLink><span aria-hidden="true">/</span><span>{titleMap[page]}</span></nav>
    <Typography component="h1" variant="h2">{titleMap[page]}</Typography>
    <p className="legal-version">Versione: {LEGAL_VERSION}</p>
    {legalNeedsReview && <Alert severity="warning" sx={{ mb: 4 }}>
      **Documento in bozza:** i dati identificativi dell’operatore, le condizioni contrattuali e i periodi di conservazione devono essere completati e approvati prima della pubblicazione commerciale. Le sezioni non costituiscono consulenza legale.
    </Alert>}
    {page === 'business' ? <section className="legal-section">
      <Typography component="h2" variant="h5">Dati dell’operatore</Typography>
      <dl className="legal-business-details">{requiredLegalFields.map(field => <div key={field.key}>
        <dt>{field.label}</dt><dd>{value(legalConfig[field.key])}</dd>
      </div>)}</dl>
      <Typography component="h2" variant="h5">Infrastruttura dichiarata</Typography>
      <p>Fornitore database: {legalConfig.hostingProvider}. Regione del progetto: {legalConfig.serverRegion}. L’hosting web, i subprocessor e le posizioni effettive dei dati devono essere confermati dal titolare.</p>
    </section> : <>
      {sections(page).map(section => <section className="legal-section" key={section.title}>
        <Typography component="h2" variant="h5">{section.title}</Typography>
        {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      </section>)}
      <section className="legal-section">
        <Typography component="h2" variant="h5">Recapiti e informazioni da integrare</Typography>
        <p>Titolare / operatore: {value(legalConfig.operatorName)}</p>
        <p>Sede legale: {value(legalConfig.registeredOffice)}</p>
        <p>Assistenza: {value(legalConfig.supportEmail)}</p>
        <p>Richieste privacy: {value(legalConfig.privacyEmail)}</p>
        {page === 'privacy' && <>
          <p>Conservazione account: {value(legalConfig.accountRetention)}</p>
          <p>Conservazione dei dati dei tornei: {value(legalConfig.tenantRetention)}</p>
          <p>Conservazione dei log: {value(legalConfig.logRetention)}</p>
        </>}
        {page === 'refund' && <p>Contatto rimborsi: {value(legalConfig.refundContact)}</p>}
        <RouterLink to="/business">Informazioni complete sull’operatore</RouterLink>
      </section>
    </>}
    <div className="legal-related"><RouterLink to="/privacy-policy">Privacy</RouterLink><RouterLink to="/terms-of-service">Termini</RouterLink><RouterLink to="/refund-policy">Rimborsi</RouterLink><RouterLink to="/cookie-policy">Cookie</RouterLink><RouterLink to="/business">Operatore</RouterLink></div>
  </Container></div>;
}
