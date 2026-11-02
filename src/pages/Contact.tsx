import { useState, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, MenuItem, TextField } from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { useAuth } from '../auth/AuthProvider';
import { client, configured, friendlyError, notConfiguredMessage } from '../lib/supabase';
import { cleanText } from '../lib/validation';
import { Reveal } from '../components/MarketingMotion';

const KINDS = [
  { value: 'support', label: 'Assistenza sulla piattaforma' },
  { value: 'privacy', label: 'Privacy: accesso, rettifica, cancellazione dei dati' },
  { value: 'minor', label: 'Dati o foto di un minore (genitori e tutori)' },
  { value: 'billing', label: 'Pagamenti e rimborsi' },
  { value: 'other', label: 'Altro' },
];

/** Contact form stored in Supabase (no email service): the operator answers from the Dashboard. */
export function Contact() {
  const { session } = useAuth();
  const [kind, setKind] = useState('support');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const text = cleanText(message, 4000);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (text.length < 10) { setError('Scrivi almeno 10 caratteri.'); return; }
    setBusy(true);
    try {
      const { error: issue } = await client().rpc('submit_request', { p_kind: kind, p_message: text, p_contact: session ? null : cleanText(contact, 200) || null });
      if (issue) throw issue;
      setDone(true); setMessage(''); setContact('');
    } catch (cause) { setError(friendlyError(cause)); }
    finally { setBusy(false); }
  };

  return <div className="page contact">
    <div className="page-glow" aria-hidden="true" />
    <div className="container">
      <Reveal className="page-head">
        <h1 className="page-title">Contatti <span className="serif-accent">e richieste.</span></h1>
        <p className="lead">Assistenza, richieste privacy o segnalazioni sui dati di un minore. Le richieste arrivano direttamente all’operatore di ItalFUT.</p>
      </Reveal>
      <div className="contact__grid">
        <form className="panel glass stack-form" onSubmit={submit}>
          {done && <Alert severity="success" role="status">Richiesta inviata. {session ? <>Trovi stato e risposta nella pagina <RouterLink to="/account">Account e dati</RouterLink>.</> : 'Se hai lasciato un recapito, verrai ricontattato lì.'}</Alert>}
          {!configured && <Alert severity="warning">{notConfiguredMessage}</Alert>}
          {error && <Alert severity="error" role="alert">{error}</Alert>}
          <TextField select label="Argomento" value={kind} onChange={event => setKind(event.target.value)}>
            {KINDS.map(item => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
          </TextField>
          <TextField label="Messaggio" value={message} onChange={event => setMessage(event.target.value)} multiline minRows={5} required
            helperText={`${text.length}/4000 · Non inserire password, documenti o dati sanitari.`} slotProps={{ htmlInput: { maxLength: 4000 } }} />
          {!session && <TextField label="Come ricontattarti (facoltativo)" value={contact} onChange={event => setContact(event.target.value)}
            helperText="Un recapito a tua scelta, usato solo per rispondere a questa richiesta." slotProps={{ htmlInput: { maxLength: 200 } }} />}
          <Button type="submit" variant="contained" disabled={busy || !configured} endIcon={<SendRoundedIcon />} sx={{ justifySelf: 'start' }}>{busy ? 'Invio…' : 'Invia richiesta'}</Button>
        </form>
        <aside className="contact__aside">
          <p>{session ? 'Hai effettuato l’accesso: la richiesta è collegata al tuo account e la risposta comparirà nella pagina Account e dati.' : 'Se hai un account, accedi prima di scrivere: la risposta comparirà nella tua area personale.'}</p>
          <p>Per le richieste privacy rispondiamo entro un mese, come previsto dal GDPR.</p>
          <p>Hai perso password e codice di recupero? Indica il tuo username e le informazioni che possono dimostrare che l’account è tuo (es. nomi dei tornei creati).</p>
        </aside>
      </div>
    </div>
  </div>;
}
