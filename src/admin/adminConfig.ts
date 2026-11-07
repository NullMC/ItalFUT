import { VALUE_LABELS } from '../components/CrudEditor';

export type AdminColumn = { name: string; type: string; udt: string; nullable: boolean; default: string | null; identity: boolean; generated: boolean };
export type AdminTableSchema = { pk: string[]; columns: AdminColumn[]; references: Record<string, string>; checks: string[] };
export type AdminSchema = Record<string, AdminTableSchema>;
export type AdminRow = Record<string, unknown>;

type TableMeta = { label: string; group: 'platform' | 'business' | 'content'; display: string[]; readOnly?: boolean; noCreate?: boolean; noEdit?: boolean; hint?: string };

/** Tabs of the superadmin dashboard (order = sidebar order). */
export const TABLES: Record<string, TableMeta> = {
  profiles: { label: 'Utenti', group: 'platform', display: ['username', 'created_at'], noCreate: true, noEdit: true, hint: 'Gli account si creano dalla registrazione. Da qui puoi reimpostare la password o eliminare un account.' },
  platform_admins: { label: 'Superadmin', group: 'platform', display: ['user_id', 'note', 'created_at'], hint: 'Account con accesso completo a questa dashboard.' },
  support_requests: { label: 'Richieste di supporto', group: 'platform', display: ['kind', 'message', 'status', 'user_id', 'contact', 'created_at'], hint: 'Rispondi compilando “Risposta” e impostando lo stato su “Risposta inviata”: l’utente la legge nella sua pagina Account.' },
  admin_audit_log: { label: 'Registro attività', group: 'platform', display: ['created_at', 'admin_id', 'action', 'table_name'], readOnly: true, hint: 'Ogni operazione fatta da questa dashboard, con i dati prima e dopo.' },
  tenants: { label: 'Tornei', group: 'business', display: ['name', 'slug', 'kind', 'event_date', 'status', 'owner_id', 'created_at'], hint: 'Imposta lo stato su “Online” per pubblicare un torneo. Un torneo di un giorno (kind = event) si chiude da solo 48 ore dopo published_at: per riaprirla, imposta published_at all’ora attuale (altre 48 ore).' },
  tenant_members: { label: 'Membri dei tornei', group: 'business', display: ['tenant_id', 'user_id', 'role', 'created_at'] },
  feature_catalog: { label: 'Catalogo moduli', group: 'business', display: ['code', 'name', 'monthly_cents', 'is_core'], hint: 'Prezzi in centesimi al mese. Ricorda di allineare anche src/lib/catalog.ts.' },
  tenant_features: { label: 'Moduli attivi', group: 'business', display: ['tenant_id', 'code', 'enabled', 'source', 'ends_at'], hint: 'Attiva un modulo per un torneo: abilitato = sì, fonte = manuale, scadenza facoltativa.' },
  plan_quotes: { label: 'Preventivi', group: 'business', display: ['tenant_id', 'months', 'selected_features', 'total_cents', 'status', 'created_at'] },
  upgrade_requests: { label: 'Richieste moduli', group: 'business', display: ['tenant_id', 'requested_features', 'months', 'total_cents', 'status', 'created_at'], hint: 'Dopo aver approvato, attiva i moduli nella scheda “Moduli attivi”.' },
  subscriptions: { label: 'Abbonamenti', group: 'business', display: ['tenant_id', 'status', 'period_start', 'period_end'] },
  payments: { label: 'Pagamenti', group: 'business', display: ['tenant_id', 'amount_cents', 'months', 'features', 'status', 'paid_at', 'period_end', 'created_at'], noCreate: true, hint: 'Pagamenti Stripe registrati dal webhook. Lo stato cambia da solo (pagato, scaduto, rimborsato); i rimborsi si fanno dal pannello Stripe. Un rimborso non disattiva i moduli: fallo da “Moduli attivi” se serve.' },
  competitions: { label: 'Competizioni', group: 'content', display: ['name', 'tenant_id', 'season_label', 'status'] },
  teams: { label: 'Squadre', group: 'content', display: ['name', 'tenant_id', 'accent_hex'] },
  competition_teams: { label: 'Iscrizioni', group: 'content', display: ['competition_id', 'team_id', 'tenant_id'] },
  players: { label: 'Giocatori', group: 'content', display: ['first_name', 'last_name', 'team_id', 'shirt_number', 'age_category'] },
  matches: { label: 'Partite', group: 'content', display: ['home_team_id', 'away_team_id', 'kickoff_at', 'status', 'home_score', 'away_score'] },
  match_events: { label: 'Eventi partita', group: 'content', display: ['match_id', 'event_type', 'player_id', 'minute'] },
  staff_members: { label: 'Staff', group: 'content', display: ['name', 'role', 'tenant_id'] },
  awards: { label: 'Premi', group: 'content', display: ['title', 'award_type', 'month_label', 'tenant_id'] },
  sponsors: { label: 'Sponsor', group: 'content', display: ['name', 'tenant_id', 'sort_order'] },
  articles: { label: 'Articoli', group: 'content', display: ['title', 'tenant_id', 'created_at'] },
  market_slots: { label: 'Calciomercato', group: 'content', display: ['team_id', 'slot_number', 'player_name'] },
  galleries: { label: 'Gallery', group: 'content', display: ['label', 'match_id', 'url'] },
};
export const GROUPS: { id: TableMeta['group']; label: string }[] = [
  { id: 'platform', label: 'Piattaforma' }, { id: 'business', label: 'Tornei e piani' }, { id: 'content', label: 'Contenuti dei tornei' },
];

const COLUMN_LABELS: Record<string, string> = {
  event_date: 'Data evento', published_at: 'Pubblicato il',
  id: 'ID', username: 'Username', email: 'Email interna', created_at: 'Creato il', updated_at: 'Aggiornato il', name: 'Nome', slug: 'Indirizzo', status: 'Stato',
  amount_cents: 'Importo (cent.)', amount_paid_cents: 'Pagato (cent.)', paid_at: 'Pagato il', features: 'Moduli', stripe_session_id: 'Sessione Stripe', stripe_payment_intent: 'Pagamento Stripe', created_by: 'Creato da', currency: 'Valuta',
  owner_id: 'Proprietario', tenant_id: 'Torneo', user_id: 'Utente', role: 'Ruolo', tagline: 'Slogan', logo_url: 'URL logo', cover_url: 'URL copertina',
  brand_color: 'Colore', code: 'Codice', monthly_cents: 'Prezzo mensile (cent.)', is_core: 'Incluso nella base', enabled: 'Abilitato', source: 'Fonte',
  starts_at: 'Inizio', ends_at: 'Scadenza', months: 'Mesi', selected_features: 'Moduli scelti', total_cents: 'Totale (cent.)', requested_by: 'Richiesto da',
  requested_features: 'Moduli richiesti', stripe_customer_id: 'Cliente Stripe', stripe_subscription_id: 'Abbonamento Stripe', period_start: 'Inizio periodo',
  period_end: 'Fine periodo', season_label: 'Stagione', statistics_group: 'Gruppo statistiche', start_date: 'Data inizio', end_date: 'Data fine',
  accent_hex: 'Colore', competition_id: 'Competizione', team_id: 'Squadra', first_name: 'Nome', last_name: 'Cognome', shirt_number: 'Maglia',
  position: 'Ruolo in campo', profile_image_url: 'URL foto', age_category: 'Età', guardian_authorization_confirmed: 'Autorizzazione tutore',
  minor_photo_authorized: 'Foto minore autorizzata', guardian_confirmed_at: 'Autorizzato il', guardian_confirmed_by: 'Autorizzato da',
  home_team_id: 'Casa', away_team_id: 'Ospite', matchday: 'Giornata', kickoff_at: 'Calcio d’inizio', venue: 'Campo', home_score: 'Gol casa',
  away_score: 'Gol ospite', match_id: 'Partita', player_id: 'Giocatore', related_player_id: 'Giocatore collegato', event_type: 'Evento', minute: 'Minuto',
  note: 'Nota', photo_url: 'URL foto', goals: 'Gol', title: 'Titolo', award_type: 'Tipo premio', month_label: 'Periodo', staff_id: 'Staff',
  image_url: 'URL immagine', image_alt: 'Testo alternativo', description: 'Descrizione', website_url: 'Sito web', sort_order: 'Ordine', summary: 'Sommario',
  body: 'Testo', slot_number: 'Slot', player_name: 'Giocatore', notes: 'Note', label: 'Titolo', url: 'Link', kind: 'Argomento', message: 'Messaggio',
  contact: 'Recapito', reply: 'Risposta', answered_at: 'Risposto il', admin_id: 'Admin', action: 'Azione', table_name: 'Scheda', row_key: 'Chiave',
  before: 'Prima', after: 'Dopo',
};
export const columnLabel = (name: string) => COLUMN_LABELS[name] ?? name.replace(/_/g, ' ');

const EXTRA_LABELS: Record<string, string> = {
  event: 'Un giorno', season: 'Stagione',
  draft: 'Bozza', suspended: 'Sospeso', owner: 'Proprietario', admin: 'Amministratore', editor: 'Editor', viewer: 'Lettore',
  included: 'Inclusa', manual: 'Manuale', stripe: 'Stripe', pending: 'In attesa', accepted: 'Accettato', cancelled: 'Annullato',
  approved: 'Approvata', rejected: 'Rifiutata', paid: 'Pagato', failed: 'Non riuscito', refunded: 'Rimborsato', trialing: 'In prova', past_due: 'Scaduto (da pagare)', expired: 'Scaduto',
  open: 'Aperta', answered: 'Risposta inviata', closed: 'Chiusa', privacy: 'Privacy', support: 'Assistenza', minor: 'Dati di un minore',
  billing: 'Pagamenti', insert: 'Creazione', update: 'Modifica', delete: 'Eliminazione', set_password: 'Nuova password',
};
export const valueLabel = (value: unknown) => {
  const key = String(value);
  if (key === 'active') return 'Attivo';
  return EXTRA_LABELS[key] ?? VALUE_LABELS[key] ?? key;
};

/** Allowed values from CHECK constraints like `(status = ANY (ARRAY['a'::text, 'b'::text]))`. */
export function enumValues(schema: AdminTableSchema, column: string): string[] | null {
  const pattern = new RegExp(`\\("?${column}"? = ANY \\(ARRAY\\[([^\\]]+)\\]`);
  for (const check of schema.checks) {
    const match = check.match(pattern);
    if (match) return [...match[1].matchAll(/'([^']*)'/g)].map(m => m[1]);
  }
  return null;
}

/** Human label for a record used in selects and foreign-key cells. */
export function recordLabel(table: string, row: AdminRow, names?: Record<string, Map<string, string>>): string {
  const ref = (t: string, id: unknown) => names?.[t]?.get(String(id)) ?? '';
  if (table === 'profiles') return '@' + String(row.username ?? row.id);
  if (table === 'players') return `${String(row.first_name ?? '')} ${String(row.last_name ?? '')}`.trim();
  if (table === 'matches') {
    const when = row.kickoff_at ? new Date(String(row.kickoff_at)).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : '';
    return `${ref('teams', row.home_team_id) || 'Casa'} – ${ref('teams', row.away_team_id) || 'Ospite'}${when ? ' · ' + when : ''}`;
  }
  if (table === 'feature_catalog') return String(row.name ?? row.code);
  for (const key of ['name', 'title', 'label', 'player_name', 'slug', 'code']) if (row[key]) return String(row[key]);
  return String(row.id ?? '').slice(0, 8);
}

export const isLongText = (name: string) => ['body', 'description', 'message', 'reply', 'notes', 'summary', 'note'].includes(name);
export const HIDDEN_IN_FORM = new Set(['created_at']);
