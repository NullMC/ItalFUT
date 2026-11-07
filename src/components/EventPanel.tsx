/*
 * One-day tournaments in the console: publication on the event day, the 48-hour editing
 * window, the closed state, the event date and the one-off extra modules.
 * Every rule is enforced in the database (migration 202611090001); this is the UI.
 */
import { useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { EXTRA, formatEuro } from '../lib/catalog';
import { client, friendlyError } from '../lib/supabase';
import { paymentsEnabled, startCheckout } from '../lib/payments';
import { addDays, EDIT_WINDOW_HOURS, eventPhase, eventTotal, formatDay, formatMoment, romeToday } from '../lib/plan';
import type { FeatureCode, Tenant, TenantFeature } from '../lib/types';

const hoursLeft = (until: Date) => Math.max(0, Math.ceil((until.getTime() - Date.now()) / 3600_000));

/** Status banner of the overview: prepare → publish → 48 h to update. */
export function EventStatus({ tenant, canManage, base, onChanged }: { tenant: Tenant; canManage: boolean; base: string; onChanged: () => Promise<void> }) {
  const { phase, closesAt } = eventPhase(tenant);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const publish = async () => {
    setBusy(true); setError('');
    const { error: issue } = await client().rpc('publish_event', { p_tenant_id: tenant.id });
    if (issue) { setError(friendlyError(issue)); setBusy(false); return; }
    await onChanged(); setBusy(false); setConfirm(false);
  };
  return <>
    <div className={'banner glass event-banner is-' + phase} role="status">
      <span className="banner__icon" aria-hidden="true">{phase === 'open' ? <ScheduleRoundedIcon /> : <BoltRoundedIcon />}</span>
      {phase === 'upcoming' && <div><b>Torneo di un giorno · {formatDay(tenant.event_date)}</b>
        <p>Prepara squadre, rose e calendario quando vuoi: il sito resta visibile solo allo staff. Potrai pubblicarlo dal giorno del torneo.</p></div>}
      {phase === 'today' && <div><b>È il giorno del torneo: puoi pubblicarlo.</b>
        <p>Con la pubblicazione il sito diventa visibile a tutti e partono le {EDIT_WINDOW_HOURS} ore per aggiornare risultati e dati.</p></div>}
      {phase === 'open' && closesAt && <div><b>Il torneo è online · {hoursLeft(closesAt)} {hoursLeft(closesAt) === 1 ? 'ora' : 'ore'} per aggiornarlo</b>
        <p>Puoi modificare risultati e dati fino a {formatMoment(closesAt)}. Poi la console si chiude e il sito resta online.</p></div>}
      {phase === 'upcoming' && canManage && <RouterLink className="btn btn--ghost btn--sm" to={base + '/settings'}>Cambia data</RouterLink>}
      {phase === 'today' && canManage && <Button variant="contained" size="small" onClick={() => setConfirm(true)}>Pubblica il torneo</Button>}
      {phase === 'open' && <a className="btn btn--ghost btn--sm" href={'/t/' + tenant.slug} target="_blank" rel="noopener noreferrer">Apri il sito</a>}
    </div>
    <Dialog open={confirm} onClose={() => !busy && setConfirm(false)} aria-labelledby="publish-title" maxWidth="xs" fullWidth>
      <DialogTitle id="publish-title">Pubblicare il torneo?</DialogTitle>
      <DialogContent>
        <ul className="event-rules">
          <li><CheckRoundedIcon />Il sito <b>/t/{tenant.slug}</b> diventa visibile a tutti.</li>
          <li><CheckRoundedIcon />Hai {EDIT_WINDOW_HOURS} ore, fino a {formatMoment(new Date(Date.now() + EDIT_WINDOW_HOURS * 3600_000))}, per aggiornare risultati, squadre e dati.</li>
          <li><CheckRoundedIcon />Dopo, la console si chiude: il sito resta online finché non elimini il torneo.</li>
        </ul>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={() => setConfirm(false)} disabled={busy}>Annulla</Button>
        <Button variant="contained" onClick={() => void publish()} disabled={busy}>{busy ? 'Pubblicazione…' : 'Pubblica ora'}</Button>
      </DialogActions>
    </Dialog>
  </>;
}

/** Thin reminder shown on the other sections while the 48-hour window is running. */
export function EventWindowNote({ tenant }: { tenant: Tenant }) {
  const { phase, closesAt } = eventPhase(tenant);
  if (phase !== 'open' || !closesAt) return null;
  return <Alert severity="warning" icon={<ScheduleRoundedIcon />} sx={{ mb: 3 }}>Modifiche possibili fino a {formatMoment(closesAt)} ({hoursLeft(closesAt)} h).</Alert>;
}

/** Settings: the event date, editable until publication. Matches move with it. */
export function EventDateField({ tenant, canManage, onChanged }: { tenant: Tenant; canManage: boolean; onChanged: () => Promise<void> }) {
  const [value, setValue] = useState(tenant.event_date ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => setValue(tenant.event_date ?? ''), [tenant.event_date]);
  const published = Boolean(tenant.published_at);
  const save = async () => {
    setBusy(true); setMessage(null);
    const { error } = await client().rpc('set_event_date', { p_tenant_id: tenant.id, p_date: value });
    if (error) setMessage({ ok: false, text: friendlyError(error) });
    else { await onChanged(); setMessage({ ok: true, text: 'Data aggiornata: le partite sono state spostate nello stesso orario.' }); }
    setBusy(false);
  };
  return <div className="panel glass event-date">
    <h2>Giorno del torneo</h2>
    {published ? <p className="muted">{formatDay(tenant.event_date)} · il torneo è pubblicato, la data non si può più cambiare.</p> : <>
      <p className="muted">Puoi cambiarla fino alla pubblicazione: le partite già inserite si spostano nella nuova data, allo stesso orario.</p>
      <div className="event-date__row">
        <TextField type="date" label="Data" value={value} onChange={e => setValue(e.target.value)} disabled={!canManage || busy}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: romeToday(), max: addDays(romeToday(), 730) } }} />
        {canManage && <Button variant="outlined" onClick={() => void save()} disabled={busy || !value || value === tenant.event_date}>{busy ? 'Salvataggio…' : 'Salva data'}</Button>}
      </div>
    </>}
    {message && <Alert severity={message.ok ? 'success' : 'error'} sx={{ mt: 2 }}>{message.text}</Alert>}
  </div>;
}

/** Extra modules of a one-day tournament: 1-month price each, paid once, active for good. */
export function EventModules({ tenant, features, canBuy, onChanged }: { tenant: Tenant; features: TenantFeature[]; canBuy: boolean; onChanged: () => Promise<void> }) {
  const [params, setParams] = useSearchParams();
  const active = (code: string) => features.some(f => f.code === code && f.enabled && (!f.ends_at || new Date(f.ends_at).getTime() > Date.now()));
  const [picked, setPicked] = useState<FeatureCode[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // Preselect the extras chosen in the configurator (saved with the tournament).
  useEffect(() => {
    let live = true;
    void client().from('plan_quotes').select('selected_features').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        if (!live || !data) return;
        setPicked((data.selected_features as string[]).filter((code): code is FeatureCode => EXTRA.some(m => m.code === code) && !active(code)));
      });
    return () => { live = false; };
  }, [tenant.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const toBuy = picked.filter(code => !active(code));
  const total = eventTotal(toBuy);
  const toggle = (code: FeatureCode) => setPicked(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  const cancelled = params.get('pagamento') === 'annullato';

  const buy = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      await client().rpc('save_plan', { p_tenant_id: tenant.id, p_months: 1, p_features: toBuy });
      if (paymentsEnabled) { await startCheckout(tenant.id, 1, toBuy); return; }
      const { error: issue } = await client().rpc('request_upgrade', { p_tenant_id: tenant.id, p_months: 1, p_features: toBuy });
      if (issue) throw issue;
      setNotice('Richiesta registrata: i moduli si attivano dopo la conferma, senza addebiti automatici.');
      setPicked([]); await onChanged();
    } catch (cause) { setError(friendlyError(cause)); }
    setBusy(false);
  };

  return <div className="plan">
    {cancelled && <Alert severity="info" sx={{ mb: 2 }} onClose={() => { params.delete('pagamento'); setParams(params, { replace: true }); }}>Pagamento annullato: non è stato addebitato nulla.</Alert>}
    <div className="plan-status glass is-active">
      <span className="plan-status__dot" aria-hidden="true" />
      <div><b>Torneo di un giorno · funzioni base gratis</b>
        <p>Competizioni, squadre, giocatori, partite e classifiche sono incluse. I moduli extra si pagano una volta sola e restano attivi sul sito del torneo.</p></div>
    </div>
    <div className="plan-grid">
      <section className="plan-config" aria-labelledby="event-modules">
        <h2 id="event-modules">Moduli extra</h2>
        <ul className="plan-modules">{EXTRA.map(module => {
          const on = active(module.code);
          const isPicked = picked.includes(module.code);
          return <li key={module.code} className={'plan-module' + (on ? ' is-core' : '') + (isPicked && !on ? ' is-picked' : '')}>
            {on ? <span className="plan-module__check is-on" aria-hidden="true"><CheckRoundedIcon /></span>
              : <input type="checkbox" id={'ev-' + module.code} checked={isPicked} onChange={() => toggle(module.code)} disabled={!canBuy} />}
            <label htmlFor={on ? undefined : 'ev-' + module.code}><b>{module.name}</b><small>{on ? 'Attivo' : module.description}</small></label>
            <span className="plan-module__price">{on ? 'Attivo' : formatEuro(module.monthly) + ' una tantum'}</span>
          </li>;
        })}</ul>
      </section>
      <aside className="plan-summary glass" aria-label="Riepilogo">
        <div className="plan-summary__head"><h2>Riepilogo</h2></div>
        <dl>
          <div><dt>Funzioni base</dt><dd>Gratis</dd></div>
          {EXTRA.filter(m => toBuy.includes(m.code)).map(m => <div key={m.code}><dt>{m.name}</dt><dd>+ {formatEuro(m.monthly)}</dd></div>)}
        </dl>
        <div className="plan-summary__total"><span>Totale</span><strong className="display-num">{formatEuro(total)}</strong></div>
        {error && <Alert severity="error" role="alert">{error}</Alert>}
        {notice && <Alert severity="success" role="status">{notice}</Alert>}
        <Button variant="contained" size="large" fullWidth disabled={!canBuy || busy || toBuy.length === 0} onClick={() => void buy()}
          startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <LockRoundedIcon />}>
          {busy ? (paymentsEnabled ? 'Apertura pagamento…' : 'Invio…') : toBuy.length === 0 ? 'Seleziona un modulo' : paymentsEnabled ? `Paga ${formatEuro(total)}` : 'Richiedi attivazione'}
        </Button>
        <p className="plan-summary__note">{!canBuy ? 'Solo il proprietario o un amministratore del torneo può acquistare.'
          : paymentsEnabled ? 'Pagamento unico e sicuro su Stripe. Nessun abbonamento.' : 'Nessun addebito ora: i moduli si attivano dopo la conferma.'}</p>
      </aside>
    </div>
  </div>;
}

/** After the 48-hour window: the console is closed, the site stays online. */
export function EventClosed({ tenant }: { tenant: Tenant }) {
  const { closesAt } = eventPhase(tenant);
  return <div className="page">
    <div className="container event-closed">
      <div className="empty-state glass">
        <span className="event-closed__icon" aria-hidden="true"><LockRoundedIcon /></span>
        <h1>{tenant.name}</h1>
        <p>Il torneo del {formatDay(tenant.event_date)} è concluso{closesAt ? ` e la console è chiusa dal ${formatMoment(closesAt)}` : ''}. Il sito pubblico resta online con risultati e classifiche.</p>
        <div className="event-closed__actions">
          <a className="btn btn--primary" href={'/t/' + tenant.slug} target="_blank" rel="noopener noreferrer">Apri il sito<ArrowOutwardRoundedIcon /></a>
          <RouterLink className="btn btn--ghost glass" to="/console">Tutti i tornei</RouterLink>
        </div>
        <p className="muted">Per eliminare il torneo e il suo sito vai in <RouterLink to="/account">Account e dati</RouterLink>.</p>
      </div>
    </div>
  </div>;
}
