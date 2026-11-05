/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  OPERATOR ACTION REQUIRED — single source of truth for legal/business data.
 *  See docs/MANUAL_INFO_CHECKLIST.md for what each field needs and why.
 *  Never fill these with invented values: empty fields are shown as
 *  "da completare" on the legal pages and hidden in the footer.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const LEGAL_VERSION = 'Bozza — 1 novembre 2026';
export const LEGAL_REVIEWED = false; // true ONLY after review by a lawyer/accountant.

export const legalConfig = {
  // Identità dell'operatore: la TUA azienda. ItalFUT è un progetto/marchio dell'azienda,
  // non una società a sé: qui vanno i dati dell'azienda che lo realizza e lo gestisce.
  operatorName: 'Francesco Tenerelli',          // ragione sociale o nome della ditta che gestisce ItalFUT
  legalForm: 'Ditta individuale',             // es. "Ditta individuale", "S.r.l."
  vatNumber: '',             // Partita IVA (11 cifre) — obbligatoria sul sito se esercizio d'impresa
  taxCode: 'TNRFNC08B22A662A',               // Codice fiscale dell'impresa / del titolare
  reaRegistration: '',       // es. "BA-123456" (se iscritti al Registro Imprese)
  shareCapital: '',          // solo per società di capitali, es. "€ 10.000 i.v."
  registeredOffice: '',      // indirizzo completo della sede legale
  businessAddress: '',       // sede operativa, solo se diversa
  // Contatti: le richieste arrivano nel database (pagina /contatti, tabella support_requests).
  // Un indirizzo email di sola ricezione è comunque richiesto dalla legge per chi vende online
  // (D.Lgs. 70/2003, art. 7): compilalo prima del lancio commerciale.
  supportEmail: '',
  privacyEmail: '',
  certifiedEmail: 'tenerellifrancesco@notificapostale.it',        // PEC
  telephone: '+39 3389173386',
  contactUrl: '',
  dpoContact: '',            // solo se un DPO è nominato
  // Infrastruttura e fornitori
  jurisdiction: 'Italia',
  hostingProvider: 'Cloudflare, Inc. (Cloudflare Pages)', // dominio, DNS, CDN e hosting
  databaseProvider: 'Supabase Inc.',
  serverRegion: 'UE — Francia (eu-west-3)', // verificare in Supabase → Project Settings → General
  // Conservazione dati
  accountRetention: '',
  tenantRetention: '',
  logRetention: '',
  legalRecordsRetention: '',
  // Condizioni commerciali (da compilare prima di attivare i pagamenti)
  pricesIncludeVat: null as boolean | null, // true = prezzi IVA inclusa, false = IVA esclusa
  acceptedPaymentMethods: '',
  billingStartCondition: '',
  autoRenewal: '',
  refundContact: '',
  contractualCustomerTypes: '', // "B2B", "B2C" o "B2B e B2C"
  supportResponsePolicy: '',
  officialDomain: '',          // es. "https://italfut.it"
  lastReviewedOn: '',          // data ISO dell'ultima revisione professionale
};

/** Credito nel footer: "made with ♥ by …" verso il portfolio dell'azienda. */
export const madeBy = { label: 'FrankSitez', url: 'https://franksitez.com' };

export const legalNeedsReview = !LEGAL_REVIEWED ||
  !legalConfig.operatorName || !legalConfig.registeredOffice || !legalConfig.vatNumber;

/** Footer line built only from real, configured values. */
export const businessLine = [
  legalConfig.operatorName,
  legalConfig.vatNumber && 'P. IVA ' + legalConfig.vatNumber,
  legalConfig.registeredOffice,
].filter(Boolean).join(' · ');

export const vatNote = legalConfig.pricesIncludeVat === true ? 'IVA inclusa'
  : legalConfig.pricesIncludeVat === false ? 'IVA esclusa (aggiunta al riepilogo prima di qualsiasi pagamento)'
  : 'Trattamento IVA da definire prima dell’attivazione dei pagamenti';

export const requiredLegalFields: { key: keyof typeof legalConfig; label: string }[] = [
  { key: 'operatorName', label: 'Titolare / ragione sociale' },
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
