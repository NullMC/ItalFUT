/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  OPERATOR ACTION REQUIRED — single source of truth for legal data.
 *  See docs/MANUAL_INFO_CHECKLIST.md for what each field needs and why.
 *  Never fill these with invented values: empty fields are shown as
 *  "da completare" on the legal pages and hidden in the footer.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const LEGAL_VERSION = 'Bozza — 5 novembre 2026';
export const LEGAL_REVIEWED = false; // true ONLY after review by a lawyer/accountant.

/**
 * How ItalFUT is run today.
 * - 'privato': personal project of a private individual, no partita IVA. The service is
 *   FREE: the platform neither asks for nor accepts payments, prices are only indicative.
 * - 'partita-iva': switch here ONLY after opening a partita IVA that covers this activity
 *   (then fill the fiscal fields below and the commercial terms before any payment).
 * The legal pages, footer, configurator and console adapt to this value.
 */
export type OperatorMode = 'privato' | 'partita-iva';
export const OPERATOR_MODE = 'privato' as OperatorMode;
/** Payments may exist only with a partita IVA. Keep false until Stripe is wired AND the mode is 'partita-iva'. */
export const PAYMENTS_ACTIVE = false;
export const isPrivate = OPERATOR_MODE === 'privato';
export const paymentsActive = PAYMENTS_ACTIVE && !isPrivate;

export const legalConfig = {
  // Chi gestisce ItalFUT. In modalità 'privato': nome e cognome della persona fisica.
  operatorName: 'Francesco Tenerelli', // in futuro: nome della ditta / denominazione
  operatorCity: '',          // comune di residenza o recapito, es. "Bari (BA)" — non serve l'indirizzo completo
  // Dati fiscali: SOLO in modalità 'partita-iva' (non vengono mostrati in modalità 'privato').
  legalForm: '',             // es. "Ditta individuale", "Libero professionista" — solo dopo l'apertura della P.IVA
  vatNumber: '',             // Partita IVA (11 cifre) — va pubblicata sul sito (art. 35 DPR 633/1972)
  taxCode: '',               // Codice fiscale del titolare: NON compilarlo finché sei 'privato' (non va pubblicato)
  reaRegistration: '',       // es. "BA-123456" (se iscritti al Registro Imprese)
  shareCapital: '',          // solo per società di capitali
  registeredOffice: '',      // sede legale / domicilio fiscale
  businessAddress: '',       // sede operativa, solo se diversa
  // Contatti: le richieste arrivano nel database (pagina /contatti, tabella support_requests).
  // Un indirizzo email di sola ricezione diventa necessario quando il servizio sarà a pagamento
  // (D.Lgs. 70/2003, art. 7). Oggi è facoltativo.
  supportEmail: '',
  privacyEmail: '',
  certifiedEmail: 'tenerellifrancesco@notificapostale.it', // PEC
  telephone: '+39 3389173386',
  dpoContact: '',            // solo se un DPO è nominato
  // Infrastruttura e fornitori
  jurisdiction: 'Italia',
  hostingProvider: 'Cloudflare, Inc. (Cloudflare Pages)', // dominio, DNS, CDN e hosting
  databaseProvider: 'Supabase Inc.',
  serverRegion: 'UE — Francia (eu-west-3)', // verificare in Supabase → Project Settings → General
  // Conservazione dati
  accountRetention: 'Finché l’account resta attivo; lo cancelli tu in qualsiasi momento',
  tenantRetention: 'Finché il torneo esiste; lo cancelli tu in qualsiasi momento o insieme all’account',
  logRetention: 'Secondo i tempi dei fornitori (Supabase e Cloudflare) indicati nei loro accordi sul trattamento dei dati',
  requestRetention: 'Fino alla chiusura della richiesta e per il tempo necessario a gestire eventuali seguiti',
  // Condizioni commerciali: da compilare SOLO prima di attivare i pagamenti (modalità 'partita-iva').
  pricesIncludeVat: null as boolean | null,
  acceptedPaymentMethods: '',
  billingStartCondition: '',
  autoRenewal: '',
  refundContact: '',
  contractualCustomerTypes: '', // "B2B", "B2C" o "B2B e B2C"
  legalRecordsRetention: '',    // documenti fiscali: di norma 10 anni
  officialDomain: '',          // es. "https://italfut.it"
  lastReviewedOn: '',          // data ISO dell'ultima revisione professionale
};

/** Credito nel footer: "made with ♥ by …" verso il portfolio. */
export const madeBy = { label: 'FrankSitez', url: 'https://franksitez.com' };

export const legalNeedsReview = !LEGAL_REVIEWED || !legalConfig.operatorName ||
  (!isPrivate && (!legalConfig.registeredOffice || !legalConfig.vatNumber));

/** Footer line built only from real, configured values. */
export const businessLine = isPrivate
  ? (legalConfig.operatorName ? 'Progetto personale di ' + legalConfig.operatorName : '')
  : [legalConfig.operatorName, legalConfig.vatNumber && 'P. IVA ' + legalConfig.vatNumber, legalConfig.registeredOffice].filter(Boolean).join(' · ');

/** Line shown next to prices (configurator, console). */
export const vatNote = !paymentsActive ? 'nessun pagamento richiesto'
  : legalConfig.pricesIncludeVat === true ? 'IVA inclusa'
  : legalConfig.pricesIncludeVat === false ? 'IVA esclusa (aggiunta al riepilogo prima di qualsiasi pagamento)'
  : 'Trattamento IVA da definire prima dell’attivazione dei pagamenti';

type Field = { key: keyof typeof legalConfig; label: string };
/** Identity fields shown on the operator page, depending on the mode. */
export const requiredLegalFields: Field[] = isPrivate ? [
  { key: 'operatorName', label: 'Titolare (persona fisica)' },
  { key: 'operatorCity', label: 'Comune' },
] : [
  { key: 'operatorName', label: 'Titolare / denominazione' },
  { key: 'legalForm', label: 'Forma giuridica' },
  { key: 'vatNumber', label: 'Partita IVA' },
  { key: 'taxCode', label: 'Codice fiscale' },
  { key: 'reaRegistration', label: 'Registro Imprese / REA' },
  { key: 'shareCapital', label: 'Capitale sociale (società di capitali)' },
  { key: 'registeredOffice', label: 'Sede legale' },
  { key: 'businessAddress', label: 'Sede operativa' },
  { key: 'supportEmail', label: 'Email assistenza' },
  { key: 'privacyEmail', label: 'Email privacy (diritti GDPR)' },
  { key: 'certifiedEmail', label: 'PEC' },
  { key: 'telephone', label: 'Telefono' },
  { key: 'dpoContact', label: 'Responsabile protezione dati (DPO)' },
];
