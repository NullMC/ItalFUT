/*
 * SEO for the single-page app: title, description, canonical, robots and Open Graph /
 * Twitter tags, updated on every route. Private areas are noindex (also via X-Robots-Tag
 * in public/_headers and robots.txt).
 */
export const SITE_URL = 'https://italfut.it';
export const SITE_NAME = 'ItalFUT';
export const DEFAULT_IMAGE = SITE_URL + '/og-image.png';
export const DEFAULT_DESCRIPTION = 'ItalFUT è la piattaforma per organizzare tornei di calcio: competizioni, squadre, calendario, risultati e classifiche automatiche, con un sito pubblico per ogni torneo. Il torneo di un giorno è gratis.';

export type Seo = { title: string; description?: string; path?: string; image?: string; noindex?: boolean; type?: 'website' | 'article' };

function setMeta(attr: 'name' | 'property', key: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (content === null) { el?.remove(); return; }
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', content);
}
function setCanonical(href: string | null) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (href === null) { el?.remove(); return; }
  if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el); }
  el.href = href;
}

export function applySeo({ title, description = DEFAULT_DESCRIPTION, path, image = DEFAULT_IMAGE, noindex = false, type = 'website' }: Seo) {
  const url = SITE_URL + (path ?? window.location.pathname);
  document.title = title;
  setMeta('name', 'description', description);
  setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
  setCanonical(noindex ? null : url);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:type', type);
  setMeta('property', 'og:image', image);
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', image);
}

/** Route → SEO for the marketing and service pages. Private areas are never indexed. */
export const ROUTES: [RegExp, Omit<Seo, 'path'>][] = [
  [/^\/$/, { title: 'ItalFUT — Il tuo torneo di calcio, tutto in campo', description: DEFAULT_DESCRIPTION }],
  [/^\/configura/, { title: 'Crea il tuo torneo di calcio · ItalFUT', description: 'Configura il torneo: torneo di un giorno gratis o campionato da 19 € al mese, con i moduli che ti servono. Il riepilogo dei costi è sempre visibile.' }],
  [/^\/contatti/, { title: 'Contatti e assistenza · ItalFUT', description: 'Scrivi al gestore di ItalFUT per assistenza, privacy, pagamenti o dati di un minore.' }],
  [/^\/privacy-policy/, { title: 'Privacy policy · ItalFUT', description: 'Quali dati tratta ItalFUT, perché, per quanto tempo e come esercitare i tuoi diritti.' }],
  [/^\/terms-of-service/, { title: 'Termini di servizio · ItalFUT', description: 'Le regole d’uso di ItalFUT per organizzatori e visitatori: account, contenuti, prezzi e tornei di un giorno.' }],
  [/^\/refund-policy/, { title: 'Rimborsi e diritto di recesso · ItalFUT', description: 'Come funzionano recesso e rimborsi per i servizi a pagamento di ItalFUT.' }],
  [/^\/cookie-policy/, { title: 'Cookie policy · ItalFUT', description: 'Gli strumenti tecnici usati da ItalFUT e come gestire le tue preferenze.' }],
  [/^\/business/, { title: 'Chi gestisce ItalFUT', description: 'Chi c’è dietro ItalFUT, come contattarlo e su quale infrastruttura funziona.' }],
  [/^\/registrati/, { title: 'Crea un account · ItalFUT', description: 'Crea gratis il tuo account organizzatore ItalFUT: username e password, nessun dato superfluo.' }],
  [/^\/accesso/, { title: 'Accedi · ItalFUT', noindex: true }],
  [/^\/console/, { title: 'Console · ItalFUT', noindex: true }],
  [/^\/admin/, { title: 'Superadmin · ItalFUT', noindex: true }],
  [/^\/account/, { title: 'Account e dati · ItalFUT', noindex: true }],
  [/^\/pagamento/, { title: 'Esito del pagamento · ItalFUT', noindex: true }],
  [/^\/errore/, { title: 'Errore · ItalFUT', noindex: true }],
];
