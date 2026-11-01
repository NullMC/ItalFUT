import { useEffect, useState, type FormEvent } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, CircularProgress, Container, Stack, TextField, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
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
        if (confirm) setMessage('Account creato. Conferma la registrazione dal link ricevuto via email, poi accedi.');
        else navigate('/console');
      } else {
        await signIn(identifier, password);
        navigate(from, { replace: true });
      }
    } catch (cause) { setError(friendlyError(cause)); }
    finally { setBusy(false); }
  };
  return <div className="access-page"><Container maxWidth="sm"><div className="access-card liquid-glass">
    <Typography variant="h3">{register ? 'Crea un account' : 'Accedi a ItalFUT'}</Typography>
    <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>{register ? 'Organizza il tuo primo torneo.' : 'Ritrova i tuoi tornei e continua a gestirli.'}</Typography>
    {!configured && <Alert severity="warning" sx={{ mb: 2 }}>Il collegamento a Supabase non è configurato per questa installazione.</Alert>}
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
    <form onSubmit={submit}><Stack spacing={2.5}>
      <TextField label={register ? 'Email' : 'Username o email'} autoComplete={register ? 'email' : 'username'} value={identifier} onChange={event => setIdentifier(event.target.value)} required />
      {register && <TextField label="Username" autoComplete="username" helperText="Da 3 a 30 caratteri: lettere, numeri e trattino basso." value={username} onChange={event => setUsername(event.target.value)} inputProps={{ pattern: '[a-zA-Z0-9_]{3,30}' }} required />}
      <TextField label="Password" type="password" autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} inputProps={{ minLength: 8 }} required />
      <Button variant="contained" size="large" type="submit" disabled={busy || !configured} endIcon={busy ? <CircularProgress size={17} color="inherit" /> : <ArrowForwardRoundedIcon />}>{register ? 'Crea account' : 'Accedi'}</Button>
    </Stack></form>
    <p className="access-switch">{register ? 'Hai già un account?' : 'Non hai un account?'}{' '}<RouterLink to={register ? '/accesso' : '/registrati'}>{register ? 'Accedi' : 'Registrati'}</RouterLink></p>
  </div></Container></div>;
}
