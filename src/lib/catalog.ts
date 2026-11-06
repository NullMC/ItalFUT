import type { FeatureCode } from './types';

export type Module = { code: FeatureCode; name: string; description: string; monthly: number; core?: boolean; icon: string };
export const MODULES: Module[] = [
  { code: 'competitions', name: 'Competizioni', description: 'Gestisci tornei, stagioni e gironi.', monthly: 0, core: true, icon: 'emoji_events' },
  { code: 'teams', name: 'Squadre', description: 'Rose, loghi e schede squadra.', monthly: 0, core: true, icon: 'groups' },
  { code: 'players', name: 'Giocatori', description: 'Anagrafiche, maglie e ruoli.', monthly: 0, core: true, icon: 'person' },
  { code: 'matches', name: 'Partite e risultati', description: 'Calendario, incontri, punteggi e campo.', monthly: 0, core: true, icon: 'event' },
  { code: 'standings', name: 'Classifiche', description: 'Classifiche automatiche in tempo reale.', monthly: 0, core: true, icon: 'leaderboard' },
  { code: 'statistics', name: 'Statistiche avanzate', description: 'Gol, assist, cartellini, MVP e clean sheet.', monthly: 6, icon: 'query_stats' },
  { code: 'staff', name: 'Staff e presidenti', description: 'Profili e graduatorie dedicate.', monthly: 3, icon: 'badge' },
  { code: 'awards', name: 'Premi del mese', description: 'Player of the month, best staff e top 7.', monthly: 5, icon: 'workspace_premium' },
  { code: 'sponsors', name: 'Sponsor e partner', description: 'Vetrine di collaborazioni e sponsor.', monthly: 5, icon: 'handshake' },
  { code: 'articles', name: 'News e contenuti', description: 'Articoli e comunicazioni editoriali.', monthly: 4, icon: 'article' },
  { code: 'market', name: 'Calciomercato', description: 'Sei slot mercato per squadra.', monthly: 5, icon: 'sync_alt' },
  { code: 'gallery', name: 'Foto gallery', description: 'Collega gallerie foto esterne.', monthly: 1, icon: 'collections' },
];
export const CORE = MODULES.filter(module => module.core).map(module => module.code);
export const EXTRA = MODULES.filter(module => !module.core);
/** Any whole number of months in this range can be bought; the presets are shortcuts. */
export const MIN_MONTHS = 1;
export const MAX_MONTHS = 24;
export const validMonths = (value: unknown) => Number.isInteger(value) && Number(value) >= MIN_MONTHS && Number(value) <= MAX_MONTHS;
export const TERMS = [
  { months: 1, label: '1 mese', discount: 0 },
  { months: 3, label: '3 mesi', discount: 0.08 },
  { months: 6, label: '6 mesi', discount: 0.15 },
  { months: 12, label: '12 mesi', discount: 0.25 },
];
/** Discount of the highest preset reached (e.g. 4 months → 3-month discount). Same rule as SQL quote_plan. */
export function discountFor(months: number) {
  return [...TERMS].reverse().find(term => months >= term.months)?.discount ?? 0;
}
export const BASE_MONTHLY = 19;
// Visual estimate only. The authoritative price is calculated by the SQL quote_plan RPC.
export function estimate(months: number, selected: FeatureCode[]) {
  const discount = discountFor(months);
  const monthly = BASE_MONTHLY + EXTRA.filter(entry => selected.includes(entry.code)).reduce((sum, entry) => sum + entry.monthly, 0);
  return { monthly, total: Math.round(monthly * months * (1 - discount) * 100) / 100, discount };
}
export function formatEuro(value: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}
