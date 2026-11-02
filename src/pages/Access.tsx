import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Checkbox, CircularProgress, FormControlLabel, IconButton, InputAdornment, TextField } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useAuth } from '../auth/AuthProvider';
import { configured, friendlyError } from '../lib/supabase';
import { checkPassword, normalizeUsername, PASSWORD_MAX, RECOVERY_CODE_PATTERN, USERNAME_PATTERN } from '../lib/validation';
import { Backdrop } from '../components/fx/Backdrop';
import { Football3D } from '../components/fx/Football3D';
import { RecoveryCode } from '../components/RecoveryCode';

type Mode = 'login' | 'register' | 'recover';

export function PasswordField({ id, label, value, onChange, autoComplete, helperText, error }: {
  id: string; label: string; value: string; onChange: (value: string) => void; autoComplete: string; helperText?: string; error?: boolean;
}) {
  const [show, setShow] = useState(false);
  return <TextField id={id} label={label} type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value}
    onChange={event => onChange(event.target.value)} required error={error} helperText={helperText}
    slotProps={{ htmlInput: { maxLength: PASSWORD_MAX }, input: { endAdornment: <InputAdornment position="end">
      <IconButton type="button" aria-label={show ? 'Nascondi password' : 'Mostra password'} aria-pressed={show} onClick={() => setShow(x => !x)} edge="end">
        {show ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
      </IconButton></InputAdornment> } }} />;
}

export function StrengthMeter({ password, username = '' }: { password: string; username?: string }) {
  const strength = checkPassword(password, username);
  return <div className="strength" aria-live="polite">
    <div className="strength__bar" data-score={password ? strength.score : 0}><i /><i /><i /><i /></div>
    <span>{password ? (strength.ok ? 'Sicurezza: ' + strength.label : 'Serve: ' + strength.hints.join(', ')) : 'Almeno 10 caratteri, con lettere e numeri.'}</span>
  </div>;
}

export function Access({ register = false }: { register?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, signIn, signUp, usernameAvailable, resetWithCode } = useAuth();
  const [mode, setMode] = useState<Mode>(register ? 'register' : 'login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [confirmAdult, setConfirmAdult] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const failures = useRef(0);
  const [cooldown, setCooldown] = useState(0);
  const from = (location.state as { from?: string } | null)?.from;
  const safeFrom = from && from.startsWith('/') && !from.startsWith('//') ? from : '/console';

  useEffect(() => { setMode(register ? 'register' : 'login'); setError(''); setMessage(''); }, [register]);
  // A fresh sign-up stays on this page until the recovery code has been saved.
  useEffect(() => { if (session && mode === 'login') navigate(safeFrom, { replace: true }); }, [session, mode, navigate, safeFrom]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => {
    if (mode !== 'register') return;
    const value = normalizeUsername(username);
    setAvailable(null);
    if (!USERNAME_PATTERN.test(value) || !configured) return;
    const timer = window.setTimeout(() => { void usernameAvailable(value).then(setAvailable); }, 450);
    return () => window.clearTimeout(timer);
  }, [username, mode, usernameAvailable]);

  const strength = checkPassword(password, username);
  const usernameValid = USERNAME_PATTERN.test(normalizeUsername(username));
  const canRegister = usernameValid && available !== false && strength.ok && password === confirm && acceptTerms && confirmAdult;
  const canRecover = usernameValid && RECOVERY_CODE_PATTERN.test(code.trim().toUpperCase()) && strength.ok && password === confirm;
  const switchTo = (next: Mode) => { setMode(next); setError(''); setMessage(''); setPassword(''); setConfirm(''); };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    if (cooldown) return;
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(username, password);
        failures.current = 0;
        navigate(safeFrom, { replace: true });
      } else if (mode === 'register') {
        if (!canRegister) throw new Error('Controlla i campi evidenziati e i consensi obbligatori.');
        const generated = await signUp({ username, password });
        setPassword(''); setConfirm('');
        setRecoveryCode(generated);
      } else {
        if (!canRecover) throw new Error('Controlla username, codice e nuova password.');
        await resetWithCode({ username, code, password });
        setPassword(''); setConfirm(''); setCode('');
        setMode('login');
        setMessage('Password aggiornata. Accedi con la nuova password, poi genera un nuovo codice di recupero dalla pagina Account.');
      }
    } catch (cause) {
      setError(friendlyError(cause));
      if (mode === 'login') {
        failures.current += 1;
        if (failures.current >= 5) { setCooldown(30); failures.current = 0; }
      }
    } finally { setBusy(false); }
  };

  const titles: Record<Mode, [string, string]> = {
    login: ['Bentornato in campo.', 'Accedi con username e password per gestire i tuoi tornei.'],
    register: ['Crea il tuo account.', 'Solo username e password: nessuna email, nessun dato superfluo.'],
    recover: ['Recupera l’accesso.', 'Usa il codice di recupero ricevuto alla registrazione per scegliere una nuova password.'],
  };

  return <div className="auth">
    <aside className="auth__visual" aria-hidden="true">
      <Backdrop variant="auth" />
      <div className="auth__visual-content">
        <Football3D size={220} />
        <p className="auth__quote">Il calcio si vive. <span className="serif-accent serif-accent--glow">Il torneo si guida.</span></p>
      </div>
    </aside>
    <div className="auth__panel">
      <div className="auth__card glass">
        {recoveryCode ? <>
          <h1 className="auth__title">Account creato.</h1>
          <p className="auth__subtitle">Ecco il tuo codice di recupero personale.</p>
          <RecoveryCode code={recoveryCode} username={normalizeUsername(username)} doneLabel="Vai alla console" onDone={() => navigate('/console', { replace: true })} />
        </> : <>
          {mode !== 'recover' && <div className="auth__switch" role="tablist" aria-label="Scegli accesso o registrazione">
            <RouterLink role="tab" aria-selected={mode === 'login'} to="/accesso" className={mode === 'login' ? 'is-active' : ''}>Accedi</RouterLink>
            <RouterLink role="tab" aria-selected={mode === 'register'} to="/registrati" className={mode === 'register' ? 'is-active' : ''}>Registrati</RouterLink>
          </div>}
          <h1 className="auth__title">{titles[mode][0]}</h1>
          <p className="auth__subtitle">{titles[mode][1]}</p>
          {!configured && <Alert severity="warning">Il collegamento al database non è configurato per questa installazione.</Alert>}
          {error && <Alert severity="error" role="alert">{error}</Alert>}
          {message && <Alert severity="success" role="status">{message}</Alert>}
          {cooldown > 0 && <Alert severity="info" role="status">Troppi tentativi: riprova tra {cooldown} secondi.</Alert>}

          <form className="auth__form" onSubmit={submit} noValidate={mode !== 'login'}>
            <TextField id="username" label="Username" value={username}
              onChange={event => setUsername(event.target.value.replace(/\s/g, ''))}
              autoComplete="username" autoCapitalize="none" spellCheck={false} required
              error={mode === 'register' && username.length > 0 && (!usernameValid || available === false)}
              helperText={mode === 'register'
                ? (available === false ? 'Questo username è già in uso.' : username && !usernameValid ? 'Da 3 a 30 caratteri: lettere minuscole, numeri e _' : available ? 'Username disponibile.' : 'Da 3 a 30 caratteri: lettere minuscole, numeri e _. Sarà il tuo accesso.')
                : undefined}
              slotProps={{ htmlInput: { maxLength: mode === 'login' ? 254 : 30 }, input: mode === 'register' && available ? { endAdornment: <InputAdornment position="end"><CheckCircleRoundedIcon color="success" fontSize="small" /></InputAdornment> } : undefined }} />

            {mode === 'recover' && <TextField id="code" label="Codice di recupero" value={code} required
              onChange={event => setCode(event.target.value.toUpperCase())} autoComplete="off" spellCheck={false}
              placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" error={code.length > 0 && !RECOVERY_CODE_PATTERN.test(code.trim())}
              slotProps={{ htmlInput: { maxLength: 24 } }} />}

            <PasswordField id="password" label={mode === 'recover' ? 'Nuova password' : 'Password'} value={password} onChange={setPassword}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />

            {mode !== 'login' && <>
              <StrengthMeter password={password} username={username} />
              <PasswordField id="confirm" label="Conferma password" value={confirm} onChange={setConfirm} autoComplete="new-password"
                error={confirm.length > 0 && confirm !== password} helperText={confirm.length > 0 && confirm !== password ? 'Le password non coincidono.' : undefined} />
            </>}

            {mode === 'register' && <fieldset className="consents">
              <legend className="sr-only">Consensi obbligatori</legend>
              <FormControlLabel control={<Checkbox checked={acceptTerms} onChange={(_, checked) => setAcceptTerms(checked)} required />}
                label={<span>Accetto i <RouterLink to="/terms-of-service" target="_blank" rel="noopener">termini di servizio</RouterLink> e dichiaro di aver letto l’<RouterLink to="/privacy-policy" target="_blank" rel="noopener">informativa privacy</RouterLink>. <em className="req">Obbligatorio</em></span>} />
              <FormControlLabel control={<Checkbox checked={confirmAdult} onChange={(_, checked) => setConfirmAdult(checked)} required />}
                label={<span>Dichiaro di avere almeno 18 anni. <em className="req">Obbligatorio</em></span>} />
              <p className="consents__note">Gli account organizzatore sono riservati ai maggiorenni. Non chiediamo email, data di nascita né documenti. Nessun consenso di marketing.</p>
            </fieldset>}

            {mode === 'login' && <button type="button" className="link-button auth__forgot" onClick={() => switchTo('recover')}>Password dimenticata?</button>}

            <Button variant="contained" size="large" type="submit" fullWidth
              disabled={busy || !configured || cooldown > 0 || (mode === 'register' && !canRegister) || (mode === 'recover' && !canRecover)}
              endIcon={busy ? <CircularProgress size={18} color="inherit" /> : <ArrowForwardRoundedIcon />}>
              {mode === 'login' ? 'Accedi' : mode === 'register' ? 'Crea account' : 'Imposta nuova password'}
            </Button>
            {mode === 'recover' && <>
              <button type="button" className="link-button" onClick={() => switchTo('login')}>Torna all’accesso</button>
              <p className="consents__note">Hai perso anche il codice? Invia una richiesta dalla pagina <RouterLink to="/contatti">Contatti</RouterLink> indicando il tuo username.</p>
            </>}
          </form>
        </>}
      </div>
      <p className="auth__legal">Accesso protetto da Supabase Auth. Consulta <RouterLink to="/privacy-policy">privacy</RouterLink> e <RouterLink to="/cookie-policy">cookie policy</RouterLink>.</p>
    </div>
  </div>;
}
