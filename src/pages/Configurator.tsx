import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Checkbox, TextField } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import { motion, useReducedMotion } from 'motion/react';
import { BASE_MONTHLY, CORE, estimate, EXTRA, formatEuro, MODULES, TERMS } from '../lib/catalog';
import type { FeatureCode } from '../lib/types';
import { AnimatedAmount } from '../components/AnimatedAmount';
import { vatNote } from '../config/legal';
import { paymentsEnabled } from '../lib/payments';
import { Reveal } from '../components/MarketingMotion';
import { DurationStepper } from '../components/DurationStepper';
import { addDays, EDIT_WINDOW_HOURS, eventTotal, formatDay, readDraft, romeToday, validEventDate, writeDraft, type PlanKind } from '../lib/plan';

export function Configurator() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [params] = useSearchParams();
  // The configuration survives going back and forth between configurator and console (same tab).
  const [draft] = useState(readDraft);
  const fromUrl = params.get('formato');
  const [kind, setKind] = useState<PlanKind>(fromUrl === 'stagione' ? 'season' : fromUrl === 'giornata' ? 'event' : draft?.kind ?? 'event');
  const [months, setMonths] = useState(draft?.months ?? 1);
  const [eventDate, setEventDate] = useState(draft?.eventDate ?? '');
  const [selected, setSelected] = useState<FeatureCode[]>(draft?.modules ?? []);
  const [dateError, setDateError] = useState('');
  // Saved while choosing (after the first change), not only on “Continua”.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    writeDraft({ kind, months, modules: selected, eventDate });
  }, [kind, months, selected, eventDate]);
  const event = kind === 'event';
  const quote = estimate(months, selected);
  const oneOff = eventTotal(selected);
  const chosen = MODULES.filter(m => selected.includes(m.code) && !m.core);
  const toggle = (code: FeatureCode) => setSelected(old => old.includes(code) ? old.filter(x => x !== code) : [...old, code]);
  const gross = quote.monthly * months;
  const proceed = () => {
    if (event && !validEventDate(eventDate)) {
      setDateError('Scegli la data del torneo (da oggi a due anni da oggi).');
      document.getElementById('event-date')?.focus();
      return;
    }
    writeDraft({ kind, months, modules: selected, eventDate });
    navigate('/console');
  };
  const pill = (on: boolean, id: string) => on && <motion.span layoutId={id} className="term__pill" transition={reduce ? { duration: 0 } : { type: 'spring', bounce: .2, duration: .5 }} />;

  return <div className="page config">
    <div className="page-glow" aria-hidden="true" />
    <div className="container">
      <Reveal className="page-head">
        <h1 className="page-title">Costruisci <span className="serif-accent">il tuo torneo.</span></h1>
        <p className="lead">Scegli il formato e i moduli: il riepilogo mostra ogni voce. Nessun costo nascosto, nessun modulo preselezionato.</p>
      </Reveal>
      <div className="config__grid">
        <div className="config__steps">
          <section className="panel glass" aria-labelledby="format-title">
            <header className="panel__head"><span className="panel__step display-num">1</span><div><h2 id="format-title">Formato</h2><p>Un torneo che si gioca in una giornata o una competizione più lunga?</p></div></header>
            <div className="format-grid" role="radiogroup" aria-labelledby="format-title">
              <button type="button" role="radio" aria-checked={event} className={'term format' + (event ? ' is-selected' : '')} onClick={() => setKind('event')}>
                {pill(event, 'format-pill')}
                <span className="format__icon" aria-hidden="true"><BoltRoundedIcon /></span>
                <b>Torneo di un giorno</b>
                <span>12 ore, quadrangolari, eventi: inizia e finisce in giornata.</span>
                <small>Gratis</small>
              </button>
              <button type="button" role="radio" aria-checked={!event} className={'term format' + (!event ? ' is-selected' : '')} onClick={() => setKind('season')}>
                {pill(!event, 'format-pill')}
                <span className="format__icon" aria-hidden="true"><EmojiEventsRoundedIcon /></span>
                <b>Campionato o torneo lungo</b>
                <span>Giornate, gironi e stagioni su più settimane o mesi.</span>
                <small>Da {formatEuro(BASE_MONTHLY)}/mese</small>
              </button>
            </div>
          </section>

          {event ? <section className="panel glass" aria-labelledby="date-title">
            <header className="panel__head"><span className="panel__step display-num">2</span><div><h2 id="date-title">Data del torneo</h2><p>Puoi preparare tutto quando vuoi: le partite si giocano in questa data.</p></div></header>
            <TextField id="event-date" type="date" label="Giorno del torneo" value={eventDate} required
              onChange={e => { setEventDate(e.target.value); setDateError(''); }}
              error={Boolean(dateError)} helperText={dateError || (eventDate ? formatDay(eventDate) : 'Potrai cambiarla finché il torneo non è pubblicato.')}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: romeToday(), max: addDays(romeToday(), 730) } }} sx={{ maxWidth: 320 }} />
            <ul className="event-rules">
              <li><CheckRoundedIcon />Lo pubblichi tu, dal giorno del torneo.</li>
              <li><CheckRoundedIcon />Da quel momento hai {EDIT_WINDOW_HOURS} ore per aggiornare risultati e dati.</li>
              <li><CheckRoundedIcon />Poi il sito resta online, consultabile da tutti.</li>
            </ul>
          </section>
          : <section className="panel glass" aria-labelledby="duration-title">
            <header className="panel__head"><span className="panel__step display-num">2</span><div><h2 id="duration-title">Durata</h2><p>Per quanto tempo ti serve la piattaforma?</p></div></header>
            <div className="term-grid" role="radiogroup" aria-labelledby="duration-title">
              {TERMS.map(term => <button type="button" role="radio" aria-checked={term.months === months} key={term.months}
                className={'term' + (term.months === months ? ' is-selected' : '')} onClick={() => setMonths(term.months)}>
                {pill(term.months === months, 'term-pill')}
                <b className="display-num">{term.months}</b>
                <span>{term.months === 1 ? 'mese' : 'mesi'}</span>
                <small>{term.discount ? '−' + Math.round(term.discount * 100) + '%' : 'Tariffa base'}</small>
              </button>)}
            </div>
            <DurationStepper months={months} onChange={setMonths} />
          </section>}

          <section className="panel glass" aria-labelledby="core-title">
            <header className="panel__head"><span className="panel__step display-num">3</span><div><h2 id="core-title">Sempre incluso</h2>
              <p>{event ? `Le ${CORE.length} funzioni essenziali, gratis.` : `Le ${CORE.length} funzioni essenziali, a ${formatEuro(BASE_MONTHLY)} al mese.`}</p></div></header>
            <ul className="core-list">{MODULES.filter(m => CORE.includes(m.code)).map(m => <li key={m.code}><CheckRoundedIcon />{m.name}</li>)}</ul>
          </section>
          <section className="panel glass" aria-labelledby="extras-title">
            <header className="panel__head"><span className="panel__step display-num">4</span><div><h2 id="extras-title">Moduli aggiuntivi</h2>
              <p>{event ? 'Facoltativi. Si pagano una volta sola e restano attivi sul sito del torneo.' : 'Facoltativi. Attiva solo quelli che userai.'}</p></div></header>
            <div className="extra-list">{EXTRA.map(module => {
              const on = selected.includes(module.code);
              return <label key={module.code} className={'extra' + (on ? ' is-on' : '')}>
                <Checkbox checked={on} onChange={() => toggle(module.code)} slotProps={{ input: { 'aria-describedby': 'extra-' + module.code } }} />
                <span className="extra__text"><b>{module.name}</b><small id={'extra-' + module.code}>{module.description}</small></span>
                <span className="extra__price"><b>{formatEuro(module.monthly)}</b>{event ? ' una tantum' : '/mese'}</span>
              </label>;
            })}</div>
          </section>
        </div>
        <aside className="quote glass" aria-label="Riepilogo preventivo">
          <h2>Riepilogo</h2>
          {event ? <dl className="quote__rows">
            <div><dt>Torneo di un giorno</dt><dd>Gratis</dd></div>
            <div><dt>Data</dt><dd>{eventDate ? formatDay(eventDate, false) : 'da scegliere'}</dd></div>
            {chosen.map(module => <div key={module.code}><dt>{module.name}</dt><dd>+ {formatEuro(module.monthly)}</dd></div>)}
          </dl> : <dl className="quote__rows">
            <div><dt>Piattaforma base</dt><dd>{formatEuro(BASE_MONTHLY)}/mese</dd></div>
            {chosen.map(module => <div key={module.code}><dt>{module.name}</dt><dd>+ {formatEuro(module.monthly)}/mese</dd></div>)}
            <div className="quote__sep"><dt>Totale mensile</dt><dd>{formatEuro(quote.monthly)}</dd></div>
            <div><dt>Durata</dt><dd>× {months} {months === 1 ? 'mese' : 'mesi'} = {formatEuro(gross)}</dd></div>
            {quote.discount > 0 && <div className="quote__discount"><dt>Sconto durata ({Math.round(quote.discount * 100)}%)</dt><dd>− {formatEuro(Math.round((gross - quote.total) * 100) / 100)}</dd></div>}
          </dl>}
          <div className="quote__total">
            <span>{event ? 'Totale' : 'Totale stimato'}</span>
            <strong className="display-num">{event && oneOff === 0 ? 'Gratis' : <AnimatedAmount amount={event ? oneOff : quote.total} />}</strong>
            <small>{event ? (oneOff ? 'una tantum, solo per i moduli extra' : 'funzioni base incluse, senza abbonamento') : `per ${months} ${months === 1 ? 'mese' : 'mesi'}`}{vatNote && (!event || oneOff) ? ' · ' + vatNote : ''}</small>
          </div>
          <Button variant="contained" size="large" fullWidth onClick={proceed} endIcon={<ArrowForwardRoundedIcon />}>{event ? 'Crea il torneo gratis' : 'Continua'}</Button>
          <p className="quote__note">{event
            ? `Crei il torneo subito e lo prepari quando vuoi. Lo pubblichi il giorno della gara: da lì hai ${EDIT_WINDOW_HOURS} ore per aggiornarlo, poi il sito resta online.${oneOff ? (paymentsEnabled ? ' I moduli extra si pagano su Stripe dalla console.' : ' I moduli extra si richiedono dalla console.') : ''}`
            : paymentsEnabled ? 'Proseguendo crei il torneo in bozza; poi paghi il piano in modo sicuro su Stripe e il sito si pubblica. Pagamento unico, nessun rinnovo automatico.' : 'Preventivo indicativo. Oggi non è attivo alcun pagamento: proseguendo crei uno spazio in bozza e nessun importo viene addebitato. Rinnovo automatico non previsto.'}</p>
        </aside>
      </div>
    </div>
  </div>;
}
