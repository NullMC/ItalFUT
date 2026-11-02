import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, IconButton, MenuItem, Stack, Switch, TextField, Tooltip } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { DataTable } from '../components/DataTable';
import { client, friendlyError } from '../lib/supabase';
import { checkPassword } from '../lib/validation';
import { columnLabel, enumValues, HIDDEN_IN_FORM, isLongText, recordLabel, TABLES, valueLabel, type AdminColumn, type AdminRow, type AdminSchema } from './adminConfig';

const PAGE = 25;
type Names = Record<string, Map<string, string>>;

function inputKind(column: AdminColumn) {
  if (column.type === 'boolean') return 'boolean';
  if (['integer', 'smallint', 'bigint', 'numeric'].includes(column.type)) return 'number';
  if (column.type.startsWith('timestamp')) return 'datetime';
  if (column.type === 'date') return 'date';
  if (column.type === 'ARRAY') return 'array';
  if (column.type === 'jsonb' || column.type === 'json') return 'json';
  return 'text';
}
function toLocalInput(value: unknown) {
  const date = new Date(String(value));
  if (!value || Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function toFormValue(column: AdminColumn, value: unknown): string {
  if (value == null) return '';
  const kind = inputKind(column);
  if (kind === 'datetime') return toLocalInput(value);
  if (kind === 'array') return (value as unknown[]).join(', ');
  if (kind === 'json') return JSON.stringify(value, null, 2);
  if (kind === 'boolean') return value ? 'true' : 'false';
  return String(value);
}
function fromFormValue(column: AdminColumn, raw: string): unknown {
  const kind = inputKind(column);
  const value = raw.trim();
  if (value === '') return null;
  switch (kind) {
    case 'boolean': return value === 'true';
    case 'number': { const n = Number(value); if (Number.isNaN(n)) throw new Error(`“${columnLabel(column.name)}” deve essere un numero.`); return n; }
    case 'datetime': { const d = new Date(value); if (Number.isNaN(d.getTime())) throw new Error(`“${columnLabel(column.name)}” non è una data valida.`); return d.toISOString(); }
    case 'array': return value.split(',').map(item => item.trim()).filter(Boolean);
    case 'json': try { return JSON.parse(value); } catch { throw new Error(`“${columnLabel(column.name)}” non è un JSON valido.`); }
    default: return raw;
  }
}
const keyOf = (pk: string[], row: AdminRow) => Object.fromEntries(pk.map(column => [column, row[column]]));
const keyString = (pk: string[], row: AdminRow) => pk.map(column => String(row[column])).join('|');

export function AdminTable({ table, schema }: { table: string; schema: AdminSchema }) {
  const meta = TABLES[table];
  const def = schema[table];
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [names, setNames] = useState<Names>({});
  const [options, setOptions] = useState<Record<string, { id: string; label: string }[]>>({});
  const [editing, setEditing] = useState<AdminRow | null | 'new'>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toDelete, setToDelete] = useState<AdminRow | null>(null);
  const [viewing, setViewing] = useState<AdminRow | null>(null);
  const [passwordFor, setPasswordFor] = useState<AdminRow | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // The audit log stores admin ids without a foreign key: label them as users too.
  const refs = useMemo<Record<string, string>>(() => ({ ...(def?.references ?? {}), ...(table === 'admin_audit_log' ? { admin_id: 'profiles' } : {}) }), [def, table]);
  const refTables = useMemo(() => [...new Set(Object.values(refs))], [refs]);
  const editable = useMemo(() => (def?.columns ?? []).filter(column => !column.identity && !column.generated && !HIDDEN_IN_FORM.has(column.name)), [def]);

  // Debounced search.
  useEffect(() => { const timer = window.setTimeout(() => { setQuery(search); setPage(0); }, 350); return () => window.clearTimeout(timer); }, [search]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data, error: issue } = await client().rpc('admin_list', { p_table: table, p_search: query || null, p_limit: PAGE, p_offset: page * PAGE });
      if (issue) throw issue;
      setRows((data?.rows ?? []) as AdminRow[]); setTotal(Number(data?.total ?? 0));
    } catch (cause) { setError(friendlyError(cause)); }
    finally { setLoading(false); }
  }, [table, query, page]);
  useEffect(() => { void load(); }, [load]);

  // Labels for foreign keys (teams are always loaded so match labels read well).
  useEffect(() => {
    let alive = true;
    const needed = [...new Set([...refTables, ...(refTables.includes('matches') || table === 'matches' ? ['teams'] : [])])];
    void Promise.all(needed.map(async ref => {
      const { data } = await client().rpc('admin_list', { p_table: ref, p_limit: 1000 });
      return [ref, (data?.rows ?? []) as AdminRow[]] as const;
    })).then(results => {
      if (!alive) return;
      const base: Names = Object.fromEntries(results.map(([ref, list]) => [ref, new Map(list.map(row => [String(row.id ?? row.code ?? row.user_id), recordLabel(ref, row)]))]));
      setNames(base);
      setOptions(Object.fromEntries(results.map(([ref, list]) => [ref, list.map(row => ({ id: String(row.id ?? row.code ?? row.user_id), label: recordLabel(ref, row, base) }))])));
    });
    return () => { alive = false; };
  }, [refTables, table]);

  const cell = (column: string, value: unknown) => {
    if (value == null || value === '') return <span className="muted">—</span>;
    if (column === 'table_name' && TABLES[String(value)]) return TABLES[String(value)].label;
    const ref = refs[column];
    if (ref) return names[ref]?.get(String(value)) ?? <code>{String(value).slice(0, 8)}</code>;
    const col = def.columns.find(c => c.name === column);
    if (col?.type === 'boolean') return value ? 'Sì' : 'No';
    if (col?.type.startsWith('timestamp')) return new Date(String(value)).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
    if (col?.type === 'ARRAY') return (value as unknown[]).map(valueLabel).join(', ');
    if (enumValues(def, column)) return <span className={'pill pill--' + String(value)}>{valueLabel(value)}</span>;
    if (column.endsWith('_cents')) return (Number(value) / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
    if (typeof value === 'object') return <code>{JSON.stringify(value).slice(0, 60)}</code>;
    const text = String(value);
    return text.length > 70 ? text.slice(0, 70) + '…' : text;
  };

  const openForm = (row: AdminRow | 'new') => {
    setFormError('');
    setValues(Object.fromEntries(editable.map(column => [column.name, row === 'new'
      ? (column.type === 'boolean' && column.default ? (column.default.includes('true') ? 'true' : 'false') : '')
      : toFormValue(column, row[column.name])])));
    setEditing(row);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault(); setFormError('');
    const isNew = editing === 'new';
    try {
      const payload: Record<string, unknown> = {};
      for (const column of editable) {
        if (!isNew && def.pk.includes(column.name)) continue;
        if (isNew && column.name === 'id' && column.default) continue;
        const raw = values[column.name] ?? '';
        if (isNew && raw.trim() === '') {
          if (!column.nullable && !column.default) throw new Error(`Il campo “${columnLabel(column.name)}” è obbligatorio.`);
          continue; // let the database default apply
        }
        payload[column.name] = fromFormValue(column, raw);
      }
      setSaving(true);
      const { error: issue } = await client().rpc('admin_save', { p_table: table, p_row: payload, p_key: isNew ? null : keyOf(def.pk, editing as AdminRow) });
      if (issue) throw issue;
      setEditing(null); setNotice(isNew ? 'Record creato.' : 'Modifiche salvate.');
      await load();
    } catch (cause) { setFormError(friendlyError(cause)); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!toDelete) return;
    setSaving(true); setError('');
    try {
      const { error: issue } = await client().rpc('admin_delete', { p_table: table, p_key: keyOf(def.pk, toDelete) });
      if (issue) throw issue;
      setToDelete(null); setNotice(table === 'profiles' ? 'Account eliminato.' : 'Record eliminato.');
      await load();
    } catch (cause) { setError(friendlyError(cause)); setToDelete(null); }
    finally { setSaving(false); }
  };

  const setPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!passwordFor) return;
    setSaving(true); setFormError('');
    try {
      if (!checkPassword(newPassword).ok) throw new Error('Almeno 10 caratteri, con lettere e numeri.');
      const { error: issue } = await client().rpc('admin_set_password', { p_user_id: passwordFor.id, p_password: newPassword });
      if (issue) throw issue;
      setPasswordFor(null); setNewPassword('');
      setNotice('Password impostata. Tutte le sessioni dell’utente sono state chiuse: comunicagli la nuova password tramite la sua richiesta di supporto.');
    } catch (cause) { setFormError(friendlyError(cause)); }
    finally { setSaving(false); }
  };

  if (!def) return <Alert severity="error">Scheda non disponibile: esegui la migrazione superadmin.</Alert>;
  const display = meta.display.filter(column => def.columns.some(c => c.name === column));

  const field = (column: AdminColumn) => {
    const label = columnLabel(column.name) + (!column.nullable && !column.default ? ' *' : '');
    const value = values[column.name] ?? '';
    const set = (next: string) => setValues(old => ({ ...old, [column.name]: next }));
    const locked = editing !== 'new' && def.pk.includes(column.name);
    const ref = refs[column.name];
    const allowed = enumValues(def, column.name);
    if (inputKind(column) === 'boolean') return <FormControlLabel key={column.name} control={<Switch checked={value === 'true'} onChange={(_, checked) => set(checked ? 'true' : 'false')} disabled={locked} />} label={columnLabel(column.name)} />;
    if (ref || allowed) return <TextField key={column.name} select label={label} value={value} onChange={e => set(e.target.value)} disabled={locked}>
      {column.nullable && <MenuItem value="">—</MenuItem>}
      {(ref ? options[ref] ?? [] : allowed!.map(id => ({ id, label: valueLabel(id) }))).map(option => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
    </TextField>;
    const kind = inputKind(column);
    return <TextField key={column.name} label={label} value={value} onChange={e => set(e.target.value)} disabled={locked || (column.name === 'id' && editing === 'new')}
      type={kind === 'number' ? 'number' : kind === 'datetime' ? 'datetime-local' : kind === 'date' ? 'date' : 'text'}
      multiline={kind === 'json' || isLongText(column.name)} minRows={kind === 'json' || isLongText(column.name) ? 3 : undefined}
      helperText={kind === 'array' ? 'Valori separati da virgola' : column.name === 'id' && editing === 'new' ? 'Generato automaticamente' : undefined}
      slotProps={{ inputLabel: kind === 'datetime' || kind === 'date' ? { shrink: true } : undefined }} />;
  };

  return <section className="admin-table" aria-labelledby="admin-table-title">
    <header className="ws-head">
      <div className="ws-head__text"><h1 id="admin-table-title">{meta.label}</h1>{meta.hint && <p>{meta.hint}</p>}</div>
      <Stack direction="row" gap={1} className="ws-head__actions">
        <Tooltip title="Aggiorna"><IconButton aria-label="Aggiorna" onClick={() => void load()}><RefreshRoundedIcon /></IconButton></Tooltip>
        {!meta.readOnly && !meta.noCreate && <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => openForm('new')}>Aggiungi</Button>}
      </Stack>
    </header>
    {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')} role="status">{notice}</Alert>}
    {error && <Alert severity="error" sx={{ mb: 2 }} role="alert">{error}</Alert>}
    <DataTable<AdminRow> rows={rows} rowKey={row => keyString(def.pk, row)} caption={'Tabella ' + meta.label} pageSize={PAGE}
      searchLabel="Cerca in tutti i campi" noun={['record', 'record']}
      remote={{ total, page, onPage: setPage, query: search, onQuery: setSearch, loading }}
      columns={display.map((column, index) => ({ key: column, title: columnLabel(column), primary: index === 0, render: (row: AdminRow) => cell(column, row[column]) }))}
      actions={row => <span className="row-actions">
        <IconButton size="small" aria-label="Dettagli" onClick={() => setViewing(row)}><VisibilityRoundedIcon fontSize="small" /></IconButton>
        {table === 'profiles' && <IconButton size="small" aria-label={'Imposta password per ' + recordLabel(table, row)} onClick={() => { setPasswordFor(row); setNewPassword(''); setFormError(''); }}><KeyRoundedIcon fontSize="small" /></IconButton>}
        {!meta.readOnly && !meta.noEdit && <IconButton size="small" aria-label="Modifica" onClick={() => openForm(row)}><EditOutlinedIcon fontSize="small" /></IconButton>}
        {!meta.readOnly && <IconButton size="small" color="error" aria-label="Elimina" onClick={() => setToDelete(row)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>}
      </span>} />

    <Dialog open={editing !== null} onClose={() => !saving && setEditing(null)} fullWidth maxWidth="sm" aria-labelledby="admin-form-title">
      <form onSubmit={save} noValidate>
        <DialogTitle id="admin-form-title">{editing === 'new' ? 'Nuovo record' : 'Modifica record'} · {meta.label}</DialogTitle>
        <DialogContent><Stack spacing={2.2} sx={{ pt: 1 }}>
          {formError && <Alert severity="error" role="alert">{formError}</Alert>}
          {editable.filter(column => !(editing === 'new' && column.name === 'id' && column.default)).map(field)}
        </Stack></DialogContent>
        <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setEditing(null)} disabled={saving}>Annulla</Button><Button type="submit" variant="contained" disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</Button></DialogActions>
      </form>
    </Dialog>

    <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} fullWidth maxWidth="md" aria-labelledby="admin-view-title">
      <DialogTitle id="admin-view-title">Dettagli · {viewing ? recordLabel(table, viewing, names) : ''}</DialogTitle>
      <DialogContent>
        <dl className="admin-detail">{viewing && def.columns.map(column => <div key={column.name}>
          <dt>{columnLabel(column.name)}</dt>
          <dd>{typeof viewing[column.name] === 'object' && viewing[column.name] !== null ? <pre>{JSON.stringify(viewing[column.name], null, 2)}</pre> : cell(column.name, viewing[column.name])}</dd>
        </div>)}</dl>
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setViewing(null)}>Chiudi</Button></DialogActions>
    </Dialog>

    <Dialog open={Boolean(toDelete)} onClose={() => !saving && setToDelete(null)} maxWidth="xs" fullWidth aria-labelledby="admin-delete-title">
      <DialogTitle id="admin-delete-title">{table === 'profiles' ? 'Eliminare questo account?' : 'Eliminare questo record?'}</DialogTitle>
      <DialogContent><DialogContentText>
        <b>{toDelete ? recordLabel(table, toDelete, names) : ''}</b> verrà eliminato definitivamente{table === 'tenants' ? ' insieme a tutti i contenuti del torneo' : table === 'profiles' ? ', con le sue appartenenze ai tornei e le sue richieste' : ''}. L’operazione resta nel registro attività ma non può essere annullata.
      </DialogContentText></DialogContent>
      <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setToDelete(null)} disabled={saving}>Annulla</Button><Button color="error" variant="contained" onClick={() => void remove()} disabled={saving}>Elimina</Button></DialogActions>
    </Dialog>

    <Dialog open={Boolean(passwordFor)} onClose={() => !saving && setPasswordFor(null)} maxWidth="xs" fullWidth aria-labelledby="admin-password-title">
      <form onSubmit={setPassword}>
        <DialogTitle id="admin-password-title">Nuova password per {passwordFor ? recordLabel(table, passwordFor) : ''}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="info">Usala solo dopo aver verificato che la richiesta arriva davvero dal titolare dell’account. L’utente verrà disconnesso da tutti i dispositivi.</Alert>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField label="Password temporanea" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" slotProps={{ htmlInput: { maxLength: 72 } }} />
        </Stack></DialogContent>
        <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setPasswordFor(null)} disabled={saving}>Annulla</Button><Button type="submit" variant="contained" disabled={saving || !newPassword}>Imposta password</Button></DialogActions>
      </form>
    </Dialog>
  </section>;
}
