import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Checkbox, Container, Divider, FormControlLabel, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { BASE_MONTHLY, CORE, estimate, EXTRA, formatEuro, MODULES, TERMS } from '../lib/catalog';
import type { FeatureCode } from '../lib/types';
import { AnimatedAmount } from '../components/AnimatedAmount';

export function Configurator() {
  const navigate = useNavigate();
  const [months, setMonths] = useState(3);
  const [selected, setSelected] = useState<FeatureCode[]>(['statistics', 'sponsors']);
  const quote = estimate(months, selected);
  const chosen = MODULES.filter(m => selected.includes(m.code) && !m.core);
  const toggle = (code: FeatureCode) => setSelected(old => old.includes(code) ? old.filter(x => x !== code) : [...old, code]);
  const proceed = () => {
    sessionStorage.setItem('italfut_configuration', JSON.stringify({ months, modules: selected }));
    navigate('/console');
  };
  return <div className="config-page"><Container maxWidth="lg">
    <div className="config-heading"><Typography variant="h1">Costruisci il tuo torneo.</Typography><p>Imposta la durata, scegli le funzionalità e consulta il preventivo. Nessuna funzione superflua.</p></div>
    <div className="config-grid"><div>
      <section className="config-block" aria-labelledby="duration-title"><div className="config-block-head"><div><Typography id="duration-title" variant="h5">Durata</Typography><p>Per quanto tempo vuoi utilizzare la piattaforma?</p></div></div>
        <div className="term-grid" role="group" aria-label="Durata della piattaforma">{TERMS.map(term => <button type="button" aria-pressed={term.months === months} className={'term-option ' + (term.months === months ? 'selected' : '')} onClick={() => setMonths(term.months)} key={term.months}>
          <b>{term.label}</b>{term.discount ? <span>Risparmi {Math.round(term.discount * 100)}%</span> : <small>Tariffa base</small>}
        </button>)}</div>
      </section>
      <section className="config-block" aria-labelledby="core-title"><div className="config-block-head"><div><Typography id="core-title" variant="h5">Sempre inclusi</Typography><p>Le funzioni essenziali per organizzare un torneo.</p></div></div>
        <div className="core-grid">{MODULES.filter(m => CORE.includes(m.code)).map(m => <div key={m.code}><CheckRoundedIcon fontSize="small" />{m.name}</div>)}</div>
        <p className="hint-text">Base da {formatEuro(BASE_MONTHLY)}/mese, prima degli sconti sulla durata.</p>
      </section>
      <section className="config-block" aria-labelledby="extras-title"><div className="config-block-head"><div><Typography id="extras-title" variant="h5">Moduli aggiuntivi</Typography><p>Attiva quelli utili alla tua competizione.</p></div></div>
        <div className="extra-grid">{EXTRA.map(module => <div key={module.code} className={'extra-option ' + (selected.includes(module.code) ? 'selected' : '')}>
          <FormControlLabel control={<Checkbox checked={selected.includes(module.code)} onChange={() => toggle(module.code)} />} label={<><b>{module.name}</b><small>{module.description}</small></>} />
          <span>{formatEuro(module.monthly)}<small>/mese</small></span>
        </div>)}</div>
      </section>
    </div>
    <aside className="quote-panel" aria-label="Riepilogo preventivo"><Typography variant="h4">Riepilogo</Typography>
      <div className="quote-row"><span>Piattaforma base</span><strong>{formatEuro(BASE_MONTHLY)}/mese</strong></div>
      {chosen.map(module => <div className="quote-row" key={module.code}><span>{module.name}</span><strong>+ {formatEuro(module.monthly)}/mese</strong></div>)}
      <Divider sx={{ my: 2 }} />
      <div className="quote-row"><span>Durata</span><strong>{months} {months === 1 ? 'mese' : 'mesi'}</strong></div>
      {quote.discount > 0 && <div className="quote-row quote-discount"><span>Sconto durata</span><strong>−{Math.round(quote.discount * 100)}%</strong></div>}
      <Divider sx={{ my: 2 }} />
      <div className="quote-total-label">Totale stimato</div>
      <div className="quote-total"><AnimatedAmount amount={quote.total} /><span> / {months} {months === 1 ? 'mese' : 'mesi'}</span></div>
      <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#c8d9cf', lineHeight: 1.6 }}>Prezzi indicativi. Il preventivo è verificato sul server; nessun pagamento è attivo in questa fase.</Typography>
      <Button color="secondary" variant="contained" size="large" fullWidth sx={{ mt: 3 }} onClick={proceed} endIcon={<ArrowForwardRoundedIcon />}>Continua</Button>
    </aside></div>
    <Box sx={{ pb: 9 }} />
  </Container></div>;
}
