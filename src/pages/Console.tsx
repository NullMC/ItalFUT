import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams, Link as RouterLink, NavLink } from 'react-router-dom';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { motion, useReducedMotion } from 'motion/react';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';
import ExtensionRoundedIcon from '@mui/icons-material/ExtensionRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import SyncAltRoundedIcon from '@mui/icons-material/SyncAltRounded';
import CollectionsRoundedIcon from '@mui/icons-material/CollectionsRounded';
import PlaylistAddCheckRoundedIcon from '@mui/icons-material/PlaylistAddCheckRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import { useAuth } from '../auth/AuthProvider';
import { MODULES, BASE_MONTHLY, estimate, formatEuro } from '../lib/catalog';
import { addDays, clearDraft, EDIT_WINDOW_HOURS, eventPhase, eventTotal, formatDay, readDraft, romeToday, validEventDate, type PlanKind } from '../lib/plan';
import { DurationStepper } from '../components/DurationStepper';
import { client, friendlyError } from '../lib/supabase';
import type { FeatureCode, MemberRole, Tenant, TenantFeature } from '../lib/types';
import { CrudEditor, EDITORS } from '../components/CrudEditor';
import { TenantAnalytics } from '../components/TenantAnalytics';
import { cleanText, HEX_COLOR, safeUrl, SLUG_PATTERN } from '../lib/validation';
import { trackSpotlight } from '../components/MarketingMotion';
import { ErrorView } from './ErrorPage';
import { ScrollRail } from '../components/ScrollRail';
import { ImageField } from '../components/ImageField';
import { removeMedia } from '../lib/media';
import { summarize, useTenantStats } from '../lib/useTenantStats';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { PlanCheckout } from '../components/PlanCheckout';
import { ContactFields } from '../components/ContactFields';
import { contactErrors, EMPTY_CONTACT, hasErrors, isComplete, isContactRequired, loadMyContact, saveMyContact, type Contact } from '../lib/contact';
import { EventClosed, EventDateField, EventModules, EventStatus, EventWindowNote } from '../components/EventPanel';
import { paymentsEnabled } from '../lib/payments';

type Owned = { role: MemberRole; tenants: Tenant | null };
const TENANT_COLUMNS = 'id,slug,name,tagline,logo_url,cover_url,brand_color,status,owner_id,created_at,kind,event_date,published_at';
const COLOR_PRESETS = [
  { name: 'Stadio', color: '#173d32' }, { name: 'Prato', color: '#0f6b4a' }, { name: 'Laguna', color: '#227472' },
  { name: 'Notte', color: '#1d2b53' }, { name: 'Granata', color: '#7a1f2b' }, { name: 'Ambra', color: '#a35d00' },
] as const;
const ROLE_LABEL: Record<MemberRole, string> = { owner: 'Proprietario', admin: 'Amministratore', editor: 'Editor', viewer: 'Lettore' };
const STATUS_LABEL: Record<string, string> = { active: 'Online', draft: 'Bozza privata', suspended: 'Sospesa' };
export const EDITOR_ICONS: Record<string, ReactNode> = {
  competitions: <EmojiEventsRoundedIcon fontSize="small" />, teams: <GroupsRoundedIcon fontSize="small" />,
  enrollments: <PlaylistAddCheckRoundedIcon fontSize="small" />, players: <PersonRoundedIcon fontSize="small" />,
  matches: <EventRoundedIcon fontSize="small" />, events: <QueryStatsRoundedIcon fontSize="small" />,
  staff: <BadgeRoundedIcon fontSize="small" />, awards: <WorkspacePremiumRoundedIcon fontSize="small" />,
  sponsors: <HandshakeRoundedIcon fontSize="small" />, articles: <ArticleRoundedIcon fontSize="small" />,
  market: <SyncAltRoundedIcon fontSize="small" />, gallery: <CollectionsRoundedIcon fontSize="small" />,
};

function formatSlug(text: string) {
  return text.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-/, '').slice(0, 42);
}

export function ConsoleHome() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [owned, setOwned] = useState<Owned[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Format chosen in the configurator (if any); without it the dialog asks for it.
  const [saved, setSaved] = useState(readDraft);
  const [kind, setKind] = useState<PlanKind>(saved?.kind ?? 'event');
  const [eventDate, setEventDate] = useState(saved?.eventDate ?? '');
  const plan = { months: saved?.kind === 'season' ? saved.months : 1, modules: saved?.kind === kind ? saved.modules : [] as FeatureCode[] };
  const quote = estimate(plan.months, plan.modules);
  // Contact details are required to create a tournament: asked in the dialog when missing.
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [needsContact, setNeedsContact] = useState(false);
  const [contactTouched, setContactTouched] = useState(false);
  const loadContact = async () => {
    if (!session) return;
    try { const found = await loadMyContact(session.user.id); setContact(found ?? EMPTY_CONTACT); setNeedsContact(!isComplete(found)); }
    catch { setNeedsContact(false); } // table missing: the database check will explain
  };
  const openCreate = () => { const d = readDraft(); setSaved(d); setKind(d?.kind ?? 'event'); setEventDate(d?.eventDate ?? ''); setContactTouched(false); void loadContact(); setCreating(true); };
  const contactIssues = contactErrors(contact, true);

  useEffect(() => {
    let live = true;
    if (!session) return;
    setLoading(true);
    void Promise.resolve(client().from('tenant_members').select('role,tenants(' + TENANT_COLUMNS + ')').eq('user_id', session.user.id))
      .then(({ data, error: issue }) => {
        if (!live) return;
        if (issue) setError(friendlyError(issue));
        else setOwned((data ?? []) as unknown as Owned[]);
      }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [session?.user?.id]);

  // Someone arriving from the configurator gets the creation dialog straight away.
  useEffect(() => {
    if (!loading && readDraft()) openCreate();
  }, [loading]);

  const create = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    const cleanName = cleanText(name, 90);
    const cleanSlug = formatSlug(slug || name).replace(/-$/, '');
    if (cleanName.length < 3) { setError('Il nome deve avere almeno 3 caratteri.'); return; }
    if (!SLUG_PATTERN.test(cleanSlug)) { setError('Indirizzo non valido: usa da 3 a 42 caratteri tra lettere minuscole, numeri e trattini.'); return; }
    if (kind === 'event' && !validEventDate(eventDate)) { setError('Scegli la data del torneo: da oggi a due anni da oggi.'); return; }
    if (needsContact) {
      setContactTouched(true);
      if (hasErrors(contactIssues)) { setError('Completa nome e cognome, email e telefono.'); return; }
    }
    setBusy(true);
    try {
      if (needsContact) { setContact(await saveMyContact(contact)); setNeedsContact(false); }
      const { error: issue } = await client().rpc('create_tenant', {
        p_name: cleanName, p_slug: cleanSlug, p_months: plan.months, p_features: plan.modules,
        p_kind: kind, p_event_date: kind === 'event' ? eventDate : null,
      });
      if (issue) throw issue;
      clearDraft();
      setCreating(false);
      // A one-day tournament is free: straight to its console. With extras chosen, or a paid
      // plan with payments on, the new (draft) tournament goes to its plan page.
      if (kind === 'event') navigate(plan.modules.length ? `/console/${cleanSlug}/modules` : '/console/' + cleanSlug);
      else if (paymentsEnabled) navigate(`/console/${cleanSlug}/modules`, { state: { plan } });
      else navigate('/console/' + cleanSlug);
    } catch (cause) {
      if (isContactRequired(cause)) { setNeedsContact(true); setContactTouched(true); }
      const text = friendlyError(cause);
      setError(/duplicate|unique/i.test(text) ? 'Questo indirizzo è già in uso: scegline un altro.' : text);
    } finally { setBusy(false); }
  };
  const tenants = owned.filter(item => item.tenants);
  return <div className="page console-home">
    <div className="page-glow" aria-hidden="true" />
    <div className="container">
      <header className="console-home__head">
        <div><h1 className="page-title">Ciao{profile?.username ? ', ' : ''}<span className="serif-accent">{profile?.username ?? ''}</span></h1><p className="lead">I tuoi tornei, in un unico posto.</p></div>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>Nuovo torneo</Button>
      </header>
      {error && !creating && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {loading ? <div className="center-min"><CircularProgress aria-label="Caricamento tornei" /></div>
        : tenants.length ? <div className="tenant-grid">
          {tenants.map(({ tenants: tenant, role }, index) => tenant && <motion.div key={tenant.id}
            initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05, duration: .5, ease: [.16, 1, .3, 1] }}>
            <RouterLink to={'/console/' + tenant.slug} className="tenant-card glass spotlight" onPointerMove={trackSpotlight}
              style={{ ['--tenant' as string]: HEX_COLOR.test(tenant.brand_color) ? tenant.brand_color : '#0f6b4a' }}>
              <span className="tenant-card__avatar">{tenant.name.charAt(0).toUpperCase()}</span>
              <span className="tenant-card__status"><span className={'dot ' + (tenant.status === 'active' ? 'dot--live' : 'dot--wait')} />{tenant.kind === 'event' && eventPhase(tenant).phase === 'closed' ? 'Concluso' : STATUS_LABEL[tenant.status] ?? tenant.status}</span>
              <strong>{tenant.name}</strong>
              <small>{tenant.kind === 'event' ? 'Torneo di un giorno · ' + formatDay(tenant.event_date, false) : '/t/' + tenant.slug + ' · ' + ROLE_LABEL[role]}</small>
              <ArrowForwardRoundedIcon className="tenant-card__arrow" />
            </RouterLink>
          </motion.div>)}
          <button type="button" className="tenant-card tenant-card--new" onClick={openCreate}><AddRoundedIcon /><strong>Crea un nuovo torneo</strong><small>Gratis per i tornei di un giorno</small></button>
        </div>
        : <div className="empty-state glass">
          <h2>Il tuo primo torneo ti aspetta.</h2>
          <p>Crea uno spazio per gestire squadre, partite e classifiche. Resta privato finché non viene pubblicato.</p>
          <Button variant="contained" onClick={openCreate} startIcon={<AddRoundedIcon />}>Crea un torneo</Button>
        </div>}
    </div>
    <Dialog open={creating} onClose={() => !busy && setCreating(false)} fullWidth maxWidth="sm" aria-labelledby="create-title">
      <form onSubmit={create} noValidate>
        <DialogTitle id="create-title">Dai un nome al tuo torneo</DialogTitle>
        <DialogContent><Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField label="Nome del torneo" value={name} required autoFocus
            onChange={e => { setName(e.target.value); if (!slugEdited) setSlug(formatSlug(e.target.value)); }}
            slotProps={{ htmlInput: { maxLength: 90, minLength: 3 } }} />
          <TextField label="Indirizzo pubblico" value={slug} required
            onChange={e => { setSlugEdited(true); setSlug(formatSlug(e.target.value)); }}
            helperText={window.location.origin + '/t/' + (slug || 'nome-torneo')}
            slotProps={{ htmlInput: { maxLength: 42, pattern: '[a-z0-9][a-z0-9\\-]{2,41}' } }} />
          <fieldset className="create-format">
            <legend>Formato</legend>
            <div className="create-format__options" role="radiogroup" aria-label="Formato del torneo">
              <button type="button" role="radio" aria-checked={kind === 'event'} className={'chip-link' + (kind === 'event' ? ' is-active' : '')} onClick={() => setKind('event')}>Torneo di un giorno · gratis</button>
              <button type="button" role="radio" aria-checked={kind === 'season'} className={'chip-link' + (kind === 'season' ? ' is-active' : '')} onClick={() => setKind('season')}>Campionato o torneo lungo</button>
            </div>
          </fieldset>
          {kind === 'event' && <TextField type="date" label="Giorno del torneo" value={eventDate} required onChange={e => setEventDate(e.target.value)}
            helperText={eventDate ? formatDay(eventDate) + ' · modificabile fino alla pubblicazione' : 'Le partite si giocano in questa data; puoi cambiarla fino alla pubblicazione.'}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: romeToday(), max: addDays(romeToday(), 730) } }} />}
          {kind === 'event'
            ? <Alert severity="info">Gratis con le funzioni base{plan.modules.length ? `; ${plan.modules.length} ${plan.modules.length === 1 ? 'modulo extra' : 'moduli extra'} da ${formatEuro(eventTotal(plan.modules))} una tantum, da attivare in Moduli` : ''}. Lo pubblichi dal giorno del torneo, poi hai {EDIT_WINDOW_HOURS} ore per aggiornarlo. <RouterLink to="/configura?formato=giornata">Modifica</RouterLink></Alert>
            : saved?.kind === 'season'
              ? <Alert severity="info">Configurazione scelta: {plan.months} {plan.months === 1 ? 'mese' : 'mesi'}, {plan.modules.length} moduli facoltativi. Preventivo indicativo {formatEuro(quote.total)}. {paymentsEnabled ? 'Dopo la creazione la trovi salvata in Moduli: puoi cambiarla prima di pagare su Stripe.' : 'Nessun addebito: i moduli extra restano da attivare.'} <RouterLink to="/configura?formato=stagione">Modifica</RouterLink></Alert>
              : <Alert severity="info">Piano da {formatEuro(BASE_MONTHLY)} al mese: durata e moduli li scegli dopo la creazione, in Moduli. <RouterLink to="/configura?formato=stagione">Configura ora</RouterLink></Alert>}
          {needsContact && <fieldset className="create-contact">
            <legend>I tuoi recapiti</legend>
            <p className="muted">Obbligatori per creare un torneo: servono solo per contattarti in caso di assistenza. Li vedete solo tu e il gestore; li puoi cambiare in <RouterLink to="/account#recapiti">Account e dati</RouterLink>.</p>
            <ContactFields value={contact} onChange={setContact} errors={contactTouched ? contactIssues : {}} required disabled={busy} idPrefix="create" />
          </fieldset>}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack></DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}><Button onClick={() => setCreating(false)} disabled={busy}>Annulla</Button><Button variant="contained" type="submit" disabled={busy}>{busy ? 'Creazione…' : 'Crea torneo'}</Button></DialogActions>
      </form>
    </Dialog>
  </div>;
}

export function TenantConsole() {
  const { slug, section = 'overview' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, signOut } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [role, setRole] = useState<MemberRole | null>(null);
  const [features, setFeatures] = useState<TenantFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [upgrade, setUpgrade] = useState<FeatureCode[]>([]);
  const [upgradeMonths, setUpgradeMonths] = useState(1);
  const [upgrading, setUpgrading] = useState(false);
  const [fields, setFields] = useState({ name: '', tagline: '', brand_color: '#173d32', logo_url: '', cover_url: '' });
  const [saving, setSaving] = useState(false);
  const { data: stats } = useTenantStats(tenant?.id);
  const settingsUploads = useRef(new Set<string>());
  // Uploads never saved (page left without saving) are deleted.
  useEffect(() => () => { void removeMedia([...settingsUploads.current]); }, []);
  const season = stats ? summarize(stats) : null;
  const refresh = async () => {
    if (!slug || !session) return;
    const sb = client();
    const { data: found, error: issue } = await sb.from('tenants').select(TENANT_COLUMNS).eq('slug', slug).maybeSingle();
    if (issue) throw issue;
    if (!found) { setTenant(null); return; }
    const [member, grants] = await Promise.all([
      sb.from('tenant_members').select('role').eq('tenant_id', found.id).eq('user_id', session.user.id).maybeSingle(),
      sb.from('tenant_features').select('tenant_id,code,enabled,ends_at').eq('tenant_id', found.id),
    ]);
    if (member.error) throw member.error;
    if (grants.error) throw grants.error;
    setTenant(found as Tenant); setRole(member.data?.role as MemberRole | null);
    setFeatures((grants.data ?? []) as TenantFeature[]);
    setFields({ name: found.name, tagline: found.tagline ?? '', brand_color: found.brand_color ?? '#173d32', logo_url: found.logo_url ?? '', cover_url: found.cover_url ?? '' });
  };
  useEffect(() => {
    let live = true;
    setLoading(true); setError('');
    const start = async () => { try { await refresh(); } catch (cause) { if (live) setError(friendlyError(cause)); } finally { if (live) setLoading(false); } };
    void start();
    return () => { live = false; };
  }, [slug, session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setNotice(''); setError(''); }, [section]);

  const enabled = (code: FeatureCode) => features.some(f => f.code === code && f.enabled && (!f.ends_at || new Date(f.ends_at).getTime() > Date.now()));
  const editable = role === 'owner' || role === 'admin' || role === 'editor';
  const canBuy = role === 'owner' || role === 'admin';
  const selectedEditor = EDITORS.find(item => item.key === section);
  const saveSettings = async (event: FormEvent) => {
    event.preventDefault(); if (!tenant) return;
    setError(''); setNotice('');
    const payload = {
      name: cleanText(fields.name, 90), tagline: cleanText(fields.tagline, 160) || null,
      brand_color: fields.brand_color.trim(), logo_url: safeUrl(fields.logo_url) || null, cover_url: safeUrl(fields.cover_url) || null,
    };
    if (payload.name.length < 3) { setError('Il nome deve avere almeno 3 caratteri.'); return; }
    if (!HEX_COLOR.test(payload.brand_color)) { setError('Colore non valido: usa il formato #RRGGBB.'); return; }
    if ((fields.logo_url.trim() && !payload.logo_url) || (fields.cover_url.trim() && !payload.cover_url)) { setError('Gli indirizzi delle immagini devono iniziare con https://'); return; }
    setSaving(true);
    try {
      const { error: issue } = await client().from('tenants').update(payload).eq('id', tenant.id);
      if (issue) throw issue;
      // Delete uploads that did not end up in the saved settings and the images they replaced.
      const kept = new Set([payload.logo_url, payload.cover_url].filter(Boolean));
      void removeMedia([...settingsUploads.current, tenant.logo_url, tenant.cover_url].filter(url => url && !kept.has(url)));
      settingsUploads.current.clear();
      await refresh();
      setNotice('Impostazioni salvate.');
    } catch (cause) { setError(friendlyError(cause)); }
    finally { setSaving(false); }
  };
  const askUpgrade = async () => {
    if (!tenant || !upgrade.length) return;
    setUpgrading(true); setError(''); setNotice('');
    try {
      const { error: issue } = await client().rpc('request_upgrade', { p_tenant_id: tenant.id, p_months: upgradeMonths, p_features: upgrade });
      if (issue) throw issue;
      setUpgrade([]);
      setNotice('Richiesta registrata. I moduli restano disattivati finché non vengono confermati: nessun addebito automatico.');
    } catch (cause) { setError(friendlyError(cause)); }
    finally { setUpgrading(false); }
  };
  if (loading) return <div className="center-screen"><CircularProgress aria-label="Caricamento" /></div>;
  if (error && !tenant) return <ErrorView code={navigator.onLine ? '503' : 'offline'} compact retry={() => window.location.reload()} detail="Non è stato possibile caricare il torneo." />;
  if (!tenant) return <ErrorView code="404" compact detail="Nessun torneo con questo indirizzo tra quelli a cui hai accesso." />;
  if (!role) return <ErrorView code="403" compact detail="Il tuo account non fa parte dello staff di questo torneo." />;
  const isEvent = tenant.kind === 'event';
  // One-day tournament past its 48-hour window: the console is closed, the site stays online.
  if (isEvent && eventPhase(tenant).phase === 'closed') return <EventClosed tenant={tenant} />;
  const base = '/console/' + slug;
  const accent = HEX_COLOR.test(tenant.brand_color) ? tenant.brand_color : '#0f6b4a';
  const counts: Record<string, number | undefined> = stats ? { teams: stats.teams.length, players: stats.players, matches: stats.matches.length, competitions: stats.competitions } : {};
  const navItem = (to: string, label: string, icon: ReactNode, end = false, locked = false, count?: number) => <NavLink key={to} to={to} end={end}
    className={({ isActive }) => 'side-link' + (isActive ? ' is-active' : '')}>
    {icon}<span>{label}</span>
    {locked ? <LockOutlinedIcon className="side-link__lock" aria-label="Modulo non attivo" /> : count != null && <em className="side-link__count" aria-label={count + ' elementi'}>{count}</em>}
  </NavLink>;
  const today = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const playedPct = season?.total ? Math.round(season.finished / season.total * 100) : 0;
  return <div className="workspace" style={{ ['--tenant' as string]: accent }}>
    <aside className="workspace__side glass" aria-label="Gestione del torneo">
      <div className="side-top">
        <RouterLink to="/console" className="side-back"><ArrowBackRoundedIcon fontSize="small" />Tutti i tornei</RouterLink>
        <div className="side-identity">
          <span className="tenant-card__avatar">{tenant.name.charAt(0).toUpperCase()}</span>
          <div><b title={tenant.name}>{tenant.name}</b><small><span className={'dot ' + (tenant.status === 'active' ? 'dot--live' : 'dot--wait')} />{STATUS_LABEL[tenant.status]} · {isEvent ? formatDay(tenant.event_date, false) : ROLE_LABEL[role]}</small></div>
          <a className="side-site" href={'/t/' + tenant.slug} target="_blank" rel="noopener noreferrer" aria-label={(tenant.status === 'active' ? 'Apri il sito' : 'Apri l’anteprima') + ' in una nuova scheda'} title={tenant.status === 'active' ? 'Apri il sito' : 'Anteprima'}><ArrowOutwardRoundedIcon fontSize="small" /></a>
        </div>
      </div>
      <ScrollRail as="nav" axis="y" className="side-nav" label="Sezioni del torneo" activeKey={section}>
        <p className="side-nav__title">Torneo</p>
        {navItem(base, 'Panoramica', <SpaceDashboardRoundedIcon fontSize="small" />, true)}
        {navItem(base + '/settings', 'Identità e aspetto', <PaletteRoundedIcon fontSize="small" />)}
        <p className="side-nav__title">Contenuti</p>
        {EDITORS.map(item => navItem(base + '/' + item.key, item.label, EDITOR_ICONS[item.key], false, !enabled(item.feature), counts[item.key]))}
        <p className="side-nav__title">Piano</p>
        {navItem(base + '/modules', 'Moduli', <ExtensionRoundedIcon fontSize="small" />)}
      </ScrollRail>
      {season && <RouterLink to={base + '/matches'} className="side-season">
        <span className="side-season__head"><b>Stagione</b><em>{playedPct}%</em></span>
        <span className="side-season__bar" aria-hidden="true"><i style={{ width: playedPct + '%' }} /></span>
        <small>{season.total ? `${season.finished} di ${season.total} partite giocate` : 'Calendario ancora vuoto'}{season.upcoming[0]?.kickoff_at ? ' · prossima ' + new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(new Date(season.upcoming[0].kickoff_at)) : ''}</small>
      </RouterLink>}
      <div className="side-bottom">
        <RouterLink to="/account" className="side-link"><ManageAccountsRoundedIcon fontSize="small" /><span>Account e dati</span></RouterLink>
        <button type="button" className="side-link" onClick={() => void signOut().then(() => navigate('/'))}><LogoutRoundedIcon fontSize="small" /><span>Esci</span></button>
      </div>
    </aside>
    <div className="workspace__main">
      <div className="workspace__top">
        <ScrollRail as="nav" className="workspace__chips" label="Sezioni" activeKey={section}>
          {[{ key: 'overview', label: 'Panoramica', to: base }, { key: 'settings', label: 'Aspetto', to: base + '/settings' }, ...EDITORS.map(e => ({ key: e.key, label: e.label, to: base + '/' + e.key })), { key: 'modules', label: 'Moduli', to: base + '/modules' }]
            .map(item => <RouterLink key={item.key} to={item.to} className={'chip-link' + (section === item.key ? ' is-active' : '')} aria-current={section === item.key ? 'page' : undefined}>{item.label}</RouterLink>)}
        </ScrollRail>
        {section !== 'overview' && <a className="btn btn--ghost btn--sm glass workspace__site" href={'/t/' + tenant.slug} target="_blank" rel="noopener noreferrer"><span className="workspace__site-label">{tenant.status === 'active' ? 'Apri il sito' : 'Anteprima'}</span><ArrowOutwardRoundedIcon /></a>}
      </div>
      {error && <Alert severity="error" sx={{ mb: 3 }} role="alert">{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 3 }} role="status" onClose={() => setNotice('')}>{notice}</Alert>}
      {isEvent && section !== 'overview' && <EventWindowNote tenant={tenant} />}

      {section === 'overview' && <>
        <header className="ws-head">
          <div className="ws-head__text">
            <h1>{tenant.name}</h1>
            <p><span className="ws-head__date">{today}</span>{tenant.tagline ? ' · ' + tenant.tagline : ''}</p>
          </div>
          <div className="ws-head__actions">
            <a className="btn btn--ghost btn--sm glass" href={'/t/' + tenant.slug} target="_blank" rel="noopener noreferrer">{tenant.status === 'active' ? 'Apri il sito' : 'Anteprima'}<ArrowOutwardRoundedIcon /></a>
            {editable && enabled('matches') && <RouterLink to={base + '/matches'} className="btn btn--primary btn--sm"><AddRoundedIcon />Partita</RouterLink>}
          </div>
        </header>
        {isEvent && <EventStatus tenant={tenant} canManage={canBuy} base={base} onChanged={refresh} />}
        {!isEvent && tenant.status !== 'active' && <div className="banner glass" role="status">
          <span className="banner__icon" aria-hidden="true"><InfoOutlinedIcon /></span>
          <div><b>Il torneo è in bozza.</b><p>Prepara squadre, rose e calendario: il sito pubblico resta visibile solo allo staff finché {paymentsEnabled ? 'non attivi il piano.' : 'non viene pubblicato.'}</p></div>
          {paymentsEnabled && canBuy ? <RouterLink className="btn btn--primary btn--sm" to={base + '/modules'}>Attiva il piano</RouterLink>
            : <a className="btn btn--ghost btn--sm" href={'/t/' + tenant.slug} target="_blank" rel="noopener noreferrer">Vedi l’anteprima</a>}
        </div>}
        <TenantAnalytics tenantId={tenant.id} base={base} />
        <h2 className="workspace__subhead">Gestione rapida</h2>
        <div className="quick-grid">{EDITORS.slice(0, 6).map(item => <RouterLink key={item.key} to={base + '/' + item.key} className="quick-card glass spotlight" onPointerMove={trackSpotlight}>
          <span className="quick-card__icon" aria-hidden="true">{EDITOR_ICONS[item.key]}</span>
          <span><b>{item.label}{counts[item.key] != null && <em className="quick-card__count">{counts[item.key]}</em>}</b><small>{item.summary}</small></span>
          {enabled(item.feature) ? <ArrowForwardRoundedIcon className="quick-card__arrow" /> : <LockOutlinedIcon className="quick-card__arrow" aria-label="Modulo non attivo" />}
        </RouterLink>)}</div>
      </>}

      {section === 'settings' && <div className="settings">
        <header className="ws-head"><div className="ws-head__text"><h1>Identità e aspetto</h1><p>Nome, slogan, colori e immagini del sito pubblico.</p></div></header>
        {isEvent && <EventDateField tenant={tenant} canManage={canBuy} onChanged={refresh} />}
        <div className="settings__grid">
          <form onSubmit={saveSettings} className="panel glass"><Stack spacing={2.5}>
            <TextField label="Nome del torneo" required value={fields.name} onChange={e => setFields(f => ({ ...f, name: e.target.value }))} disabled={!editable} slotProps={{ htmlInput: { maxLength: 90 } }} />
            <TextField label="Slogan" value={fields.tagline} onChange={e => setFields(f => ({ ...f, tagline: e.target.value }))} disabled={!editable} slotProps={{ htmlInput: { maxLength: 160 } }} />
            <fieldset className="palette" disabled={!editable}>
              <legend>Colore del torneo</legend>
              <div className="palette__options">
                {COLOR_PRESETS.map(preset => {
                  const on = fields.brand_color.toLowerCase() === preset.color.toLowerCase();
                  return <button key={preset.name} type="button" className="palette__option" aria-pressed={on} onClick={() => setFields(f => ({ ...f, brand_color: preset.color }))}>
                    <span className="palette__swatch" style={{ backgroundColor: preset.color }} aria-hidden="true">{on && <CheckRoundedIcon fontSize="small" />}</span>{preset.name}
                  </button>;
                })}
                <label className="palette__option palette__custom">
                  <input type="color" value={HEX_COLOR.test(fields.brand_color) ? fields.brand_color : '#173d32'} onChange={e => setFields(f => ({ ...f, brand_color: e.target.value }))} aria-label="Scegli un colore personalizzato" />
                  Personalizzato
                </label>
              </div>
            </fieldset>
            <TextField label="Colore (#RRGGBB)" value={fields.brand_color} onChange={e => setFields(f => ({ ...f, brand_color: e.target.value }))} disabled={!editable} slotProps={{ htmlInput: { pattern: '#[0-9a-fA-F]{6}', maxLength: 7 } }} />
            <ImageField label="Logo del torneo" kind="logo" tenantId={tenant.id} field="tenant_logo" value={fields.logo_url} disabled={!editable}
              onChange={url => setFields(f => ({ ...f, logo_url: url }))} onUploaded={url => settingsUploads.current.add(url)} />
            <ImageField label="Immagine di copertina" kind="cover" tenantId={tenant.id} field="tenant_cover" value={fields.cover_url} disabled={!editable}
              onChange={url => setFields(f => ({ ...f, cover_url: url }))} onUploaded={url => settingsUploads.current.add(url)} />
            {editable && <Button variant="contained" type="submit" disabled={saving} sx={{ alignSelf: 'flex-start' }}>{saving ? 'Salvataggio…' : 'Salva impostazioni'}</Button>}
          </Stack></form>
          <div className="settings__preview" aria-label="Anteprima intestazione">
            <div className="preview-hero" style={{ ['--tenant' as string]: HEX_COLOR.test(fields.brand_color) ? fields.brand_color : accent }}>
              <b>{fields.name || 'Il tuo torneo'}</b><span>{fields.tagline || 'Slogan del torneo'}</span>
            </div>
            <p className="muted">Anteprima indicativa dell’intestazione pubblica.</p>
          </div>
        </div>
      </div>}

      {section === 'modules' && isEvent && <div>
        <header className="ws-head"><div className="ws-head__text"><h1>Moduli</h1><p>Le funzioni base del torneo di un giorno sono gratis. Aggiungi solo gli extra che ti servono.</p></div></header>
        <EventModules tenant={tenant} features={features} canBuy={canBuy} onChanged={refresh} />
      </div>}
      {section === 'modules' && !isEvent && paymentsEnabled && <div>
        <header className="ws-head"><div className="ws-head__text"><h1>Piano e moduli</h1><p>Scegli durata e moduli e paga in modo sicuro su Stripe. Le funzioni base sono sempre incluse.</p></div></header>
        <PlanCheckout tenantId={tenant.id} tenantStatus={tenant.status} canBuy={canBuy} features={features} initial={(location.state as { plan?: { months: number; modules: string[] } } | null)?.plan} />
      </div>}
      {section === 'modules' && !isEvent && !paymentsEnabled && <div>
        <header className="ws-head"><div className="ws-head__text"><h1>Moduli</h1><p>Le funzioni base sono incluse. I moduli aggiuntivi si richiedono qui e si attivano solo dopo conferma.</p></div></header>
        <div className="grant-list">{MODULES.map(module => {
          const active = enabled(module.code);
          const picked = upgrade.includes(module.code);
          return <div className={'grant glass' + (active ? ' is-active' : '') + (picked ? ' is-picked' : '')} key={module.code}>
            <div className="grant__text"><b>{module.name}</b><small>{module.description}</small></div>
            {active ? <span className="pill pill--active">{module.core ? 'Incluso' : 'Attivo'}</span>
              : <span className="grant__price">{formatEuro(module.monthly)}/mese</span>}
            {!active && editable && <Button size="small" variant={picked ? 'contained' : 'outlined'} aria-pressed={picked}
              onClick={() => setUpgrade(prev => prev.includes(module.code) ? prev.filter(code => code !== module.code) : [...prev, module.code])}>{picked ? 'Selezionato' : 'Seleziona'}</Button>}
          </div>;
        })}</div>
        {upgrade.length > 0 && <div className="panel glass upgrade">
          <h2>Richiedi attivazione</h2>
          <div className="upgrade__terms" role="radiogroup" aria-label="Durata">{[1, 3, 6, 12].map(months => <button key={months} type="button" role="radio" aria-checked={upgradeMonths === months}
            className={'chip-link' + (upgradeMonths === months ? ' is-active' : '')} onClick={() => setUpgradeMonths(months)}>{months} {months === 1 ? 'mese' : 'mesi'}</button>)}</div>
          <DurationStepper months={upgradeMonths} onChange={setUpgradeMonths} />
          <p>Stima per i moduli selezionati: <b>{formatEuro(estimate(upgradeMonths, upgrade).total - estimate(upgradeMonths, []).total)}</b> per {upgradeMonths} {upgradeMonths === 1 ? 'mese' : 'mesi'}.</p>
          <p className="muted">Inviando la richiesta non attivi nulla e non paghi nulla: verrai ricontattato con le condizioni definitive.</p>
          <Button variant="contained" disabled={upgrading} onClick={() => void askUpgrade()}>{upgrading ? 'Invio…' : 'Invia richiesta'}</Button>
        </div>}
      </div>}

      {selectedEditor && (enabled(selectedEditor.feature)
        ? <CrudEditor tenantId={tenant.id} config={selectedEditor} editable={editable} eventDate={isEvent ? tenant.event_date : null} />
        : <div className="empty-state glass"><LockOutlinedIcon sx={{ fontSize: 36 }} /><h2>Modulo non ancora attivo</h2><p>“{selectedEditor.label}” fa parte dei moduli aggiuntivi. {paymentsEnabled ? 'Puoi attivarlo dalla sezione Moduli.' : 'Puoi richiederne l’attivazione dalla sezione Moduli.'}</p><Button variant="contained" component={RouterLink} to={base + '/modules'}>Vai ai moduli</Button></div>)}
      {!['overview', 'settings', 'modules'].includes(section) && !selectedEditor && <div className="empty-state glass"><h2>Sezione non trovata</h2><Button component={RouterLink} to={base}>Torna alla panoramica</Button></div>}
    </div>
  </div>;
}
