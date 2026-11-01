import { useEffect, useState, type FormEvent } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Checkbox, CircularProgress, Container, FormControlLabel, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import { useAuth } from '../auth/AuthProvider';
import { configured, friendlyError } from '../lib/supabase';
import { CinematicShader } from '../components/CinematicShader';

export function Access({ register = false }: { register?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, signIn, signUp } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [confirmAdult, setConfirmAdult] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const from = (location.state as { from?: string } | null)?.from ?? '/console';
  useEffect(() => { if (session) navigate(from, { replace: true }); }, [session, navigate, from]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    if (register && (!acceptTerms || !confirmAdult)) {
      setError('Per creare un account devi accettare i termini e confermare di essere maggiorenne.');
      return;
    }
    setBusy(true);
    try {
      if (register) {
        const confirm = await signUp(identifier, username, password);
        if (confirm) setMessage('Account creato. Conferma la registrazione dal link ricevuto via email, poi accedi.');
        else navigate('/console');
      } else {
        await signIn(identifier, password);
        navigate(from, { replace: true });
      }
    } catch (cause) { setError(friendlyError(cause)); }
    finally { setBusy(false); }
  };
  return <div className="access-page access-cinematic"><Container maxWidth="lg" className="access-shell">
    <aside className="access-showcase" aria-label="La piattaforma ItalFUT">
      <CinematicShader variant="auth" className="access-showcase-shader" />
      <div className="access-showcase-lines" aria-hidden="true" />
      <div className="access-showcase-message">
        <Typography component="p" variant="h2">Il calcio si vive.<br /><span>Il torneo si guida.</span></Typography>
        <p>Un unico spazio per organizzare squadre, incontri e classifiche. Ovunque tu sia.</p>
      </div>
    </aside>
    <div className="access-card liquid-glass">
    <Typography component="h1" variant="h3">{register ? 'Crea un account' : 'Accedi a ItalFUT'}</Typography>
    <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>{register ? 'Organizza il tuo primo torneo.' : 'Ritrova i tuoi tornei e continua a gestirli.'}</Typography>
    {!configured && <Alert severity="warning" sx={{ mb: 2 }}>Il collegamento a Supabase non è configurato per questa installazione.</Alert>}
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
    <form onSubmit={submit}><Stack spacing={2.5}>
      <TextField label={register ? 'Email' : 'Username o email'} autoComplete={register ? 'email' : 'username'} value={identifier} onChange={event => setIdentifier(event.target.value)} required />
      {register && <TextField label="Username" autoComplete="username" helperText="Da 3 a 30 caratteri: lettere, numeri e trattino basso." value={username} onChange={event => setUsername(event.target.value)} inputProps={{ pattern: '[a-zA-Z0-9_]{3,30}' }} required />}
      <TextField label="Password" type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} inputProps={{ minLength: 8 }} required
        InputProps={{ endAdornment: <InputAdornment position="end">
          <IconButton type="button" aria-label={showPassword ? 'Nascondi password' : 'Mostra password'} aria-pressed={showPassword}
            onClick={() => setShowPassword(x => !x)} edge="end">
            {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
          </IconButton>
        </InputAdornment> }} />
      {register && <div className="registration-consents">
        <FormControlLabel control={<Checkbox checked={acceptTerms} onChange={(_, checked) => setAcceptTerms(checked)} required />}
          label={<span>Ho letto i <RouterLink to="/terms-of-service" target="_blank" rel="noopener noreferrer">termini di servizio</RouterLink> e accetto le condizioni applicabili. Ho consultato l’<RouterLink to="/privacy-policy" target="_blank" rel="noopener noreferrer">informativa privacy</RouterLink>.</span>} />
        <FormControlLabel control={<Checkbox checked={confirmAdult} onChange={(_, checked) => setConfirmAdult(checked)} required />}
          label="Dichiaro di avere almeno 18 anni e di poter gestire un account organizzatore." />
        <Typography variant="caption" color="text.secondary">Non chiediamo la tua data di nascita. I minori non possono creare un account organizzatore: per i dati di atleti minori è prevista una verifica separata a cura dell’organizzatore.</Typography>
      </div>}
      <Button variant="contained" size="large" type="submit" disabled={busy || !configured || (register && (!acceptTerms || !confirmAdult))} endIcon={busy ? <CircularProgress size={17} color="inherit" /> : <ArrowForwardRoundedIcon />}>{register ? 'Crea account' : 'Accedi'}</Button>
    </Stack></form>
    <p className="access-switch">{register ? 'Hai già un account?' : 'Non hai un account?'}{' '}<RouterLink to={register ? '/accesso' : '/registrati'}>{register ? 'Accedi' : 'Registrati'}</RouterLink></p>
    </div></Container></div>;
}
