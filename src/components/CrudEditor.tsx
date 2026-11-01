import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Alert, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, IconButton, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { cleanText, HEX_COLOR, safeUrl } from '../lib/validation';
import { Link as RouterLink } from 'react-router-dom';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { client, friendlyError } from '../lib/supabase';
import type { FeatureCode, Option, Row } from '../lib/types';

type Field = { key: string; label: string; type?: 'number' | 'date' | 'datetime-local' | 'textarea' | 'select' | 'color' | 'url'; required?: boolean; values?: string[]; ref?: string; min?: number; max?: number; maxLength?: number };
export type EditorDefinition = { key: string; label: string; table: string; feature: FeatureCode; summary: string; fields: Field[] };
export const EDITORS: EditorDefinition[] = [
  { key: 'competitions', feature: 'competitions', label: 'Competizioni', table: 'competitions', summary: 'Crea stagioni, gironi e tornei indipendenti.', fields: [
    { key: 'name', label: 'Nome competizione', required: true }, { key: 'season_label', label: 'Stagione' },
    { key: 'status', label: 'Stato', type: 'select', values: ['upcoming', 'active', 'finished'] },
    { key: 'statistics_group', label: 'Raggruppamento statistiche' },
    { key: 'start_date', label: 'Data inizio', type: 'date' }, { key: 'end_date', label: 'Data fine', type: 'date' },
  ] },
  { key: 'teams', feature: 'teams', label: 'Squadre', table: 'teams', summary: 'Gestisci l’identità delle squadre del tuo torneo.', fields: [
    { key: 'name', label: 'Nome squadra', required: true }, { key: 'logo_url', label: 'URL logo', type: 'url' },
    { key: 'accent_hex', label: 'Colore squadra (es. #198f61)', type: 'color' },
  ] },
  { key: 'enrollments', feature: 'teams', label: 'Iscrizioni ai tornei', table: 'competition_teams', summary: 'Assegna le squadre alle competizioni, anche a più tornei contemporaneamente.', fields: [
    { key: 'competition_id', label: 'Competizione', ref: 'competitions', required: true },
    { key: 'team_id', label: 'Squadra', ref: 'teams', required: true },
  ] },
  { key: 'players', feature: 'players', label: 'Giocatori', table: 'players', summary: 'Rose, numeri di maglia, ruoli e immagini profilo.', fields: [
    { key: 'team_id', label: 'Squadra', ref: 'teams', required: true },
    { key: 'age_category', label: 'Fascia di età del giocatore', type: 'select', values: ['adult', 'minor'], required: true },
    { key: 'first_name', label: 'Nome', required: true }, { key: 'last_name', label: 'Cognome', required: true },
    { key: 'shirt_number', label: 'Numero maglia', type: 'number', min: 0, max: 99 },
    { key: 'position', label: 'Ruolo', type: 'select', values: ['P', 'D', 'C', 'A'] },
    { key: 'profile_image_url', label: 'URL foto profilo', type: 'url' },
  ] },
  { key: 'matches', feature: 'matches', label: 'Partite', table: 'matches', summary: 'Programma incontri, campi, date e risultati.', fields: [
    { key: 'competition_id', label: 'Competizione', ref: 'competitions', required: true },
    { key: 'home_team_id', label: 'Squadra casa', ref: 'teams', required: true },
    { key: 'away_team_id', label: 'Squadra ospite', ref: 'teams', required: true },
    { key: 'matchday', label: 'Giornata' },
    { key: 'kickoff_at', label: 'Data e ora', type: 'datetime-local', required: true },
    { key: 'venue', label: 'Campo / stadio' },
    { key: 'status', label: 'Stato partita', type: 'select', values: ['scheduled', 'live', 'finished', 'postponed'] },
    { key: 'home_score', label: 'Gol casa', type: 'number', min: 0, max: 99 }, { key: 'away_score', label: 'Gol ospite', type: 'number', min: 0, max: 99 },
  ] },
  { key: 'events', feature: 'statistics', label: 'Eventi e statistiche', table: 'match_events', summary: 'Registra marcatori, assist, cartellini e contributi individuali.', fields: [
    { key: 'match_id', label: 'Partita', ref: 'matches', required: true },
    { key: 'player_id', label: 'Giocatore', ref: 'players' },
    { key: 'related_player_id', label: 'Assist / giocatore collegato', ref: 'players' },
    { key: 'event_type', label: 'Tipo evento', type: 'select', values: ['goal', 'assist', 'yellow_card', 'red_card', 'mvp', 'other'], required: true },
    { key: 'minute', label: 'Minuto', type: 'number', min: 0, max: 130 }, { key: 'note', label: 'Nota' },
  ] },
  { key: 'staff', feature: 'staff', label: 'Staff', table: 'staff_members', summary: 'Anagrafica staff, foto e statistiche.', fields: [
    { key: 'name', label: 'Nome completo', required: true },
    { key: 'role', label: 'Ruolo / incarico' }, { key: 'photo_url', label: 'URL foto', type: 'url' },
    { key: 'goals', label: 'Gol staff', type: 'number', min: 0, max: 999 },
  ] },
  { key: 'awards', feature: 'awards', label: 'Premi', table: 'awards', summary: 'Premia giocatori e membri staff con riconoscimenti dedicati.', fields: [
    { key: 'title', label: 'Titolo premio', required: true },
    { key: 'award_type', label: 'Categoria', type: 'select', values: ['potm', 'staff_of_month', 'top7', 'mvp', 'other'], required: true },
    { key: 'month_label', label: 'Mese / periodo' },
    { key: 'player_id', label: 'Giocatore premiato', ref: 'players' },
    { key: 'staff_id', label: 'Membro staff premiato', ref: 'staff_members' },
    { key: 'image_url', label: 'URL immagine', type: 'url' },
  ] },
  { key: 'sponsors', feature: 'sponsors', label: 'Sponsor e partner', table: 'sponsors', summary: 'Partner commerciali, loghi e collegamenti.', fields: [
    { key: 'name', label: 'Nome sponsor', required: true },
    { key: 'description', label: 'Descrizione', type: 'textarea' },
    { key: 'logo_url', label: 'URL logo', type: 'url' }, { key: 'image_url', label: 'URL immagine attività', type: 'url' },
    { key: 'image_alt', label: 'Descrizione accessibile immagine' },
    { key: 'website_url', label: 'Sito web', type: 'url' }, { key: 'sort_order', label: 'Ordine', type: 'number' },
  ] },
  { key: 'articles', feature: 'articles', label: 'Articoli', table: 'articles', summary: 'Notizie, comunicati e contenuti in evidenza.', fields: [
    { key: 'title', label: 'Titolo', required: true },
    { key: 'summary', label: 'Introduzione', type: 'textarea' },
    { key: 'body', label: 'Testo articolo', type: 'textarea', maxLength: 20000 },
    { key: 'image_url', label: 'URL immagine', type: 'url' },
    { key: 'image_alt', label: 'Descrizione accessibile immagine' },
    { key: 'sort_order', label: 'Ordine di visualizzazione', type: 'number' },
  ] },
  { key: 'market', feature: 'market', label: 'Calciomercato', table: 'market_slots', summary: 'Fino a sei inserimenti mercato per squadra.', fields: [
    { key: 'team_id', label: 'Squadra', ref: 'teams', required: true },
    { key: 'slot_number', label: 'Slot (1–6)', type: 'number', required: true, min: 1, max: 6 },
    { key: 'player_name', label: 'Nome giocatore', required: true },
    { key: 'photo_url', label: 'URL foto', type: 'url' }, { key: 'notes', label: 'Note', type: 'textarea' },
  ] },
  { key: 'gallery', feature: 'gallery', label: 'Foto gallery', table: 'galleries', summary: 'Link liberi: cartelle Drive, album, piattaforme esterne.', fields: [
    { key: 'match_id', label: 'Partita', ref: 'matches', required: true },
    { key: 'label', label: 'Titolo gallery', required: true },
    { key: 'url', label: 'Link gallery (https://…)', type: 'url', required: true },
  ] },
];

/** Italian labels for stored enum values (the database keeps stable English codes). */
export const VALUE_LABELS: Record<string, string> = {
  upcoming: 'In arrivo', active: 'In corso', finished: 'Conclusa',
  scheduled: 'In programma', live: 'In corso', postponed: 'Rinviata',
  goal: 'Gol', assist: 'Assist', yellow_card: 'Cartellino giallo', red_card: 'Cartellino rosso', mvp: 'MVP', other: 'Altro',
  potm: 'Giocatore del mese', staff_of_month: 'Staff del mese', top7: 'Top 7',
  P: 'Portiere', D: 'Difensore', C: 'Centrocampista', A: 'Attaccante',
  adult: 'Maggiorenne', minor: 'Minorenne',
};
const label = (value: unknown) => VALUE_LABELS[String(value)] ?? String(value ?? '');

function datetimeLocal(value: unknown) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
function shortDate(value: unknown) {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

export function CrudEditor({ tenantId, config, editable }: { tenantId: string; config: EditorDefinition; editable: boolean }) {
  const [items, setItems] = useState<Row[]>([]);
  const [references, setReferences] = useState<Record<string, Option[]>>({});
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [guardianDeclaration, setGuardianDeclaration] = useState(false);
  const [minorPhotoDeclaration, setMinorPhotoDeclaration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const refTables = useMemo(() => [...new Set(config.fields.map(f => f.ref).filter((x): x is string => !!x))], [config]);
  const refName = (table: string, id: unknown) => references[table]?.find(option => option.id === String(id))?.name ?? '';

  const labelFor = (row: Row) => {
    if (config.key === 'players') return `${String(row.first_name ?? '')} ${String(row.last_name ?? '')}`.trim();
    if (config.key === 'matches') return `${refName('teams', row.home_team_id) || 'Casa'} – ${refName('teams', row.away_team_id) || 'Ospite'}`;
    if (config.key === 'enrollments') return `${refName('teams', row.team_id) || 'Squadra'} → ${refName('competitions', row.competition_id) || 'Competizione'}`;
    if (config.key === 'events') return `${label(row.event_type)}${row.minute != null ? ' · ' + String(row.minute) + '’' : ''}`;
    return String(row.name ?? row.title ?? row.label ?? row.player_name ?? 'Elemento');
  };
  const secondaryFor = (row: Row) => {
    if (config.key === 'competitions') return [row.season_label, label(row.status)].filter(Boolean).join(' · ');
    if (config.key === 'matches') return [row.matchday, shortDate(row.kickoff_at), row.venue].filter(Boolean).join(' · ') + (row.home_score != null ? ` · ${String(row.home_score)}–${String(row.away_score)}` : '');
    if (config.key === 'players') return [refName('teams', row.team_id), row.shirt_number != null ? '#' + String(row.shirt_number) : '', label(row.position), row.age_category === 'minor' ? 'Minorenne' : ''].filter(Boolean).join(' · ');
    if (config.key === 'events') return [refName('matches', row.match_id), refName('players', row.player_id)].filter(Boolean).join(' · ');
    if (config.key === 'articles') return String(row.summary ?? '').slice(0, 110);
    return String(row.role ?? row.description ?? label(row.award_type) ?? '').slice(0, 110);
  };

  const load = async () => {
    const { data, error: issue } = await client().from(config.table).select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1000);
    if (issue) throw issue;
    setItems((data ?? []) as Row[]);
  };
  useEffect(() => {
    let live = true;
    setLoading(true); setError(''); setQuery('');
    const run = async () => {
      try {
        const sb = client();
        const needed = new Set(refTables);
        if (config.key === 'matches' || config.key === 'enrollments' || config.key === 'players') needed.add('teams');
        if (config.key === 'enrollments') needed.add('competitions');
        const referenceEntries = await Promise.all([...needed].map(async table => {
          const { data, error: issue } = await sb.from(table).select('*').eq('tenant_id', tenantId).limit(1000);
          if (issue) throw issue;
          return [table, (data ?? []) as Record<string, unknown>[]] as const;
        }));
        const teams = new Map((referenceEntries.find(([t]) => t === 'teams')?.[1] ?? []).map(r => [String(r.id), String(r.name)]));
        const refs = Object.fromEntries(referenceEntries.map(([table, rows]) => [table, rows.map(record => ({
          id: String(record.id),
          name: table === 'players' ? `${String(record.first_name)} ${String(record.last_name)}`
            : table === 'matches' ? `${teams.get(String(record.home_team_id)) ?? 'Casa'} – ${teams.get(String(record.away_team_id)) ?? 'Ospite'} · ${shortDate(record.kickoff_at)}`
            : String(record.name ?? record.title ?? record.id),
        }))]));
        const { data, error: issue } = await sb.from(config.table).select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1000);
        if (issue) throw issue;
        if (live) { setReferences(refs); setItems((data ?? []) as Row[]); }
      } catch (cause) { if (live) setError(friendlyError(cause)); }
      finally { if (live) setLoading(false); }
    };
    void run();
    return () => { live = false; };
  }, [tenantId, config, refTables]);

  const open = (row?: Row) => {
    setEditing(row ?? null); setError('');
    setGuardianDeclaration(Boolean(row?.guardian_authorization_confirmed));
    setMinorPhotoDeclaration(Boolean(row?.minor_photo_authorized));
    setValues(Object.fromEntries(config.fields.map(field => [field.key, row?.[field.key] == null
      ? (field.key === 'age_category' ? '' : field.values && (field.required || field.key === 'status') ? field.values[0] : '')
      : field.type === 'datetime-local' ? datetimeLocal(row[field.key]) : String(row[field.key])])));
    setDialog(true);
  };

  /** Validates and normalises every field before it is sent to the database. */
  const buildPayload = () => {
    const payload: Record<string, string | number | boolean | null> = {};
    if (config.key === 'players') {
      if (!['adult', 'minor'].includes(values.age_category)) throw new Error('Seleziona la fascia di età del giocatore.');
      const minor = values.age_category === 'minor';
      if (minor && !guardianDeclaration) throw new Error('Prima di pubblicare dati di un minore devi confermare l’autorizzazione del genitore o tutore.');
      if (minor && (values.profile_image_url ?? '').trim() && !minorPhotoDeclaration) throw new Error('Per la foto di un minore serve un’autorizzazione specifica.');
      payload.guardian_authorization_confirmed = minor && guardianDeclaration;
      payload.minor_photo_authorized = minor && minorPhotoDeclaration;
    }
    for (const field of config.fields) {
      const raw = values[field.key] ?? '';
      const input = field.type === 'textarea' ? cleanText(raw, field.maxLength ?? 4000) : cleanText(raw, field.maxLength ?? 200);
      if (!input) {
        if (field.required) throw new Error(`Il campo “${field.label}” è obbligatorio.`);
        if (editing) payload[field.key] = field.key === 'sort_order' || field.key === 'goals' ? 0 : null;
        continue;
      }
      if (field.type === 'number') {
        const number = Number(input);
        if (!Number.isInteger(number) || (field.min != null && number < field.min) || (field.max != null && number > field.max))
          throw new Error(`“${field.label}” deve essere un numero intero${field.min != null ? ` tra ${field.min} e ${field.max}` : ''}.`);
        payload[field.key] = number;
      } else if (field.type === 'url') {
        const url = safeUrl(input);
        if (!url) throw new Error(`“${field.label}” deve essere un indirizzo che inizia con https://`);
        payload[field.key] = url;
      } else if (field.type === 'color') {
        if (!HEX_COLOR.test(input)) throw new Error(`“${field.label}” deve avere il formato #RRGGBB.`);
        payload[field.key] = input;
      } else if (field.type === 'datetime-local') {
        const date = new Date(input);
        if (Number.isNaN(date.getTime())) throw new Error(`“${field.label}” non è una data valida.`);
        payload[field.key] = date.toISOString();
      } else if (field.values && !field.values.includes(input)) {
        throw new Error(`Valore non valido per “${field.label}”.`);
      } else payload[field.key] = input;
    }
    if (config.key === 'matches') {
      if (payload.home_team_id && payload.home_team_id === payload.away_team_id) throw new Error('Una squadra non può giocare contro sé stessa.');
      if (payload.status === 'finished' && (payload.home_score == null || payload.away_score == null)) throw new Error('Per una partita terminata inserisci il punteggio di entrambe le squadre.');
    }
    return payload;
  };

  const save = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    let payload: Record<string, string | number | boolean | null>;
    try { payload = buildPayload(); } catch (cause) { setError(friendlyError(cause)); return; }
    setSaving(true);
    try {
      const sb = client();
      const result = editing
        ? await sb.from(config.table).update(payload).eq('id', editing.id).eq('tenant_id', tenantId)
        : await sb.from(config.table).insert({ ...payload, tenant_id: tenantId });
      if (result.error) throw result.error;
      setDialog(false); await load();
    } catch (cause) { setError(friendlyError(cause)); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!toDelete) return;
    setError(''); setSaving(true);
    try {
      const { error: issue } = await client().from(config.table).delete().eq('id', toDelete.id).eq('tenant_id', tenantId);
      if (issue) throw issue;
      setToDelete(null);
      await load();
    } catch (cause) { setError(friendlyError(cause)); setToDelete(null); }
    finally { setSaving(false); }
  };
  const visible = query.trim() ? items.filter(row => (labelFor(row) + ' ' + secondaryFor(row)).toLowerCase().includes(query.trim().toLowerCase())) : items;

  return <section className="crud" aria-labelledby={'crud-' + config.key}>
    <header className="workspace__head workspace__head--row">
      <div><h1 id={'crud-' + config.key}>{config.label}</h1><p>{config.summary}</p></div>
      {editable && <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => open()}>Aggiungi</Button>}
    </header>
    {error && !dialog && <Alert severity="error" sx={{ my: 2 }} role="alert">{error}</Alert>}
    {items.length > 6 && <TextField className="crud__search" size="small" placeholder={'Cerca in ' + config.label.toLowerCase()} value={query} onChange={e => setQuery(e.target.value)}
      slotProps={{ htmlInput: { 'aria-label': 'Cerca' }, input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} />}
    {loading ? <div className="center-min"><CircularProgress aria-label="Caricamento" /></div>
      : items.length === 0 ? <div className="empty-state glass"><h2>Nessun elemento ancora</h2><p>Aggiungi il primo elemento in “{config.label}”.</p>{editable && <Button variant="outlined" onClick={() => open()} startIcon={<AddRoundedIcon />}>Aggiungi</Button>}</div>
      : <ul className="rows glass">{visible.map(row => <li className="row" key={row.id}>
          <span className="row__initial" aria-hidden="true">{labelFor(row).charAt(0).toUpperCase()}</span>
          <span className="row__text"><strong>{labelFor(row)}</strong>{secondaryFor(row) && <small>{secondaryFor(row)}</small>}</span>
          {typeof row.status === 'string' && <Chip label={label(row.status)} size="small" variant="outlined" className={'status status--' + row.status} />}
          {editable && <span className="row__actions">
            <IconButton aria-label={'Modifica ' + labelFor(row)} onClick={() => open(row)}><EditOutlinedIcon fontSize="small" /></IconButton>
            <IconButton aria-label={'Elimina ' + labelFor(row)} color="error" onClick={() => setToDelete(row)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
          </span>}
        </li>)}
        {visible.length === 0 && <li className="row row--empty">Nessun risultato per “{query}”.</li>}
      </ul>}

    <Dialog open={dialog} onClose={() => !saving && setDialog(false)} maxWidth="sm" fullWidth aria-labelledby="crud-dialog-title">
      <form onSubmit={save} noValidate><DialogTitle id="crud-dialog-title">{editing ? 'Modifica' : 'Nuovo'} · {config.label}</DialogTitle>
        <DialogContent><Stack spacing={2.5} sx={{ pt: 1 }}>
          {error && <Alert severity="error" role="alert">{error}</Alert>}
          {config.fields.map(field => field.ref || field.values ? <TextField key={field.key} label={field.label} select required={field.required} value={values[field.key] ?? ''} onChange={e => setValues(old => ({ ...old, [field.key]: e.target.value }))}>
            {field.key === 'age_category' && <MenuItem value="" disabled>Seleziona la fascia di età</MenuItem>}
            {!field.required && <MenuItem value="">Non assegnato</MenuItem>}
            {(field.values ? field.values.map(id => ({ id, name: label(id) })) : references[field.ref ?? ''] ?? []).map(option => <MenuItem value={option.id} key={option.id}>{option.name}</MenuItem>)}
          </TextField> : <TextField key={field.key} label={field.label}
            type={field.type === 'number' || field.type === 'date' || field.type === 'datetime-local' || field.type === 'url' ? field.type : 'text'}
            multiline={field.type === 'textarea'} minRows={field.type === 'textarea' ? 3 : undefined} required={field.required}
            value={values[field.key] ?? ''} onChange={e => setValues(old => ({ ...old, [field.key]: e.target.value }))}
            slotProps={{
              inputLabel: field.type === 'datetime-local' || field.type === 'date' ? { shrink: true } : undefined,
              htmlInput: { min: field.min, max: field.max, maxLength: field.type === 'url' ? 2048 : field.maxLength ?? (field.type === 'textarea' ? 4000 : 200), inputMode: field.type === 'number' ? 'numeric' : undefined },
            }} />)}
          {config.key === 'players' && <>
            <Alert severity="info">Inserisci solo i dati necessari. Per i minorenni verifica l’autorizzazione del genitore o tutore prima della pubblicazione e conserva la documentazione.</Alert>
            {values.age_category === 'minor' && <>
              <FormControlLabel control={<Checkbox checked={guardianDeclaration} onChange={(_, checked) => setGuardianDeclaration(checked)} required />}
                label="Confermo di aver raccolto l’autorizzazione del genitore o tutore alla pubblicazione dei dati del minore." />
              {(values.profile_image_url ?? '').trim() && <FormControlLabel control={<Checkbox checked={minorPhotoDeclaration} onChange={(_, checked) => setMinorPhotoDeclaration(checked)} required />}
                label="Confermo che la pubblicazione della foto del minore è stata autorizzata in modo specifico." />}
              <Typography variant="caption" color="text.secondary">La conferma viene registrata con il tuo account e la data. Non sostituisce il consenso firmato, che resta a carico dell’organizzatore. Vedi la <RouterLink to="/privacy-policy" target="_blank" rel="noopener">privacy policy</RouterLink>.</Typography>
            </>}
          </>}
        </Stack></DialogContent>
        <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setDialog(false)} disabled={saving}>Annulla</Button><Button type="submit" variant="contained" disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</Button></DialogActions>
      </form>
    </Dialog>
    <Dialog open={Boolean(toDelete)} onClose={() => !saving && setToDelete(null)} maxWidth="xs" fullWidth aria-labelledby="delete-title">
      <DialogTitle id="delete-title">Eliminare “{toDelete ? labelFor(toDelete) : ''}”?</DialogTitle>
      <DialogContent><DialogContentText>L’elemento e i dati collegati verranno rimossi definitivamente. L’operazione non può essere annullata.</DialogContentText></DialogContent>
      <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setToDelete(null)} disabled={saving}>Annulla</Button><Button color="error" variant="contained" onClick={() => void remove()} disabled={saving}>Elimina</Button></DialogActions>
    </Dialog>
  </section>;
}
