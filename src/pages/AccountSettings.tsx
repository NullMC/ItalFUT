import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { client, friendlyError } from '../lib/supabase';
import { legalConfig } from '../config/legal';

type OwnedTenant = { id: string; name: string; slug: string; status: string };

function errorText(error: unknown) {
  return friendlyError(error);
}
export function AccountSettings() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [owned, setOwned] = useState<OwnedTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [tenantToDelete, setTenantToDelete] = useState<OwnedTenant | null>(null);
  const [confirmationSlug, setConfirmationSlug] = useState('');
  const [confirmationAccount, setConfirmationAccount] = useState('');
  const [password, setPassword] = useState('');
  const [accountDialog, setAccountDialog] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchOwned = async () => {
    if (!session) return;
    const { data, error: issue } = await client().from('tenants')
      .select('id,name,slug,status').eq('owner_id', session.user.id).order('created_at', { ascending: false });
    if (issue) throw issue;
    setOwned((data ?? []) as OwnedTenant[]);
  };
  useEffect(() => {
    let alive = true;
    setLoading(true);
    void client().from('tenants').select('id,name,slug,status')
      .eq('owner_id', session?.user.id ?? '').order('created_at', { ascending: false })
      .then(({ data, error: issue }) => {
        if (!alive) return;
        if (issue) setError(issue.message);
        else setOwned((data ?? []) as OwnedTenant[]);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [session?.user.id]);

  const eraseTenant = async (event: FormEvent) => {
    event.preventDefault();
    if (!tenantToDelete || confirmationSlug !== tenantToDelete.slug) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { error: issue } = await client().rpc('delete_my_tenant', {
        p_tenant_id: tenantToDelete.id, p_confirm_slug: confirmationSlug,
      });
      if (issue) throw issue;
      setTenantToDelete(null); setConfirmationSlug('');
      await fetchOwned();
      setMessage('Il torneo e i relativi dati sono stati eliminati. Questa operazione non è reversibile.');
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };

  const eraseAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (confirmationAccount !== 'ELIMINA ACCOUNT' || !password || owned.length) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { data, error: issue } = await client().functions.invoke('delete-account', {
        body: { password, confirmation: confirmationAccount },
      });
      if (issue) {
        const response = (issue as { context?: Response }).context;
        if (response && typeof response.json === 'function') {
          const body = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error || 'Servizio di cancellazione temporaneamente non disponibile.');
        }
        throw issue;
      }
      if (!data?.deleted) throw new Error('La cancellazione non è stata confermata dal server.');
      // Remove the local session; Auth records have already been deleted by the server.
      await client().auth.signOut({ scope: 'local' }).catch(() => {});
      setPassword(''); setConfirmationAccount(''); setAccountDialog(false);
      navigate('/', { replace: true });
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };

  return <div className="account-page"><Container maxWidth="md">
    <div className="account-page-heading"><ManageAccountsRoundedIcon aria-hidden="true" />
      <div><Typography variant="h1">Account e dati</Typography>
        <p>Gestisci i tuoi spazi, richiedi la rimozione dei dati o elimina l’account.</p>
      </div>
    </div>
    {message && <Alert severity="success" sx={{ mb: 3 }}>{message}</Alert>}
    {error && <Alert severity="error" sx={{ mb: 3 }} role="alert">{error}</Alert>}
    <section className="account-panel liquid-glass">
      <Typography component="h2" variant="h5">Dati dell’account</Typography>
      <dl className="account-details">
        <div><dt>Email</dt><dd>{session?.user.email || 'Non disponibile'}</dd></div>
        <div><dt>Identificativo</dt><dd className="account-id">{session?.user.id}</dd></div>
      </dl>
      <p>Per correggere dati dell’account o richiedere accesso e portabilità, consulta la <RouterLink to="/privacy-policy">privacy policy</RouterLink> e contatta il titolare indicato nell’<RouterLink to="/business">informativa sull’operatore</RouterLink>.</p>
    </section>
    <section className="account-panel liquid-glass" aria-labelledby="tenant-delete-title">
      <Typography component="h2" id="tenant-delete-title" variant="h5">Elimina i dati di un torneo</Typography>
      <p>Puoi eliminare un torneo di cui sei proprietario insieme ai relativi dati. Non è consentito procedere automaticamente se il torneo ha altri membri o contiene registrazioni di sottoscrizione: serve una gestione assistita.</p>
      {loading ? <CircularProgress aria-label="Caricamento tornei" /> : owned.length ? <div className="account-tenant-list">
        {owned.map(tenant => <div className="account-tenant-row" key={tenant.id}>
          <div><strong>{tenant.name}</strong><small>/{tenant.slug} · {tenant.status}</small></div>
          <Button color="error" variant="outlined" startIcon={<DeleteForeverRoundedIcon />}
            onClick={() => { setTenantToDelete(tenant); setConfirmationSlug(''); setError(''); }}>
            Elimina
          </Button>
        </div>)}
      </div> : <p>Non possiedi tornei da cancellare.</p>}
    </section>
    <section className="account-panel account-danger-panel liquid-glass" aria-labelledby="account-delete-title">
      <Typography component="h2" id="account-delete-title" variant="h5">Elimina definitivamente l’account</Typography>
      <p>Prima di eliminare l’account devi rimuovere o trasferire i tornei di cui sei proprietario. La richiesta richiede la password corrente e una conferma testuale.</p>
      <p>La cancellazione riguarda l’identità ItalFUT e i dati collegati, nei limiti degli obblighi legali. Non elimina automaticamente le copie possedute da altri titolari o servizi esterni.</p>
      <Button color="error" variant="outlined" startIcon={<DeleteForeverRoundedIcon />}
        disabled={loading || owned.length > 0} onClick={() => { setAccountDialog(true); setPassword(''); setConfirmationAccount(''); setError(''); }}>
        Elimina il mio account
      </Button>
      {owned.length > 0 && <p className="account-help">Devi prima eliminare i {owned.length} tornei di tua proprietà.</p>}
      {legalConfig.privacyEmail ? <p>Per richieste che richiedono intervento manuale: <a href={'mailto:' + legalConfig.privacyEmail}>{legalConfig.privacyEmail}</a>.</p>
      : <p className="account-help">L’indirizzo privacy dell’operatore deve essere configurato prima del lancio pubblico.</p>}
    </section>

    <Dialog open={Boolean(tenantToDelete)} onClose={() => { if (!busy) setTenantToDelete(null); }} fullWidth maxWidth="sm" aria-labelledby="tenant-delete-confirm-title">
      <form onSubmit={eraseTenant}>
        <DialogTitle id="tenant-delete-confirm-title">Elimina il torneo definitivamente</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="error">Operazione irreversibile: competizioni, squadre, giocatori, partite, foto collegate e contenuti del torneo saranno cancellati dal database. I contenuti ospitati su servizi esterni devono essere rimossi separatamente.</Alert>
          <Typography>Per confermare, digita esattamente lo slug <strong>{tenantToDelete?.slug}</strong>.</Typography>
          <TextField fullWidth label="Slug del torneo" autoComplete="off" required value={confirmationSlug}
            onChange={event => setConfirmationSlug(event.target.value)} />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setTenantToDelete(null)} disabled={busy}>Annulla</Button>
          <Button color="error" variant="contained" type="submit" disabled={busy || confirmationSlug !== tenantToDelete?.slug}>
            {busy ? 'Eliminazione…' : 'Elimina definitivamente'}
          </Button></DialogActions>
      </form>
    </Dialog>

    <Dialog open={accountDialog} onClose={() => { if (!busy) setAccountDialog(false); }} fullWidth maxWidth="sm" aria-labelledby="account-delete-confirm-title">
      <form onSubmit={eraseAccount}>
        <DialogTitle id="account-delete-confirm-title">Conferma cancellazione account</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="error">L’account non sarà più accessibile. La cancellazione non può essere annullata. Eventuali obblighi contabili o legali richiedono una procedura assistita.</Alert>
          <TextField type="password" label="Password attuale" autoComplete="current-password" required
            value={password} onChange={event => setPassword(event.target.value)} />
          <TextField label='Scrivi "ELIMINA ACCOUNT"' autoComplete="off" required
            value={confirmationAccount} onChange={event => setConfirmationAccount(event.target.value)} />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setAccountDialog(false)} disabled={busy}>Annulla</Button>
          <Button color="error" variant="contained" type="submit" disabled={busy || confirmationAccount !== 'ELIMINA ACCOUNT' || !password || owned.length > 0}>
            {busy ? 'Eliminazione…' : 'Confermo la cancellazione'}
          </Button></DialogActions>
      </form>
    </Dialog>
  </Container></div>;
}
