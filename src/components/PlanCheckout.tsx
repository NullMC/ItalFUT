/*
 * Plan and payments page of a tournament (console → Moduli) when payments are on.
 * Pattern from the 21st.dev SaaS templates (Waymark pricing): plan status, configurable
 * duration and modules with a live total, one clear pay button, payment history.
 * Prices here are an estimate: the amount charged is computed in the database.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, CircularProgress } from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { BASE_MONTHLY, estimate, EXTRA, formatEuro, MODULES, TERMS, validMonths } from '../lib/catalog';
import { DurationStepper } from './DurationStepper';
import { client, friendlyError } from '../lib/supabase';
import { PAYMENT_STATUS, startCheckout, type Payment } from '../lib/payments';
import type { FeatureCode, TenantFeature } from '../lib/types';

type Sub = { status: string; period_start: string | null; period_end: string | null };
type Props = {
  tenantId: string; tenantStatus: string; canBuy: boolean; features: TenantFeature[];
  initial?: { months?: number; modules?: string[] };
};
const date = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value)) : '';

export function PlanCheckout({ tenantId, tenantStatus, canBuy, features, initial }: Props) {
  const [params, setParams] = useSearchParams();
  const [months, setMonths] = useState(validMonths(initial?.months) ? Number(initial?.months) : 1);
  const [picked, setPicked] = useState<FeatureCode[]>(() => (initial?.modules ?? []).filter((code): code is FeatureCode => EXTRA.some(m => m.code === code)));
  const [sub, setSub] = useState<Sub | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Saved configuration: loaded from the tournament (plan_quotes), saved again on every change.
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const edited = useRef(false);
  const [ready, setReady] = useState(false);
  const cancelled = params.get('pagamento') === 'annullato';

  useEffect(() => {
    let live = true;
    void Promise.all([
      client().from('subscriptions').select('status,period_start,period_end').eq('tenant_id', tenantId).order('period_end', { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
      client().from('payments').select('id,status,months,features,amount_cents,amount_paid_cents,paid_at,period_start,period_end,created_at').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(8),
      client().from('plan_quotes').select('months,selected_features').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([s, p, q]) => {
      if (!live) return;
      setSub((s.data as Sub | null) ?? null);
      setPayments(p.error ? [] : (p.data ?? []) as Payment[]);
      const saved = q.data as { months: number; selected_features: string[] } | null;
      // The saved plan wins over the one passed at creation (it may have been edited since).
      if (!edited.current) {
        if (saved && validMonths(saved.months)) {
          setMonths(saved.months);
          setPicked(saved.selected_features.filter((code): code is FeatureCode => EXTRA.some(m => m.code === code)));
        } else if (!initial) {
          // No saved plan yet: start from the extras that are active now (renewal).
          setPicked(EXTRA.filter(m => features.some(f => f.code === m.code && f.enabled && f.ends_at && new Date(f.ends_at).getTime() > Date.now())).map(m => m.code));
        }
      }
      setReady(true);
    });
    return () => { live = false; };
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave (debounced) after the user changes duration or modules.
  useEffect(() => {
    if (!ready || !edited.current || !canBuy) return;
    setSaveState('saving');
    const timer = window.setTimeout(() => {
      void client().rpc('save_plan', { p_tenant_id: tenantId, p_months: months, p_features: picked })
        .then(({ error: issue }) => setSaveState(issue ? 'error' : 'saved'));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [months, picked, ready, canBuy, tenantId]);
  const changeMonths = (value: number) => { edited.current = true; setMonths(value); };

  const activeUntil = (code: string) => {
    const f = features.find(item => item.code === code && item.enabled);
    if (!f) return null;
    if (!f.ends_at) return 'unlimited';
    return new Date(f.ends_at).getTime() > Date.now() ? f.ends_at : null;
  };
  const planActive = Boolean(sub?.status === 'active' && sub.period_end && new Date(sub.period_end).getTime() > Date.now());
  const quote = useMemo(() => estimate(months, picked), [months, picked]);
  const toggle = (code: FeatureCode) => { edited.current = true; setPicked(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]); };

  const pay = async () => {
    setError(''); setBusy(true);
    try {
      // Keep the saved configuration identical to what is being paid.
      await client().rpc('save_plan', { p_tenant_id: tenantId, p_months: months, p_features: picked });
      await startCheckout(tenantId, months, picked);
    }
    catch (cause) { setError(friendlyError(cause)); setBusy(false); }
  };

  return <div className="plan">
    {cancelled && <Alert severity="info" sx={{ mb: 2 }} onClose={() => { params.delete('pagamento'); setParams(params, { replace: true }); }}>
      Pagamento annullato: non è stato addebitato nulla. Puoi riprovare quando vuoi.
    </Alert>}

    <div className={'plan-status glass' + (planActive ? ' is-active' : '')}>
      <span className="plan-status__dot" aria-hidden="true" />
      <div>
        <b>{planActive ? `Piano attivo fino al ${date(sub?.period_end)}` : tenantStatus === 'draft' ? 'Nessun piano attivo' : sub ? 'Piano scaduto' : 'Torneo pubblicato senza piano a pagamento'}</b>
        <p>{planActive ? 'Il sito pubblico resta online fino a quella data. Un nuovo pagamento allunga il piano a partire dalla scadenza.'
          : tenantStatus === 'draft' ? 'Il torneo è in bozza: con il primo pagamento il sito pubblico viene pubblicato.'
          : sub ? 'Il sito pubblico è visibile solo allo staff finché non rinnovi il piano.'
          : 'Il torneo è stato attivato manualmente. Puoi comunque acquistare moduli e periodi.'}</p>
      </div>
    </div>

    <div className="plan-grid">
      <section className="plan-config" aria-labelledby="plan-duration">
        <h2 id="plan-duration">Durata</h2>
        <div className="plan-terms" role="radiogroup" aria-label="Durata del piano">
          {TERMS.map(term => <button key={term.months} type="button" role="radio" aria-checked={months === term.months}
            className={'plan-term glass' + (months === term.months ? ' is-active' : '')} onClick={() => changeMonths(term.months)}>
            <b className="display-num">{term.months}</b><span>{term.months === 1 ? 'mese' : 'mesi'}</span>
            <small>{term.discount ? `−${Math.round(term.discount * 100)}%` : 'Tariffa base'}</small>
          </button>)}
        </div>
        <DurationStepper months={months} onChange={changeMonths} disabled={!canBuy} className="plan-custom" />

        <h2>Moduli</h2>
        <ul className="plan-modules">
          {MODULES.map(module => {
            const until = activeUntil(module.code);
            const isPicked = picked.includes(module.code);
            return <li key={module.code} className={'plan-module' + (module.core ? ' is-core' : '') + (isPicked ? ' is-picked' : '')}>
              {module.core ? <span className="plan-module__check is-on" aria-hidden="true"><CheckRoundedIcon /></span>
                : <input type="checkbox" id={'mod-' + module.code} checked={isPicked} onChange={() => toggle(module.code)} disabled={!canBuy} />}
              <label htmlFor={module.core ? undefined : 'mod-' + module.code}>
                <b>{module.name}</b>
                <small>{module.core ? 'Incluso nella piattaforma base' : until === 'unlimited' ? 'Attivo senza scadenza' : until ? `Attivo fino al ${date(until)} · selezionalo per prolungarlo` : module.description}</small>
              </label>
              <span className="plan-module__price">{module.core ? 'Incluso' : `${formatEuro(module.monthly)}/mese`}</span>
            </li>;
          })}
        </ul>
      </section>

      <aside className="plan-summary glass" aria-label="Riepilogo">
        <div className="plan-summary__head">
          <h2>Riepilogo</h2>
          {canBuy && saveState !== 'idle' && <span className={'plan-save is-' + saveState} role="status">{saveState === 'saving' ? 'Salvataggio…' : saveState === 'saved' ? 'Configurazione salvata' : 'Non salvata'}</span>}
        </div>
        <dl>
          <div><dt>Piattaforma base</dt><dd>{formatEuro(BASE_MONTHLY)}/mese</dd></div>
          {EXTRA.filter(m => picked.includes(m.code)).map(m => <div key={m.code}><dt>{m.name}</dt><dd>+ {formatEuro(m.monthly)}/mese</dd></div>)}
          <div className="plan-summary__sep"><dt>Durata</dt><dd>{months} {months === 1 ? 'mese' : 'mesi'}{quote.discount ? ` · −${Math.round(quote.discount * 100)}%` : ''}</dd></div>
        </dl>
        <div className="plan-summary__total"><span>Totale</span><strong className="display-num">{formatEuro(quote.total)}</strong></div>
        {error && <Alert severity="error" role="alert">{error}</Alert>}
        <Button variant="contained" size="large" fullWidth disabled={!canBuy || busy || !ready} onClick={() => void pay()}
          startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <LockRoundedIcon />}>
          {busy ? 'Apertura pagamento…' : `Paga ${formatEuro(quote.total)}`}
        </Button>
        <p className="plan-summary__note">{canBuy
          ? 'Pagamento unico e sicuro su Stripe, nessun rinnovo automatico. Il piano si attiva appena Stripe conferma il pagamento. Hai un codice sconto? Lo inserisci nella pagina di pagamento.'
          : 'Solo il proprietario o un amministratore del torneo può acquistare.'}</p>
      </aside>
    </div>

    <h2 className="workspace__subhead">Pagamenti</h2>
    {payments === null ? <div className="center-min"><CircularProgress aria-label="Caricamento pagamenti" /></div>
      : payments.length === 0 ? <p className="muted">Nessun pagamento ancora.</p>
      : <ul className="plan-payments glass">{payments.map(p => <li key={p.id}>
          <span><b>{formatEuro((p.amount_paid_cents ?? p.amount_cents) / 100)}</b><small>{p.months} {p.months === 1 ? 'mese' : 'mesi'}{p.features.length ? ' · ' + p.features.length + (p.features.length === 1 ? ' modulo' : ' moduli') : ''}</small></span>
          <span className="muted">{date(p.paid_at ?? p.created_at)}{p.status === 'paid' && p.period_end ? ` · fino al ${date(p.period_end)}` : ''}</span>
          <span className={'pill pill--' + p.status}>{PAYMENT_STATUS[p.status]}</span>
        </li>)}</ul>}
  </div>;
}
