import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Checkbox, Chip, Container, Divider, FormControlLabel, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { BASE_MONTHLY, CORE, estimate, EXTRA, formatEuro, MODULES, TERMS } from '../lib/catalog';
import type { FeatureCode } from '../lib/types';

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
    <div className="config-heading"><Chip label="CONFIGURA ITALFUT" variant="outlined" /><Typography variant="h1">La tua piattaforma.<br />Il tuo preventivo.</Typography><p>Inizia con l'essenziale, aggiungi quello che rende unico il tuo torneo. Nessun modulo imposto.</p></div>
    <div className="config-grid"><div>
      <div className="config-block"><div className="config-block-head"><span>01</span><div><Typography variant="h5">Per quanto tempo?</Typography><p>Seleziona la durata iniziale della tua piattaforma.</p></div></div>
        <div className="term-grid">{TERMS.map(term => <button className={'term-option ' + (term.months === months ? 'selected' : '')} onClick={() => setMonths(term.months)} key={term.months}>
          <b>{term.label}</b>{term.discount ? <span>-{Math.round(term.discount * 100)}%</span> : <small>Flessibile</small>}
        </button>)}</div>
      </div>
      <div className="config-block"><div className="config-block-head"><span>02</span><div><Typography variant="h5">La dotazione di base</Typography><p>Tutto ciò che serve per partire, sempre incluso.</p></div></div>
        <div className="core-grid">{MODULES.filter(m => CORE.includes(m.code)).map(m => <div key={m.code}><CheckRoundedIcon fontSize="small" />{m.name}</div>)}</div>
        <p className="hint-text">A partire da {formatEuro(BASE_MONTHLY)} al mese, prima degli sconti per durata.</p>
      </div>
      <div className="config-block"><div className="config-block-head"><span>03</span><div><Typography variant="h5">Personalizza con i moduli</Typography><p>Seleziona soltanto ciò che desideri utilizzare.</p></div></div>
        <div className="extra-grid">{EXTRA.map(module => <label key={module.code} className={'extra-option ' + (selected.includes(module.code) ? 'selected' : '')}>
          <FormControlLabel control={<Checkbox checked={selected.includes(module.code)} onChange={() => toggle(module.code)} icon={<AddRoundedIcon />} checkedIcon={<CheckRoundedIcon />} />} label={<><b>{module.name}</b><small>{module.description}</small></>} />
          <span>{formatEuro(module.monthly)}<small>/mese</small></span>
        </label>)}</div>
      </div>
    </div>
    <aside className="quote-panel"><span className="quote-tag">IL TUO PREVENTIVO</span><Typography variant="h4">Tutto chiaro.<br />Fin dall'inizio.</Typography>
      <div className="quote-row"><span>Piattaforma base</span><strong>{formatEuro(BASE_MONTHLY)}/mese</strong></div>
      {chosen.map(module => <div className="quote-row" key={module.code}><span>{module.name}</span><strong>+ {formatEuro(module.monthly)}/mese</strong></div>)}
      <Divider sx={{ my: 2 }} />
      <div className="quote-row"><span>Durata</span><strong>{months} {months === 1 ? 'mese' : 'mesi'}</strong></div>
      {quote.discount > 0 && <div className="quote-row quote-discount"><span>Sconto durata</span><strong>-{Math.round(quote.discount * 100)}%</strong></div>}
      <Divider sx={{ my: 2 }} />
      <div className="quote-total-label">TOTALE INDICATIVO</div>
      <div className="quote-total">{formatEuro(quote.total)}<span> / {months} {months === 1 ? 'mese' : 'mesi'}</span></div>
      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#a5b5ae' }}>Prezzi dimostrativi, non costituiscono offerta commerciale. Il prezzo definitivo è verificato sul server. Stripe non ancora attivo.</Typography>
      <Button color="secondary" variant="contained" size="large" fullWidth sx={{ mt: 3 }} onClick={proceed} endIcon={<ArrowForwardRoundedIcon />}>Continua con la creazione</Button>
      <Stack alignItems="center" mt={2}><Typography variant="caption" sx={{ color: '#a5b5ae' }}>Nessun addebito in questa fase</Typography></Stack>
    </aside></div>
    <Box sx={{ pb: 9 }} />
  </Container></div>;
}
