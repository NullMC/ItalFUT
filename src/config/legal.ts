/**
 * Dati mostrati nelle pagine legali (src/pages/Legal.tsx).
 * Ogni campo vuoto viene semplicemente omesso: nessun segnaposto in pagina.
 */
export const LEGAL_UPDATED = '7 novembre 2026';

export const legalConfig = {
  /** Chi gestisce ItalFUT (pagina "Chi gestisce ItalFUT" e privacy policy). */
  operatorName: 'Francesco Tenerelli',
  /** Facoltativo: se compilato, compare accanto al modulo Contatti. */
  supportEmail: '',
  // Infrastruttura e fornitori
  jurisdiction: 'Italia',
  hostingProvider: 'Cloudflare, Inc. (Cloudflare Pages)', // dominio, DNS, CDN e hosting
  databaseProvider: 'Supabase Inc.',
  serverRegion: 'UE — Francia (eu-west-3)', // verificare in Supabase → Project Settings → General
  officialDomain: 'https://italfut.it',
  // Conservazione dei dati (privacy policy)
  accountRetention: 'Finché l’account resta attivo; lo cancelli tu in qualsiasi momento',
  tenantRetention: 'Finché il torneo esiste; lo cancelli tu in qualsiasi momento o insieme all’account',
  requestRetention: 'Fino alla chiusura della richiesta e per il tempo necessario a gestire eventuali seguiti',
  logRetention: 'Secondo i tempi dei fornitori (Supabase e Cloudflare) indicati nei loro accordi sul trattamento dei dati',
  /** Prezzi: true = IVA inclusa, false = IVA esclusa, null = non mostrare nulla. */
  pricesIncludeVat: null as boolean | null,
};

/** Credito nel footer: "made with ♥ by …" verso il portfolio. */
export const madeBy = { label: 'FrankSitez', url: 'https://franksitez.com' };

/** Nota accanto ai prezzi del configuratore (vuota finché non è decisa). */
export const vatNote = legalConfig.pricesIncludeVat === true ? 'IVA inclusa'
  : legalConfig.pricesIncludeVat === false ? 'IVA esclusa' : '';
