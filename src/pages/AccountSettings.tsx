import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { client, friendlyError } from '../lib/supabase';
import { checkPassword, isInternalEmail } from '../lib/validation';
import { PasswordField, StrengthMeter } from './Access';
import { RecoveryCode } from '../components/RecoveryCode';
import { removeTenantMedia } from '../lib/media';
import { ContactFields } from '../components/ContactFields';
import { contactErrors, EMPTY_CONTACT, hasErrors, isComplete, loadMyContact, saveMyContact, type Contact } from '../lib/contact';

type OwnedTenant = { id: string; name: string; slug: string; status: string };
type SupportRequest = { id: string; kind: string; message: string; status: string; reply: string | null; created_at: string };
const KIND: Record<string, string> = { privacy: 'Privacy', support: 'Assistenza', minor: 'Dati di un minore', billing: 'Pagamenti', other: 'Altro' };
const REQUEST_STATUS: Record<string, string> = { open: 'In attesa', answered: 'Risposta disponibile', closed: 'Chiusa' };

function errorText(error: unknown) {
  return friendlyError(error);
}
export function AccountSettings() {
  const { session, profile, changePassword, regenerateRecoveryCode } = useAuth();
  const [current, setCurrent] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [nextConfirm, setNextConfirm] = useState('');
  const [hasCode, setHasCode] = useState<boolean | null>(null);
  const [newCode, setNewCode] = useState('');
  const [requests, setRequests] = useState<SupportRequest[]>([]);
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
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [savedContact, setSavedContact] = useState<Contact | null>(null);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactMsg, setContactMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [contactTouched, setContactTouched] = useState(false);
  useEffect(() => {
    if (!session) return;
    let alive = true;
    void loadMyContact(session.user.id).then(found => { if (!alive) return; setSavedContact(found); setContact(found ?? EMPTY_CONTACT); })
      .catch(() => { if (alive) setContactMsg({ ok: false, text: 'Recapiti non disponibili: hai eseguito la migrazione 202611110001_organizer_contacts.sql?' }); });
    return () => { alive = false; };
  }, [session?.user.id]);
  // Links to /account#recapiti (tournament creation, checkout) land on the contact form.
  useEffect(() => {
    if (window.location.hash !== '#recapiti') return;
    const timer = window.setTimeout(() => document.getElementById('recapiti')?.scrollIntoView({ block: 'start' }), 150);
    return () => window.clearTimeout(timer);
  }, []);
  const contactIssues = contactErrors(contact);
  const saveContact = async (event: FormEvent) => {
    event.preventDefault(); setContactTouched(true); setContactMsg(null);
    if (hasErrors(contactIssues)) return;
    setContactBusy(true);
    try {
      const saved = await saveMyContact(contact);
      setSavedContact(saved); setContact(saved);
      setContactMsg({ ok: true, text: isComplete(saved) ? 'Recapiti salvati.' : 'Recapiti salvati. Per creare un torneo servono nome, email e telefono.' });
    } catch (cause) { setContactMsg({ ok: false, text: errorText(cause) }); }
    finally { setContactBusy(false); }
  };

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
      const [me, memberships, contacts] = await Promise.all([
        sb.from('profiles').select('id,username,created_at').eq('id', session.user.id).maybeSingle(),
        sb.from('tenant_members').select('tenant_id,role,created_at').eq('user_id', session.user.id),
        sb.from('organizer_contacts').select('full_name,email,phone,updated_at').eq('user_id', session.user.id).maybeSingle(),
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
      const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), account: me.data, contact: contacts.error ? null : contacts.data, memberships: memberships.data, requests, tournaments }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'italfut-dati-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      setMessage('Esportazione completata: il file JSON è stato scaricato sul tuo dispositivo.');
    } catch (cause) { setError(errorText(cause)); }
    finally { setExporting(false); }
  };

  useEffect(() => {
    let alive = true;
    if (!session) return;
    void Promise.all([
      Promise.resolve(client().rpc('has_recovery_code')),
      Promise.resolve(client().from('support_requests').select('id,kind,message,status,reply,created_at').order('created_at', { ascending: false }).limit(50)),
    ]).then(([code, list]) => {
      if (!alive) return;
      setHasCode(code.error ? null : Boolean(code.data));
      if (!list.error) setRequests((list.data ?? []) as SupportRequest[]);
    });
    return () => { alive = false; };
  }, [session?.user.id]);

  const savePassword = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    if (!checkPassword(nextPassword, profile?.username).ok || nextPassword !== nextConfirm) { setError('La nuova password non rispetta i requisiti o non coincide.'); return; }
    setBusy(true);
    try {
      await changePassword(current, nextPassword);
      setCurrent(''); setNextPassword(''); setNextConfirm('');
      setMessage('Password aggiornata.');
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  const newRecoveryCode = async () => {
    setBusy(true); setError(''); setMessage('');
    try { setNewCode(await regenerateRecoveryCode()); setHasCode(true); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
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
      await removeTenantMedia(tenantToDelete.id); // uploaded logos and photos
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
      const { data, error: issue } = await client().rpc('delete_my_account', { p_password: password, p_confirmation: confirmationAccount });
      if (issue) throw issue;
      if (data !== true) throw new Error('Password non corretta.');
      // The account no longer exists: drop the local session.
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
          {!isInternalEmail(session?.user.email) && session?.user.email && <div><dt>Email (account precedente)</dt><dd>{session.user.email}</dd></div>}
          <div><dt>Iscritto dal</dt><dd>{session?.user.created_at ? new Date(session.user.created_at).toLocaleDateString('it-IT') : '—'}</dd></div>
        </dl>
        <p className="muted">Conserviamo username e password (cifrata), i recapiti qui sotto e i contenuti dei tuoi tornei.</p>
        <Button variant="outlined" startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <DownloadRoundedIcon />} disabled={exporting || loading} onClick={() => void exportData()}>Scarica una copia dei dati (JSON)</Button>
      </section>

      <section className="panel glass" aria-labelledby="contact-title" id="recapiti">
        <h2 id="contact-title">Recapiti</h2>
        <p className="muted">Nome e cognome, email e telefono servono solo per contattarti in caso di assistenza e sono <b>obbligatori per creare un torneo</b> o pagare un piano. Li vedete solo tu e il gestore della piattaforma: non sono mai pubblici né visibili allo staff dei tuoi tornei. Non inviamo email automatiche.</p>
        {savedContact !== null && !isComplete(savedContact) && <Alert severity="info" sx={{ mb: 2 }}>Completa i recapiti per poter creare un torneo.</Alert>}
        <form onSubmit={saveContact} className="stack-form" noValidate>
          <ContactFields value={contact} onChange={next => { setContact(next); setContactMsg(null); }} errors={contactTouched ? contactIssues : {}} disabled={contactBusy} idPrefix="account" />
          {contactMsg && <Alert severity={contactMsg.ok ? 'success' : 'error'} role={contactMsg.ok ? 'status' : 'alert'}>{contactMsg.text}</Alert>}
          <Button type="submit" variant="contained" disabled={contactBusy} sx={{ justifySelf: 'start' }}>{contactBusy ? 'Salvataggio…' : 'Salva recapiti'}</Button>
        </form>
      </section>

      <section className="panel glass" aria-labelledby="security-title">
        <h2 id="security-title">Sicurezza</h2>
        <form onSubmit={savePassword} className="stack-form">
          <PasswordField id="current-password" label="Password attuale" value={current} onChange={setCurrent} autoComplete="current-password" />
          <PasswordField id="new-password" label="Nuova password" value={nextPassword} onChange={setNextPassword} autoComplete="new-password" />
          <StrengthMeter password={nextPassword} username={profile?.username} />
          <PasswordField id="new-password-confirm" label="Conferma nuova password" value={nextConfirm} onChange={setNextConfirm} autoComplete="new-password"
            error={nextConfirm.length > 0 && nextConfirm !== nextPassword} helperText={nextConfirm.length > 0 && nextConfirm !== nextPassword ? 'Le password non coincidono.' : undefined} />
          <Button type="submit" variant="contained" disabled={busy || !current || !nextPassword} sx={{ justifySelf: 'start' }}>Cambia password</Button>
        </form>
        <div className="recovery-status">
          <div><b>Codice di recupero</b><small>{hasCode === null ? 'Stato non disponibile' : hasCode ? 'Attivo: ti permette di reimpostare la password senza email.' : 'Nessun codice attivo: generane uno ora, altrimenti non potrai recuperare l’account.'}</small></div>
          <Button variant={hasCode === false ? 'contained' : 'outlined'} startIcon={<KeyRoundedIcon />} disabled={busy} onClick={() => void newRecoveryCode()}>{hasCode ? 'Genera nuovo codice' : 'Genera codice'}</Button>
        </div>
      </section>

      <section className="panel glass" aria-labelledby="requests-title">
        <h2 id="requests-title">Le tue richieste</h2>
        <p className="muted">Richieste di assistenza o privacy inviate dalla pagina <RouterLink to="/contatti">Contatti</RouterLink>. Le risposte compaiono qui.</p>
        {requests.length ? <ul className="rows">{requests.map(request => <li className="row row--request" key={request.id}>
          <span className="row__text"><strong>{KIND[request.kind] ?? request.kind} · {new Date(request.created_at).toLocaleDateString('it-IT')}</strong><small>{request.message}</small>
            {request.reply && <span className="request-reply">{request.reply}</span>}</span>
          <Chip size="small" variant="outlined" label={REQUEST_STATUS[request.status] ?? request.status} />
        </li>)}</ul> : <p>Nessuna richiesta inviata.</p>}
        <Button component={RouterLink} to="/contatti" variant="outlined" sx={{ mt: 2 }}>Nuova richiesta</Button>
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
        <p className="hint">Per casi particolari invia una richiesta dalla pagina <RouterLink to="/contatti">Contatti</RouterLink>.</p>
      </section>
    </div>

    <Dialog open={Boolean(newCode)} fullWidth maxWidth="xs" aria-labelledby="new-code-title">
      <DialogTitle id="new-code-title">Nuovo codice di recupero</DialogTitle>
      <DialogContent><RecoveryCode code={newCode} username={profile?.username ?? 'account'} doneLabel="Fatto" onDone={() => { setNewCode(''); setMessage('Nuovo codice salvato. Il codice precedente non è più valido.'); }} /></DialogContent>
    </Dialog>

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
