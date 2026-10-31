import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, CircularProgress, Container, Link, Stack, TextField, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LockOutlineRoundedIcon from '@mui/icons-material/LockOutlineRounded';
import { useAuth } from '../auth/AuthProvider';
import { configured, friendlyError } from '../lib/supabase';

export function Access({ register = false }: { register?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, signIn, signUp } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const from = (location.state as { from?: string } | null)?.from ?? '/console';
  useEffect(() => { if (session) navigate(from, { replace: true }); }, [session, navigate, from]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      if (register) {
        const confirm = await signUp(identifier, username, password);
        if (confirm) setMessage('Account creato. Controlla la tua email, conferma la registrazione e poi accedi.');
        else navigate('/console');
      } else {
        await signIn(identifier, password);
        navigate(from, { replace: true });
      }
    } catch (cause) { setError(friendlyError(cause)); }
    finally { setBusy(false); }
  };
  return <div className="access-page"><Container maxWidth="sm"><div className="access-card">
    <span className="access-lock"><LockOutlineRoundedIcon /></span>
    <Typography variant="h4">{register ? 'Metti in campo il tuo torneo.' : 'Bentornato in campo.'}</Typography>
    <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>{register ? 'Crea il tuo profilo organizzatore e prepara la prima piattaforma.' : 'Accedi alla tua console per gestire i tuoi tornei.'}</Typography>
    {!configured && <Alert severity="warning" sx={{ mb: 2 }}>Supabase non è ancora configurato. Inserisci le variabili pubbliche nel file .env.</Alert>}
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
    <form onSubmit={submit}><Stack spacing={2.5}>
      <TextField label={register ? 'Email' : 'Username o email'} autoComplete={register ? 'email' : 'username'} value={identifier} onChange={event => setIdentifier(event.target.value)} required />
      {register && <TextField label="Username" autoComplete="username" helperText="3–30 caratteri: lettere, numeri e trattino basso." value={username} onChange={event => setUsername(event.target.value)} inputProps={{ pattern: '[a-zA-Z0-9_]{3,30}' }} required />}
      <TextField label="Password" type="password" autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} inputProps={{ minLength: 8 }} required />
      <Button variant="contained" size="large" type="submit" disabled={busy || !configured} endIcon={busy ? <CircularProgress size={17} color="inherit" /> : <ArrowForwardRoundedIcon />}>{register ? 'Crea account' : 'Accedi alla console'}</Button>
    </Stack></form>
    <div className="access-switch">{register ? 'Hai già un account?' : 'Non hai un account?'}{' '}<Link href={register ? '/accesso' : '/registrati'} underline="hover" fontWeight={800}>{register ? 'Accedi' : 'Registrati'}</Link></div>
    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 3 }}>Autenticazione protetta da Supabase Auth. Ogni piattaforma conserva permessi e dati separati.</Typography>
  </div></Container></div>;
}
