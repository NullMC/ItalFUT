import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { motion, useReducedMotion } from 'motion/react';
import { BASE_MONTHLY, CORE, estimate, EXTRA, formatEuro, MODULES, TERMS } from '../lib/catalog';
import type { FeatureCode } from '../lib/types';
import { AnimatedAmount } from '../components/AnimatedAmount';
import { vatNote } from '../config/legal';
import { paymentsEnabled } from '../lib/payments';
import { Reveal } from '../components/MarketingMotion';

export function Configurator() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [months, setMonths] = useState(1);
  const [selected, setSelected] = useState<FeatureCode[]>([]);
  const quote = estimate(months, selected);
  const chosen = MODULES.filter(m => selected.includes(m.code) && !m.core);
  const toggle = (code: FeatureCode) => setSelected(old => old.includes(code) ? old.filter(x => x !== code) : [...old, code]);
  const gross = quote.monthly * months;
  const proceed = () => {
    try { sessionStorage.setItem('italfut_configuration', JSON.stringify({ months, modules: selected })); } catch { /* storage unavailable */ }
    navigate('/console');
  };
  return <div className="page config">
    <div className="page-glow" aria-hidden="true" />
    <div className="container">
      <Reveal className="page-head">
        <h1 className="page-title">Costruisci <span className="serif-accent">il tuo torneo.</span></h1>
        <p className="lead">Scegli durata e moduli: il riepilogo mostra ogni voce e ogni sconto. Nessun costo nascosto, nessun modulo preselezionato.</p>
      </Reveal>
      <div className="config__grid">
        <div className="config__steps">
          <section className="panel glass" aria-labelledby="duration-title">
            <header className="panel__head"><span className="panel__step display-num">1</span><div><h2 id="duration-title">Durata</h2><p>Per quanto tempo ti serve la piattaforma?</p></div></header>
            <div className="term-grid" role="radiogroup" aria-labelledby="duration-title">
              {TERMS.map(term => <button type="button" role="radio" aria-checked={term.months === months} key={term.months}
                className={'term' + (term.months === months ? ' is-selected' : '')} onClick={() => setMonths(term.months)}>
                {term.months === months && <motion.span layoutId="term-pill" className="term__pill" transition={reduce ? { duration: 0 } : { type: 'spring', bounce: .2, duration: .5 }} />}
                <b className="display-num">{term.months}</b>
                <span>{term.months === 1 ? 'mese' : 'mesi'}</span>
                <small>{term.discount ? '−' + Math.round(term.discount * 100) + '%' : 'Tariffa base'}</small>
              </button>)}
            </div>
          </section>
          <section className="panel glass" aria-labelledby="core-title">
            <header className="panel__head"><span className="panel__step display-num">2</span><div><h2 id="core-title">Sempre incluso</h2><p>Le {CORE.length} funzioni essenziali, a {formatEuro(BASE_MONTHLY)} al mese.</p></div></header>
            <ul className="core-list">{MODULES.filter(m => CORE.includes(m.code)).map(m => <li key={m.code}><CheckRoundedIcon />{m.name}</li>)}</ul>
          </section>
          <section className="panel glass" aria-labelledby="extras-title">
            <header className="panel__head"><span className="panel__step display-num">3</span><div><h2 id="extras-title">Moduli aggiuntivi</h2><p>Facoltativi. Attiva solo quelli che userai.</p></div></header>
            <div className="extra-list">{EXTRA.map(module => {
              const on = selected.includes(module.code);
              return <label key={module.code} className={'extra' + (on ? ' is-on' : '')}>
                <Checkbox checked={on} onChange={() => toggle(module.code)} slotProps={{ input: { 'aria-describedby': 'extra-' + module.code } }} />
                <span className="extra__text"><b>{module.name}</b><small id={'extra-' + module.code}>{module.description}</small></span>
                <span className="extra__price"><b>{formatEuro(module.monthly)}</b>/mese</span>
              </label>;
            })}</div>
          </section>
        </div>
        <aside className="quote glass" aria-label="Riepilogo preventivo">
          <h2>Riepilogo</h2>
          <dl className="quote__rows">
            <div><dt>Piattaforma base</dt><dd>{formatEuro(BASE_MONTHLY)}/mese</dd></div>
            {chosen.map(module => <div key={module.code}><dt>{module.name}</dt><dd>+ {formatEuro(module.monthly)}/mese</dd></div>)}
            <div className="quote__sep"><dt>Totale mensile</dt><dd>{formatEuro(quote.monthly)}</dd></div>
            <div><dt>Durata</dt><dd>× {months} {months === 1 ? 'mese' : 'mesi'} = {formatEuro(gross)}</dd></div>
            {quote.discount > 0 && <div className="quote__discount"><dt>Sconto durata ({Math.round(quote.discount * 100)}%)</dt><dd>− {formatEuro(Math.round((gross - quote.total) * 100) / 100)}</dd></div>}
          </dl>
          <div className="quote__total">
            <span>Totale stimato</span>
            <strong className="display-num"><AnimatedAmount amount={quote.total} /></strong>
            <small>per {months} {months === 1 ? 'mese' : 'mesi'}{vatNote ? ' · ' + vatNote : ''}</small>
          </div>
          <Button variant="contained" size="large" fullWidth onClick={proceed} endIcon={<ArrowForwardRoundedIcon />}>Continua</Button>
          <p className="quote__note">{paymentsEnabled ? 'Proseguendo crei il torneo in bozza; poi paghi il piano in modo sicuro su Stripe e il sito si pubblica. Pagamento unico, nessun rinnovo automatico.' : 'Preventivo indicativo. Oggi non è attivo alcun pagamento: proseguendo crei uno spazio in bozza e nessun importo viene addebitato. Rinnovo automatico non previsto.'}</p>
        </aside>
      </div>
    </div>
  </div>;
}
