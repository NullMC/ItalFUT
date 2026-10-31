import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Alert, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { client, friendlyError } from '../lib/supabase';
import type { FeatureCode, Option, Row } from '../lib/types';

type Field = { key: string; label: string; type?: 'number' | 'date' | 'datetime-local' | 'textarea' | 'select' | 'color'; required?: boolean; values?: string[]; ref?: string };
export type EditorDefinition = { key: string; label: string; table: string; feature: FeatureCode; summary: string; fields: Field[] };
export const EDITORS: EditorDefinition[] = [
  { key: 'competitions', feature: 'competitions', label: 'Competizioni', table: 'competitions', summary: 'Crea stagioni, gironi e tornei indipendenti.', fields: [
    { key: 'name', label: 'Nome competizione', required: true }, { key: 'season_label', label: 'Stagione' },
    { key: 'status', label: 'Stato', type: 'select', values: ['upcoming', 'active', 'finished'] },
    { key: 'statistics_group', label: 'Raggruppamento statistiche' },
    { key: 'start_date', label: 'Data inizio', type: 'date' }, { key: 'end_date', label: 'Data fine', type: 'date' },
  ] },
  { key: 'teams', feature: 'teams', label: 'Squadre', table: 'teams', summary: 'Gestisci l’identità delle squadre del tuo torneo.', fields: [
    { key: 'name', label: 'Nome squadra', required: true }, { key: 'logo_url', label: 'URL logo' },
    { key: 'accent_hex', label: 'Colore squadra (es. #198f61)' },
  ] },
  { key: 'enrollments', feature: 'teams', label: 'Iscrizioni ai tornei', table: 'competition_teams', summary: 'Assegna le squadre alle competizioni, anche a più tornei contemporaneamente.', fields: [
    { key: 'competition_id', label: 'Competizione', ref: 'competitions', required: true },
    { key: 'team_id', label: 'Squadra', ref: 'teams', required: true },
  ] },
  { key: 'players', feature: 'players', label: 'Giocatori', table: 'players', summary: 'Rose, numeri di maglia, ruoli e immagini profilo.', fields: [
    { key: 'team_id', label: 'Squadra', ref: 'teams', required: true },
    { key: 'first_name', label: 'Nome', required: true }, { key: 'last_name', label: 'Cognome', required: true },
    { key: 'shirt_number', label: 'Numero maglia', type: 'number' },
    { key: 'position', label: 'Ruolo', type: 'select', values: ['P', 'D', 'C', 'A'] },
    { key: 'profile_image_url', label: 'URL foto profilo' },
  ] },
  { key: 'matches', feature: 'matches', label: 'Partite', table: 'matches', summary: 'Programma incontri, campi, date e risultati.', fields: [
    { key: 'competition_id', label: 'Competizione', ref: 'competitions', required: true },
    { key: 'home_team_id', label: 'Squadra casa', ref: 'teams', required: true },
    { key: 'away_team_id', label: 'Squadra ospite', ref: 'teams', required: true },
    { key: 'matchday', label: 'Giornata' },
    { key: 'kickoff_at', label: 'Data e ora', type: 'datetime-local', required: true },
    { key: 'venue', label: 'Campo / stadio' },
    { key: 'status', label: 'Stato partita', type: 'select', values: ['scheduled', 'live', 'finished', 'postponed'] },
    { key: 'home_score', label: 'Gol casa', type: 'number' }, { key: 'away_score', label: 'Gol ospite', type: 'number' },
  ] },
  { key: 'events', feature: 'statistics', label: 'Eventi e statistiche', table: 'match_events', summary: 'Registra marcatori, assist, cartellini e contributi individuali.', fields: [
    { key: 'match_id', label: 'Partita', ref: 'matches', required: true },
    { key: 'player_id', label: 'Giocatore', ref: 'players' },
    { key: 'related_player_id', label: 'Assist / giocatore collegato', ref: 'players' },
    { key: 'event_type', label: 'Tipo evento', type: 'select', values: ['goal', 'assist', 'yellow_card', 'red_card', 'mvp', 'other'], required: true },
    { key: 'minute', label: 'Minuto', type: 'number' }, { key: 'note', label: 'Nota' },
  ] },
  { key: 'staff', feature: 'staff', label: 'Staff', table: 'staff_members', summary: 'Anagrafica staff, foto e statistiche.', fields: [
    { key: 'name', label: 'Nome completo', required: true },
    { key: 'role', label: 'Ruolo / incarico' }, { key: 'photo_url', label: 'URL foto' },
    { key: 'goals', label: 'Gol staff', type: 'number' },
  ] },
  { key: 'awards', feature: 'awards', label: 'Premi', table: 'awards', summary: 'Premia giocatori e membri staff con riconoscimenti dedicati.', fields: [
    { key: 'title', label: 'Titolo premio', required: true },
    { key: 'award_type', label: 'Categoria', type: 'select', values: ['potm', 'staff_of_month', 'top7', 'mvp', 'other'], required: true },
    { key: 'month_label', label: 'Mese / periodo' },
    { key: 'player_id', label: 'Giocatore premiato', ref: 'players' },
    { key: 'staff_id', label: 'Membro staff premiato', ref: 'staff_members' },
    { key: 'image_url', label: 'URL immagine' },
  ] },
  { key: 'sponsors', feature: 'sponsors', label: 'Sponsor e partner', table: 'sponsors', summary: 'Partner commerciali, loghi e collegamenti.', fields: [
    { key: 'name', label: 'Nome sponsor', required: true },
    { key: 'description', label: 'Descrizione', type: 'textarea' },
    { key: 'logo_url', label: 'URL logo' }, { key: 'image_url', label: 'URL immagine attività' },
    { key: 'website_url', label: 'Sito web' }, { key: 'sort_order', label: 'Ordine', type: 'number' },
  ] },
  { key: 'articles', feature: 'articles', label: 'Articoli', table: 'articles', summary: 'Notizie, comunicati e contenuti in evidenza.', fields: [
    { key: 'title', label: 'Titolo', required: true },
    { key: 'summary', label: 'Introduzione', type: 'textarea' },
    { key: 'body', label: 'Testo articolo', type: 'textarea' },
    { key: 'image_url', label: 'URL immagine' },
    { key: 'sort_order', label: 'Ordine di visualizzazione', type: 'number' },
  ] },
  { key: 'market', feature: 'market', label: 'Calciomercato', table: 'market_slots', summary: 'Fino a sei inserimenti mercato per squadra.', fields: [
    { key: 'team_id', label: 'Squadra', ref: 'teams', required: true },
    { key: 'slot_number', label: 'Slot (1–6)', type: 'number', required: true },
    { key: 'player_name', label: 'Nome giocatore', required: true },
    { key: 'photo_url', label: 'URL foto' }, { key: 'notes', label: 'Note', type: 'textarea' },
  ] },
  { key: 'gallery', feature: 'gallery', label: 'Foto gallery', table: 'galleries', summary: 'Link liberi: cartelle Drive, album, piattaforme esterne.', fields: [
    { key: 'match_id', label: 'Partita', ref: 'matches', required: true },
    { key: 'label', label: 'Titolo gallery', required: true },
    { key: 'url', label: 'Link gallery', required: true },
  ] },
];

function datetimeLocal(value: unknown) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
function labelFor(row: Row, config: EditorDefinition) {
  if (config.key === 'players') return String(row.first_name ?? '') + ' ' + String(row.last_name ?? '');
  if (config.key === 'matches') return String(row.matchday ?? 'Partita') + ' · ' + String(row.kickoff_at ?? '').slice(0, 16).replace('T', ' ');
  if (config.key === 'enrollments') return 'Associazione · ' + String(row.competition_id ?? '').slice(0, 8);
  if (config.key === 'events') return String(row.event_type ?? 'Evento') + ' · minuto ' + String(row.minute ?? '—');
  return String(row.name ?? row.title ?? row.label ?? row.player_name ?? 'Elemento');
}
function secondaryFor(row: Row, config: EditorDefinition) {
  if (config.key === 'competitions') return String(row.season_label ?? row.status ?? '');
  if (config.key === 'matches') return String(row.status ?? '') + ' · ' + String(row.venue ?? '');
  if (config.key === 'articles') return String(row.summary ?? '').slice(0, 110);
  return String(row.role ?? row.description ?? row.position ?? row.award_type ?? '').slice(0, 110);
}

export function CrudEditor({ tenantId, config, editable }: { tenantId: string; config: EditorDefinition; editable: boolean }) {
  const [items, setItems] = useState<Row[]>([]);
  const [references, setReferences] = useState<Record<string, Option[]>>({});
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const refTables = useMemo(() => [...new Set(config.fields.map(f => f.ref).filter((x): x is string => !!x))], [config]);
  const load = async () => {
    const sb = client();
    const { data, error: issue } = await sb.from(config.table).select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (issue) throw issue;
    setItems((data ?? []) as Row[]);
  };
  useEffect(() => {
    let live = true;
    setLoading(true); setError('');
    const run = async () => {
      try {
        const sb = client();
        const referenceEntries = await Promise.all(refTables.map(async table => {
          const { data, error: issue } = await sb.from(table).select('*').eq('tenant_id', tenantId).limit(400);
          if (issue) throw issue;
          return [table, (data ?? []).map((record: Record<string, unknown>) => ({
            id: String(record.id),
            name: table === 'players' ? String(record.first_name) + ' ' + String(record.last_name)
              : table === 'matches' ? String(record.matchday ?? 'Partita') + ' · ' + String(record.kickoff_at ?? '').slice(0, 16)
              : String(record.name ?? record.title ?? record.id),
          }))] as const;
        }));
        const { data, error: issue } = await sb.from(config.table).select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
        if (issue) throw issue;
        if (live) { setReferences(Object.fromEntries(referenceEntries)); setItems((data ?? []) as Row[]); }
      } catch (cause) { if (live) setError(friendlyError(cause)); }
      finally { if (live) setLoading(false); }
    };
    void run();
    return () => { live = false; };
  }, [tenantId, config, refTables]);

  const open = (row?: Row) => {
    setEditing(row ?? null); setError('');
    setValues(Object.fromEntries(config.fields.map(field => [field.key, row?.[field.key] == null ? (field.values && (field.required || field.key === 'status') ? field.values[0] : '') : field.type === 'datetime-local' ? datetimeLocal(row[field.key]) : String(row[field.key])])));
    setDialog(true);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const payload: Record<string, string | number | null> = {};
      for (const field of config.fields) {
        const input = (values[field.key] ?? '').trim();
        if (!input && !editing) continue;
        payload[field.key] = input === '' ? (field.key === 'sort_order' || field.key === 'goals' ? 0 : null) : field.type === 'number' ? Number(input) : field.type === 'datetime-local' ? new Date(input).toISOString() : input;
      }
      const sb = client();
      const result = editing
        ? await sb.from(config.table).update(payload).eq('id', editing.id).eq('tenant_id', tenantId)
        : await sb.from(config.table).insert({ ...payload, tenant_id: tenantId });
      if (result.error) throw result.error;
      setDialog(false); await load();
    } catch (cause) { setError(friendlyError(cause)); }
    finally { setSaving(false); }
  };
  const remove = async (row: Row) => {
    if (!window.confirm('Eliminare questo elemento? Questa operazione non può essere annullata.')) return;
    setError('');
    try {
      const { error: issue } = await client().from(config.table).delete().eq('id', row.id).eq('tenant_id', tenantId);
      if (issue) throw issue;
      await load();
    } catch (cause) { setError(friendlyError(cause)); }
  };
  return <section className="crud-section">
    <div className="crud-header"><div><Typography variant="h4">{config.label}</Typography><p>{config.summary}</p></div>
      {editable && <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => open()}>Aggiungi</Button>}
    </div>
    {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
    {loading ? <div className="center-min"><CircularProgress /></div> :
      items.length === 0 ? <div className="empty-editor"><Typography variant="h6">Nessun elemento in {config.label.toLowerCase()}</Typography><p>Aggiungi il primo elemento per iniziare.</p>{editable && <Button variant="outlined" onClick={() => open()} startIcon={<AddRoundedIcon />}>Aggiungi {config.label.toLowerCase()}</Button>}</div>
      : <div className="editor-list">{items.map(row => <div className="editor-row" key={row.id}><div className="editor-row-initial">{labelFor(row, config).charAt(0).toUpperCase()}</div>
        <div className="editor-row-details"><strong>{labelFor(row, config)}</strong>{secondaryFor(row, config) && <small>{secondaryFor(row, config)}</small>}</div>
        {typeof row.status === 'string' && <Chip label={row.status} size="small" variant="outlined" />}
        {editable && <Stack direction="row"><IconButton aria-label={'Modifica ' + labelFor(row, config)} onClick={() => open(row)}><EditOutlinedIcon fontSize="small" /></IconButton><IconButton aria-label={'Elimina ' + labelFor(row, config)} color="error" onClick={() => void remove(row)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Stack>}
      </div>)}</div>}
    <Dialog open={dialog} onClose={() => !saving && setDialog(false)} maxWidth="sm" fullWidth>
      <form onSubmit={save}><DialogTitle fontWeight={800}>{editing ? 'Modifica' : 'Nuovo elemento'} · {config.label}</DialogTitle>
        <DialogContent><Stack spacing={2.5} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {config.fields.map(field => field.ref || field.values ? <TextField key={field.key} label={field.label} select required={field.required} value={values[field.key] ?? ''} onChange={e => setValues(old => ({ ...old, [field.key]: e.target.value }))}>
            {!field.required && <MenuItem value="">Non assegnato</MenuItem>}
            {(field.values ? field.values.map(id => ({ id, name: id })) : references[field.ref ?? ''] ?? []).map(option => <MenuItem value={option.id} key={option.id}>{option.name}</MenuItem>)}
          </TextField> : <TextField key={field.key} label={field.label} type={field.type === 'number' || field.type === 'date' || field.type === 'datetime-local' ? field.type : 'text'} multiline={field.type === 'textarea'} minRows={field.type === 'textarea' ? 3 : undefined} required={field.required}
            value={values[field.key] ?? ''} onChange={e => setValues(old => ({ ...old, [field.key]: e.target.value }))} slotProps={field.type === 'datetime-local' ? { inputLabel: { shrink: true } } : undefined} />)}
        </Stack></DialogContent>
        <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setDialog(false)} disabled={saving}>Annulla</Button><Button type="submit" variant="contained" disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</Button></DialogActions>
      </form>
    </Dialog>
  </section>;
}
