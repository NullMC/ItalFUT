/**
 * OPERATOR ACTION REQUIRED: These fields must be completed and verified BEFORE launch.
 * Never replace unknown legal/business details with invented names or numbers.
 * Review with your lawyer/accountant and update this config when policies are approved.
 */
export const LEGAL_VERSION = 'BOZZA — 2026-11-01';
export const LEGAL_REVIEWED = false; // Set true ONLY after professional review.
export const legalConfig = {
  operatorName: '',
  legalForm: '',
  vatNumber: '',
  taxCode: '',
  reaRegistration: '',
  registeredOffice: '',
  businessAddress: '',
  supportEmail: '',
  privacyEmail: '',
  certifiedEmail: '',
  telephone: '',
  dpoContact: '', // Leave empty if no DPO is legally required or appointed.
  jurisdiction: 'Italia', // Check actual place of establishment.
  hostingProvider: 'Supabase', // Verify deployment and all other hosts/CDNs.
  serverRegion: 'UE — Francia (eu-west-3)', // Verify configured project and backups.
  contactUrl: '', // Optional actual contact form.
  accountRetention: '', // Period/criteria after closure to be legally determined.
  tenantRetention: '', // Confirm retention and legal basis with operator.
  logRetention: '', // Check real Supabase/host log retention.
  legalRecordsRetention: '', // Accounting/tax exceptions as required by law.
  supportResponsePolicy: '', // A verifiable business policy, no invented SLA.
  acceptedPaymentMethods: '', // Not active yet; do not pretend Stripe is live.
  billingStartCondition: '', // To complete before implementing payments.
  autoRenewal: '', // To complete; no automatic renewal coded today.
  refundContact: '',
  contractualCustomerTypes: '', // B2C, B2B, or both; affects withdrawal wording.
  officialDomain: '', // Exact production domain, once confirmed.
  lastReviewedOn: '', // ISO date once verified.
} as const;

export const legalNeedsReview = !LEGAL_REVIEWED ||
  !legalConfig.operatorName || !legalConfig.registeredOffice ||
  !legalConfig.vatNumber || !legalConfig.privacyEmail || !legalConfig.supportEmail;

export const requiredLegalFields: { key: keyof typeof legalConfig; label: string }[] = [
  { key: 'operatorName', label: 'Ragione sociale / nome del titolare' },
  { key: 'legalForm', label: 'Forma giuridica' },
  { key: 'vatNumber', label: 'Partita IVA' },
  { key: 'taxCode', label: 'Codice fiscale dell’impresa' },
  { key: 'reaRegistration', label: 'Iscrizione Registro Imprese / REA (se applicabile)' },
  { key: 'registeredOffice', label: 'Sede legale completa' },
  { key: 'supportEmail', label: 'Email assistenza' },
  { key: 'privacyEmail', label: 'Email per i diritti GDPR' },
  { key: 'certifiedEmail', label: 'PEC (se applicabile)' },
  { key: 'telephone', label: 'Recapito commerciale (se previsto)' },
];
