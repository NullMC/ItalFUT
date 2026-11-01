import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { client, friendlyError } from '../lib/supabase';
import { legalConfig } from '../config/legal';

type OwnedTenant = { id: string; name: string; slug: string; status: string };

function errorText(error: unknown) {
  return friendlyError(error);
}
export function AccountSettings() {
  const { session, profile } = useAuth();
  const [exporting, setExporting] = useState(false);
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
    void Promise.resolve(client().from('tenants').select('id,name,slug,status')
      .eq('owner_id', session?.user.id ?? '').order('created_at', { ascending: false }))
      .then(({ data, error: issue }) => {
        if (!alive) return;
        if (issue) setError(issue.message);
        else setOwned((data ?? []) as OwnedTenant[]);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [session?.user.id]);

  // GDPR art. 20: machine-readable copy of the account and of owned tournaments.
  const exportData = async () => {
    if (!session) return;
    setExporting(true); setError('');
    try {
      const sb = client();
      const tables = ['competitions', 'teams', 'competition_teams', 'players', 'matches', 'match_events', 'staff_members', 'awards', 'sponsors', 'articles', 'market_slots', 'galleries'];
      const [me, memberships] = await Promise.all([
        sb.from('profiles').select('id,username,email,created_at').eq('id', session.user.id).maybeSingle(),
        sb.from('tenant_members').select('tenant_id,role,created_at').eq('user_id', session.user.id),
      ]);
      if (me.error) throw me.error;
      if (memberships.error) throw memberships.error;
      const tournaments = [];
      for (const tenant of owned) {
        const rows = await Promise.all(tables.map(table => sb.from(table).select('*').eq('tenant_id', tenant.id).limit(5000)));
        const failed = rows.find(result => result.error);
        if (failed?.error) throw failed.error;
        tournaments.push({ ...tenant, data: Object.fromEntries(tables.map((table, index) => [table, rows[index].data ?? []])) });
      }
      const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), account: me.data, memberships: memberships.data, tournaments }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'italfut-dati-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      setMessage('Esportazione completata: il file JSON è stato scaricato sul tuo dispositivo.');
    } catch (cause) { setError(errorText(cause)); }
    finally { setExporting(false); }
  };

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

  const STATUS: Record<string, string> = { active: 'Online', draft: 'Bozza', suspended: 'Sospeso' };
  return <div className="page account">
    <div className="page-glow" aria-hidden="true" />
    <div className="container container--narrow">
      <header className="page-head">
        <h1 className="page-title">Account <span className="serif-accent">e dati.</span></h1>
        <p className="lead">I tuoi dati, sotto il tuo controllo: consultali, scaricali o cancellali.</p>
      </header>
      {message && <Alert severity="success" sx={{ mb: 3 }} role="status">{message}</Alert>}
      {error && !tenantToDelete && !accountDialog && <Alert severity="error" sx={{ mb: 3 }} role="alert">{error}</Alert>}

      <section className="panel glass" aria-labelledby="account-data-title">
        <h2 id="account-data-title">I tuoi dati</h2>
        <dl className="kv">
          <div><dt>Username</dt><dd>{profile?.username ?? '—'}</dd></div>
          <div><dt>Email</dt><dd>{session?.user.email || '—'}</dd></div>
          <div><dt>Iscritto dal</dt><dd>{session?.user.created_at ? new Date(session.user.created_at).toLocaleDateString('it-IT') : '—'}</dd></div>
        </dl>
        <p className="muted">Raccogliamo solo username, email e password (cifrata). Per correggere i dati scrivi all’indirizzo indicato nella <RouterLink to="/privacy-policy">privacy policy</RouterLink>.</p>
        <Button variant="outlined" startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <DownloadRoundedIcon />} disabled={exporting || loading} onClick={() => void exportData()}>Scarica una copia dei dati (JSON)</Button>
      </section>

      <section className="panel glass" aria-labelledby="tenant-delete-title">
        <h2 id="tenant-delete-title">Elimina un torneo</h2>
        <p className="muted">Puoi eliminare i tornei di cui sei proprietario con tutti i loro contenuti. Se il torneo ha altri membri o dati di abbonamento serve una procedura assistita.</p>
        {loading ? <CircularProgress aria-label="Caricamento tornei" /> : owned.length ? <ul className="rows">
          {owned.map(tenant => <li className="row" key={tenant.id}>
            <span className="row__text"><strong>{tenant.name}</strong><small>/t/{tenant.slug} · {STATUS[tenant.status] ?? tenant.status}</small></span>
            <Button color="error" variant="outlined" size="small" startIcon={<DeleteForeverRoundedIcon />}
              onClick={() => { setTenantToDelete(tenant); setConfirmationSlug(''); setError(''); }}>Elimina</Button>
          </li>)}
        </ul> : <p>Non possiedi tornei.</p>}
      </section>

      <section className="panel glass panel--danger" aria-labelledby="account-delete-title">
        <h2 id="account-delete-title">Elimina l’account</h2>
        <p className="muted">La cancellazione è definitiva e rimuove la tua identità ItalFUT. Prima elimina o trasferisci i tornei di cui sei proprietario. Ti chiederemo la password per conferma.</p>
        <Button color="error" variant="contained" startIcon={<DeleteForeverRoundedIcon />}
          disabled={loading || owned.length > 0} onClick={() => { setAccountDialog(true); setPassword(''); setConfirmationAccount(''); setError(''); }}>
          Elimina il mio account
        </Button>
        {owned.length > 0 && <p className="hint">Prima elimina {owned.length === 1 ? 'il torneo' : `i ${owned.length} tornei`} di tua proprietà.</p>}
        {legalConfig.privacyEmail && <p className="hint">Per richieste particolari: <a href={'mailto:' + legalConfig.privacyEmail}>{legalConfig.privacyEmail}</a>.</p>}
      </section>
    </div>

    <Dialog open={Boolean(tenantToDelete)} onClose={() => { if (!busy) setTenantToDelete(null); }} fullWidth maxWidth="sm" aria-labelledby="tenant-delete-confirm-title">
      <form onSubmit={eraseTenant}>
        <DialogTitle id="tenant-delete-confirm-title">Eliminare “{tenantToDelete?.name}”?</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="error">Competizioni, squadre, giocatori, partite e contenuti verranno cancellati definitivamente. Le immagini ospitate su servizi esterni vanno rimosse separatamente.</Alert>
          <p>Per confermare scrivi l’indirizzo del torneo: <strong>{tenantToDelete?.slug}</strong></p>
          <TextField fullWidth label="Indirizzo del torneo" autoComplete="off" required value={confirmationSlug} onChange={event => setConfirmationSlug(event.target.value)} />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack></DialogContent>
        <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setTenantToDelete(null)} disabled={busy}>Annulla</Button>
          <Button color="error" variant="contained" type="submit" disabled={busy || confirmationSlug !== tenantToDelete?.slug}>{busy ? 'Eliminazione…' : 'Elimina definitivamente'}</Button></DialogActions>
      </form>
    </Dialog>

    <Dialog open={accountDialog} onClose={() => { if (!busy) setAccountDialog(false); }} fullWidth maxWidth="sm" aria-labelledby="account-delete-confirm-title">
      <form onSubmit={eraseAccount}>
        <DialogTitle id="account-delete-confirm-title">Conferma la cancellazione dell’account</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="error">Non potrai più accedere e l’operazione non può essere annullata.</Alert>
          <TextField type="password" label="Password attuale" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
          <TextField label='Scrivi "ELIMINA ACCOUNT"' autoComplete="off" required value={confirmationAccount} onChange={event => setConfirmationAccount(event.target.value)} />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack></DialogContent>
        <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setAccountDialog(false)} disabled={busy}>Annulla</Button>
          <Button color="error" variant="contained" type="submit" disabled={busy || confirmationAccount !== 'ELIMINA ACCOUNT' || !password || owned.length > 0}>{busy ? 'Eliminazione…' : 'Elimina account'}</Button></DialogActions>
      </form>
    </Dialog>
  </div>;
}
