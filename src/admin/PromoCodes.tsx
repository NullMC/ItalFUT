/*
 * Superadmin → "Codici sconto": Stripe promotion codes. Customers type them on the Stripe
 * Checkout page (allow_promotion_codes is on). Codes are created and switched on/off in
 * Stripe through the admin-promotions Edge Function; the discount of each payment is
 * recorded by the webhook (payments.discount_cents / promotion_code).
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, Stack, TextField } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { DataTable } from '../components/DataTable';
import { client } from '../lib/supabase';
import { formatEuro } from '../lib/catalog';
import { functionErrorMessage } from '../lib/payments';

type Promo = {
  id: string; code: string; active: boolean; times_redeemed: number; max_redemptions: number | null;
  expires_at: number | null; created: number; first_time: boolean; minimum_cents: number | null;
  coupon: { id: string; name: string | null; percent_off: number | null; amount_off: number | null; valid: boolean } | null;
};
type Form = { code: string; name: string; kind: 'percent' | 'amount'; value: string; max: string; expires: string; minimum: string };
const EMPTY: Form = { code: '', name: '', kind: 'percent', value: '', max: '', expires: '', minimum: '' };
const FN = 'admin-promotions';
const CODE = /^[A-Z0-9][A-Z0-9_-]{2,39}$/;

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await client().functions.invoke(FN, { body });
  if (error) throw new Error(await functionErrorMessage(error, FN, 'Operazione non riuscita. Riprova più tardi.'));
  return data as T;
}
const day = (unix: number) => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(unix * 1000));
const discountText = (p: Promo) => p.coupon?.percent_off != null ? `−${p.coupon.percent_off}%` : p.coupon?.amount_off != null ? `−${formatEuro(p.coupon.amount_off / 100)}` : '—';
function status(p: Promo): { label: string; tone: string } {
  if (!p.active) return { label: 'Disattivato', tone: 'expired' };
  if (p.coupon && !p.coupon.valid) return { label: 'Coupon non valido', tone: 'failed' };
  if (p.expires_at && p.expires_at * 1000 < Date.now()) return { label: 'Scaduto', tone: 'expired' };
  if (p.max_redemptions != null && p.times_redeemed >= p.max_redemptions) return { label: 'Esaurito', tone: 'expired' };
  return { label: 'Attivo', tone: 'paid' };
}

export function PromoCodes() {
  const [codes, setCodes] = useState<Promo[] | null>(null);
  const [livemode, setLivemode] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = async () => {
    setError('');
    try {
      const data = await call<{ livemode: boolean; codes: Promo[] }>({ action: 'list' });
      setCodes(data.codes); setLivemode(data.livemode);
    } catch (cause) { setError((cause as Error).message); setCodes([]); }
  };
  useEffect(() => { void load(); }, []);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(old => ({ ...old, [key]: value }));
  const create = async (event: FormEvent) => {
    event.preventDefault(); setFormError('');
    const code = form.code.trim().toUpperCase();
    const value = Number(form.value.replace(',', '.'));
    if (!CODE.test(code)) { setFormError('Codice: da 3 a 40 caratteri tra lettere, numeri, - e _ (senza spazi).'); return; }
    if (form.kind === 'percent' && !(value > 0 && value <= 100)) { setFormError('Percentuale: da 1 a 100.'); return; }
    if (form.kind === 'amount' && !(value >= .5 && value <= 1000)) { setFormError('Importo: da 0,50 € a 1.000 €.'); return; }
    const max = form.max ? Number(form.max) : null;
    if (max !== null && !(Number.isInteger(max) && max >= 1)) { setFormError('Utilizzi massimi: un numero intero da 1 in su.'); return; }
    const minimum = form.minimum ? Math.round(Number(form.minimum.replace(',', '.')) * 100) : null;
    if (minimum !== null && !(minimum >= 0)) { setFormError('Importo minimo non valido.'); return; }
    // The code stays valid until the end of the chosen day (Italian time).
    const expires = form.expires ? Math.floor(new Date(form.expires + 'T23:59:59').getTime() / 1000) : null;
    if (expires !== null && expires * 1000 < Date.now()) { setFormError('La scadenza deve essere nel futuro.'); return; }
    setBusy(true);
    try {
      await call({ action: 'create', code, name: form.name, kind: form.kind, value: form.kind === 'percent' ? value : Math.round(value * 100), max_redemptions: max, expires_at: expires, minimum_cents: minimum });
      setOpen(false); setForm(EMPTY); setNotice(`Codice ${code} creato su Stripe: è subito utilizzabile nel pagamento.`);
      await load();
    } catch (cause) { setFormError((cause as Error).message); }
    setBusy(false);
  };
  const toggle = async (p: Promo) => {
    setToggling(p.id); setError(''); setNotice('');
    try {
      await call({ action: 'set_active', id: p.id, active: !p.active });
      setNotice(`Codice ${p.code} ${p.active ? 'disattivato' : 'riattivato'}.`);
      await load();
    } catch (cause) { setError((cause as Error).message); }
    setToggling(null);
  };
  const copy = (code: string) => { void navigator.clipboard?.writeText(code).then(() => setNotice(`${code} copiato negli appunti.`)); };

  return <div>
    <header className="ws-head">
      <div className="ws-head__text"><h1>Codici sconto</h1>
        <p>Codici promozionali di Stripe: il cliente li inserisce nella pagina di pagamento. Valgono per campionati e moduli extra dei tornei di un giorno.</p></div>
      <div className="ws-head__actions">
        {livemode !== null && <span className={'pill promo-mode' + (livemode ? ' is-live' : '')}>{livemode ? 'Stripe live' : 'Stripe test'}</span>}
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setOpen(true); setFormError(''); }}>Nuovo codice</Button>
      </div>
    </header>
    {error && <Alert severity="error" sx={{ mb: 2 }} role="alert">{error}</Alert>}
    {notice && <Alert severity="success" sx={{ mb: 2 }} role="status" onClose={() => setNotice('')}>{notice}</Alert>}
    {livemode === false && <Alert severity="info" sx={{ mb: 2 }}>Stai usando le chiavi di test: i codici creati qui esistono solo nella sandbox. Quando passi alle chiavi live dovrai ricrearli.</Alert>}
    {codes === null ? <div className="center-min"><CircularProgress aria-label="Caricamento codici" /></div>
      : <DataTable<Promo> rows={codes} rowKey={p => p.id} caption="Codici sconto Stripe" noun={['codice', 'codici']} searchLabel="Cerca un codice"
        toolbarExtra={<Button size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void load()}>Aggiorna</Button>}
        empty={<p className="muted">Nessun codice ancora. Crea il primo con “Nuovo codice”.</p>}
        filters={[{ label: 'Stato', kind: 'segmented', options: [{ id: 'on', label: 'Attivi' }, { id: 'off', label: 'Non attivi' }],
          test: (p, id) => (id === 'on') === (status(p).label === 'Attivo') }]}
        columns={[
          { key: 'code', title: 'Codice', primary: true, value: p => p.code, render: p => <span className="promo-code"><b>{p.code}</b>{p.coupon?.name && p.coupon.name !== p.code && <small>{p.coupon.name}</small>}</span> },
          { key: 'discount', title: 'Sconto', nowrap: true, value: p => p.coupon?.percent_off ?? (p.coupon?.amount_off ?? 0) / 100, render: p => <b className="display-num">{discountText(p)}</b> },
          { key: 'uses', title: 'Utilizzi', nowrap: true, align: 'end', value: p => p.times_redeemed, render: p => `${p.times_redeemed}${p.max_redemptions != null ? ' / ' + p.max_redemptions : ''}` },
          { key: 'rules', title: 'Condizioni', value: p => (p.first_time ? 1 : 0) + (p.minimum_cents ?? 0), render: p => [p.first_time && 'Solo primo acquisto', p.minimum_cents && `Minimo ${formatEuro(p.minimum_cents / 100)}`].filter(Boolean).join(' · ') || '—' },
          { key: 'expires', title: 'Scadenza', nowrap: true, value: p => p.expires_at ?? Infinity, render: p => p.expires_at ? day(p.expires_at) : 'Nessuna' },
          { key: 'status', title: 'Stato', nowrap: true, value: p => status(p).label, render: p => <span className={'pill pill--' + status(p).tone}>{status(p).label}</span> },
        ]}
        actions={p => <span className="row-actions">
          <Button size="small" onClick={() => copy(p.code)} startIcon={<ContentCopyRoundedIcon fontSize="small" />} aria-label={'Copia ' + p.code}>Copia</Button>
          <Button size="small" variant={p.active ? 'outlined' : 'contained'} color={p.active ? 'inherit' : 'primary'} disabled={toggling === p.id} onClick={() => void toggle(p)}>
            {toggling === p.id ? '…' : p.active ? 'Disattiva' : 'Riattiva'}
          </Button>
        </span>} />}
    <p className="muted" style={{ marginTop: 16, fontSize: '.86rem' }}>
      Lo sconto si applica una volta all’intero ordine. Il pagamento registra importo pieno, sconto e codice usato (scheda Pagamenti).
      Un codice disattivato non è più accettato; per cancellarlo del tutto usa la Dashboard Stripe.
    </p>

    <Dialog open={open} onClose={() => !busy && setOpen(false)} fullWidth maxWidth="sm" aria-labelledby="promo-title">
      <form onSubmit={create} noValidate>
        <DialogTitle id="promo-title">Nuovo codice sconto</DialogTitle>
        <DialogContent><Stack spacing={2.2} sx={{ pt: 1 }}>
          <TextField label="Codice" required autoFocus value={form.code} onChange={e => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))}
            helperText="Quello che il cliente scrive al pagamento, es. ESTATE20" slotProps={{ htmlInput: { maxLength: 40, autoCapitalize: 'characters' } }} />
          <TextField label="Nome interno (facoltativo)" value={form.name} onChange={e => set('name', e.target.value)} helperText="Visibile solo a te su Stripe, es. Campagna estate" slotProps={{ htmlInput: { maxLength: 40 } }} />
          <div className="create-format__options" role="radiogroup" aria-label="Tipo di sconto">
            <button type="button" role="radio" aria-checked={form.kind === 'percent'} className={'chip-link' + (form.kind === 'percent' ? ' is-active' : '')} onClick={() => set('kind', 'percent')}>Percentuale</button>
            <button type="button" role="radio" aria-checked={form.kind === 'amount'} className={'chip-link' + (form.kind === 'amount' ? ' is-active' : '')} onClick={() => set('kind', 'amount')}>Importo fisso</button>
          </div>
          <TextField label={form.kind === 'percent' ? 'Sconto (%)' : 'Sconto (€)'} required value={form.value} onChange={e => set('value', e.target.value)}
            slotProps={{ htmlInput: { inputMode: 'decimal' }, input: { endAdornment: <InputAdornment position="end">{form.kind === 'percent' ? '%' : '€'}</InputAdornment> } }} />
          <div className="promo-form__row">
            <TextField label="Utilizzi massimi" value={form.max} onChange={e => set('max', e.target.value.replace(/\D/g, ''))} helperText="Vuoto = illimitati" slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
            <TextField label="Valido fino al" type="date" value={form.expires} onChange={e => set('expires', e.target.value)} helperText="Vuoto = senza scadenza" slotProps={{ inputLabel: { shrink: true } }} />
          </div>
          <TextField label="Importo minimo dell’ordine (€)" value={form.minimum} onChange={e => set('minimum', e.target.value)} helperText="Vuoto = nessun minimo" slotProps={{ htmlInput: { inputMode: 'decimal' } }} />
          {formError && <Alert severity="error">{formError}</Alert>}
        </Stack></DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setOpen(false)} disabled={busy}>Annulla</Button>
          <Button variant="contained" type="submit" disabled={busy}>{busy ? 'Creazione su Stripe…' : 'Crea codice'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  </div>;
}
