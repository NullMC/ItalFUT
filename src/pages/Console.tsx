import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useAuth } from '../auth/AuthProvider';
import { MODULES, CORE, EXTRA, estimate, formatEuro } from '../lib/catalog';
import { client, friendlyError } from '../lib/supabase';
import type { FeatureCode, MemberRole, Tenant, TenantFeature } from '../lib/types';
import { CrudEditor, EDITORS } from '../components/CrudEditor';
import { TenantAnalytics } from '../components/TenantAnalytics';

type Owned = { role: MemberRole; tenants: Tenant | null };
type PlanDraft = { months: number; modules: FeatureCode[] };
const COLOR_PRESETS = [
  { name: 'Stadium', color: '#173d32', source: 'ItalFUT' },
  { name: 'Sea Green', color: '#227472', source: '21st.dev' },
  { name: 'Green Notes', color: '#0f7058', source: '21st.dev' },
] as const;
function draft(): PlanDraft {
  try {
    const value = JSON.parse(sessionStorage.getItem('italfut_configuration') ?? '{}') as Partial<PlanDraft>;
    return { months: [1,3,6,12].includes(Number(value.months)) ? Number(value.months) : 1, modules: (value.modules ?? []).filter(code => EXTRA.some(m => m.code === code)) };
  } catch { return { months: 1, modules: [] }; }
}
function formatSlug(text: string) {
  return text.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 42);
}

export function ConsoleHome() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [owned, setOwned] = useState<Owned[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const plan = draft();
  const quote = estimate(plan.months, plan.modules);
  const load = async () => {
    if (!session) return;
    const { data, error: issue } = await client().from('tenant_members').select('role,tenants(*)').eq('user_id', session.user.id);
    if (issue) throw issue;
    setOwned((data ?? []) as unknown as Owned[]);
  };
  useEffect(() => {
    let live = true;
    if (!session) return;
    setLoading(true);
    void Promise.resolve(client().from('tenant_members').select('role,tenants(*)').eq('user_id', session.user.id))
      .then(({ data, error: issue }) => {
        if (!live) return;
        if (issue) setError(issue.message);
        else setOwned((data ?? []) as unknown as Owned[]);
      }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [session?.user?.id]);

  const create = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const cleanSlug = formatSlug(slug || name);
      const { error: issue } = await client().rpc('create_tenant', {
        p_name: name.trim(), p_slug: cleanSlug, p_months: plan.months, p_features: plan.modules,
      });
      if (issue) throw issue;
      sessionStorage.removeItem('italfut_configuration');
      await load();
      setCreating(false);
      navigate('/console/' + cleanSlug);
    } catch (cause) { setError(friendlyError(cause)); }
    finally { setBusy(false); }
  };
  return <div className="console-home"><Container maxWidth="lg">
    <div className="console-welcome"><div><Typography variant="h3">I tuoi tornei</Typography><p>Gestisci le tue competizioni o creane una nuova.</p></div><Stack direction="row" gap={1} flexWrap="wrap"><Button component={RouterLink} to="/account" variant="text">Account e dati</Button><Button variant="outlined" onClick={() => void signOut()} startIcon={<LogoutRoundedIcon />}>Esci</Button><Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreating(true)}>Nuova piattaforma</Button></Stack></div>
    {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
    {loading ? <div className="center-min"><CircularProgress /></div> : owned.some(item => item.tenants) ? <div className="tenant-cards">
      {owned.filter(item => item.tenants).map(({ tenants: tenant, role }) => tenant && <button key={tenant.id} className="tenant-card liquid-glass" onClick={() => navigate('/console/' + tenant.slug)}>
        <span className="tenant-card-status"><span className={tenant.status === 'active' ? 'dot-active' : 'dot-wait'} />{tenant.status === 'active' ? 'Online' : tenant.status === 'draft' ? 'Bozza' : 'Sospesa'}</span>
        <strong>{tenant.name}</strong><small>/t/{tenant.slug} · {role}</small><span className="tenant-card-arrow"><ArrowForwardRoundedIcon /></span>
      </button>)}
    </div> : <div className="console-empty liquid-glass"><Typography variant="h5">Ancora nessun torneo</Typography><p>Crea il tuo primo spazio per gestire squadre, incontri e risultati.</p><Button variant="contained" onClick={() => setCreating(true)} startIcon={<AddRoundedIcon />}>Crea un torneo</Button></div>}
    <Dialog open={creating} onClose={() => !busy && setCreating(false)} fullWidth maxWidth="sm"><form onSubmit={create}>
      <DialogTitle fontWeight={800}>Diamo un nome al tuo torneo</DialogTitle><DialogContent><Stack spacing={2.5} sx={{ pt: 1 }}>
        <TextField label="Nome della piattaforma" value={name} onChange={e => { setName(e.target.value); if (!slugEdited) setSlug(formatSlug(e.target.value)); }} required />
        <TextField label="Indirizzo pubblico" value={slug} onChange={e => { setSlugEdited(true); setSlug(formatSlug(e.target.value)); }} helperText={window.location.origin + '/t/' + (slug || 'nome-torneo')} required />
        <Alert severity="info">Configurazione: {plan.months} {plan.months === 1 ? 'mese' : 'mesi'}, {plan.modules.length} moduli opzionali. Preventivo illustrativo: {formatEuro(quote.total)}. Nessun addebito.</Alert>
        {error && <Alert severity="error">{error}</Alert>}
      </Stack></DialogContent><DialogActions sx={{ p: 3 }}><Button onClick={() => setCreating(false)}>Annulla</Button><Button variant="contained" type="submit" disabled={busy}>{busy ? 'Creazione…' : 'Crea piattaforma'}</Button></DialogActions>
    </form></Dialog>
  </Container></div>;
}

export function TenantConsole() {
  const { slug, section = 'overview' } = useParams();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [role, setRole] = useState<MemberRole | null>(null);
  const [features, setFeatures] = useState<TenantFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [upgrade, setUpgrade] = useState<FeatureCode[]>([]);
  const [upgradeMonths, setUpgradeMonths] = useState(1);
  const [upgrading, setUpgrading] = useState(false);
  const [fields, setFields] = useState({ name: '', tagline: '', brand_color: '#153e35', logo_url: '', cover_url: '' });
  const [saving, setSaving] = useState(false);
  const refresh = async () => {
    if (!slug || !session) return;
    const sb = client();
    const { data: found, error: issue } = await sb.from('tenants').select('*').eq('slug', slug).maybeSingle();
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
    setFields({ name: found.name, tagline: found.tagline ?? '', brand_color: found.brand_color ?? '#153e35', logo_url: found.logo_url ?? '', cover_url: found.cover_url ?? '' });
  };
  useEffect(() => {
    let live = true;
    setLoading(true); setError('');
    const start = async () => { try { await refresh(); } catch (cause) { if (live) setError(friendlyError(cause)); } finally { if (live) setLoading(false); } };
    void start();
    return () => { live = false; };
  }, [slug, session?.user?.id]);
  const enabled = (code: FeatureCode) => features.some(f => f.code === code && f.enabled && (!f.ends_at || new Date(f.ends_at).getTime() > Date.now()));
  const editable = role === 'owner' || role === 'admin' || role === 'editor';
  const selectedEditor = EDITORS.find(item => item.key === section);
  const saveSettings = async (event: FormEvent) => {
    event.preventDefault(); if (!tenant) return;
    setError(''); setSaving(true);
    try {
      const { error: issue } = await client().from('tenants').update(fields).eq('id', tenant.id);
      if (issue) throw issue;
      await refresh();
    } catch (cause) { setError(friendlyError(cause)); }
    finally { setSaving(false); }
  };
  const askUpgrade = async () => {
    if (!tenant || !upgrade.length) return;
    setUpgrading(true); setError('');
    try {
      const { error: issue } = await client().rpc('request_upgrade', { p_tenant_id: tenant.id, p_months: upgradeMonths, p_features: upgrade });
      if (issue) throw issue;
      setUpgrade([]);
      window.alert('Richiesta registrata. I moduli restano bloccati fino all’attivazione amministrativa.');
    } catch (cause) { setError(friendlyError(cause)); }
    finally { setUpgrading(false); }
  };
  if (loading) return <div className="center-screen"><CircularProgress /></div>;
  if (!tenant || !role) return <Container maxWidth="md" sx={{ py: 10 }}><Alert severity="error">Piattaforma non trovata o accesso non autorizzato.</Alert><Button onClick={() => navigate('/console')}>Torna alla console</Button></Container>;
  return <div className="workspace">
    <aside className="workspace-sidebar">
      <div className="workspace-back"><Button onClick={() => navigate('/console')} size="small">← Le tue piattaforme</Button></div>
      <div className="workspace-identity"><div className="workspace-avatar" style={{ backgroundColor: tenant.brand_color }}>{tenant.name.slice(0, 1).toUpperCase()}</div><div><b>{tenant.name}</b><small>{tenant.slug}</small></div></div>
      <nav className="workspace-nav" aria-label="Gestione del torneo"><div className="workspace-nav-title">Il torneo</div>
        <button aria-current={section === 'overview' ? 'page' : undefined} className={section === 'overview' ? 'active' : ''} onClick={() => navigate('/console/' + slug)}><DashboardRoundedIcon fontSize="small" />Dashboard</button>
        <button aria-current={section === 'settings' ? 'page' : undefined} className={section === 'settings' ? 'active' : ''} onClick={() => navigate('/console/' + slug + '/settings')}><SettingsRoundedIcon fontSize="small" />Aspetto e impostazioni</button>
        <div className="workspace-nav-title">Contenuti</div>
        {EDITORS.map(item => <button key={item.key} aria-current={section === item.key ? 'page' : undefined} className={section === item.key ? 'active' : ''} onClick={() => navigate('/console/' + slug + '/' + item.key)}><span className="workspace-nav-dot" />{item.label}{!enabled(item.feature) && <LockOutlinedIcon sx={{ fontSize: 15, ml: 'auto' }} />}</button>)}
        <div className="workspace-nav-title">Funzionalità</div>
        <button aria-current={section === 'modules' ? 'page' : undefined} className={section === 'modules' ? 'active' : ''} onClick={() => navigate('/console/' + slug + '/modules')}><AddRoundedIcon fontSize="small" />Moduli e upgrade</button>
      </nav><div className="workspace-side-bottom">
        <Button component={RouterLink} to="/account" color="inherit" size="small">Account e dati</Button>
        <Button onClick={() => void signOut()} startIcon={<LogoutRoundedIcon />} color="inherit" size="small">Esci</Button>
      </div>
    </aside>
    <div className="workspace-content">
      <div className="workspace-top"><span><span className={tenant.status === 'active' ? 'dot-active' : 'dot-wait'} /> {tenant.status === 'active' ? 'Piattaforma online' : tenant.status === 'draft' ? 'Bozza privata' : 'Sospesa'}</span><div className="workspace-top-actions"><Button component={RouterLink} to={'/t/' + tenant.slug} target="_blank" rel="noopener noreferrer" endIcon={<ArrowOutwardRoundedIcon />}>Anteprima sito</Button></div></div>
      <div className="workspace-inner">
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {section === 'overview' && <>
          <div className="workspace-intro"><Typography variant="h3">Dashboard</Typography><p>{tenant.name} · Gestisci i contenuti del torneo.</p></div>
          <TenantAnalytics tenantId={tenant.id} />
          <div className="workspace-overview-strip liquid-glass">
            <div><strong>{tenant.name}</strong><span>Torneo</span></div>
            <div><strong>{features.filter(f => enabled(f.code)).length}</strong><span>Moduli attivi</span></div>
            <Button variant="outlined" onClick={() => navigate('/console/' + slug + '/settings')} endIcon={<ArrowForwardRoundedIcon />}>Impostazioni</Button>
          </div>
          <div className="quick-section"><Typography variant="h5">Gestione rapida</Typography><div className="quick-grid">{EDITORS.filter(e => CORE.includes(e.feature)).slice(0, 5).map(item => <button key={item.key} onClick={() => navigate('/console/' + slug + '/' + item.key)}><span>{item.label}</span><ArrowForwardRoundedIcon fontSize="small" /></button>)}</div></div>
          {tenant.status !== 'active' && <Alert severity="info" sx={{ mt: 4 }}>Spazio in bozza. Puoi preparare i contenuti, ma il sito non sarà pubblico fino all'attivazione.</Alert>}
        </>}
        {section === 'settings' && <div className="settings-panel"><Typography variant="h4">Identità della piattaforma</Typography><p>Queste impostazioni personalizzano il sito pubblico del tuo torneo.</p>
          <form onSubmit={saveSettings}><Stack spacing={2.5} sx={{ maxWidth: 650, mt: 4 }}>
            <TextField label="Nome della piattaforma" required value={fields.name} onChange={e => setFields(f => ({ ...f, name: e.target.value }))} disabled={!editable} />
            <TextField label="Slogan" value={fields.tagline} onChange={e => setFields(f => ({ ...f, tagline: e.target.value }))} disabled={!editable} />
            <fieldset className="palette-picker" disabled={!editable}>
              <legend>Colore del torneo</legend>
              <div className="palette-picker__options" role="group" aria-label="Colori predefiniti">
                {COLOR_PRESETS.map(preset => <button
                  key={preset.name}
                  type="button"
                  className="palette-picker__option"
                  aria-pressed={fields.brand_color.toLowerCase() === preset.color.toLowerCase()}
                  onClick={() => setFields(f => ({ ...f, brand_color: preset.color }))}
                >
                  <span className="palette-picker__swatch" style={{ backgroundColor: preset.color }} aria-hidden="true">
                    {fields.brand_color.toLowerCase() === preset.color.toLowerCase() && <CheckRoundedIcon fontSize="small" />}
                  </span>
                  <span>{preset.name}</span>
                </button>)}
              </div>
            </fieldset>
            <TextField label="Colore personalizzato (#RRGGBB)" value={fields.brand_color} onChange={e => setFields(f => ({ ...f, brand_color: e.target.value }))} disabled={!editable} inputProps={{ pattern: '#[0-9a-fA-F]{6}' }} />
            <TextField label="URL logo" value={fields.logo_url} onChange={e => setFields(f => ({ ...f, logo_url: e.target.value }))} disabled={!editable} />
            <TextField label="URL immagine di copertina" value={fields.cover_url} onChange={e => setFields(f => ({ ...f, cover_url: e.target.value }))} disabled={!editable} />
            {editable && <Button variant="contained" type="submit" disabled={saving} sx={{ alignSelf: 'flex-start' }}>{saving ? 'Salvataggio…' : 'Salva impostazioni'}</Button>}
          </Stack></form>
        </div>}
        {section === 'modules' && <div className="modules-admin"><Typography variant="h4">Moduli e funzionalità</Typography><p>Le funzioni base sono incluse. Puoi richiedere lo sblocco dei moduli aggiuntivi.</p>
          <div className="grant-grid liquid-glass">{MODULES.map(module => {
            const active = enabled(module.code);
            return <div className={'grant-row ' + (active ? 'grant-active' : '')} key={module.code}>
              <div><b>{module.name}</b><small>{module.description}</small></div><div>{active ? <Chip color="success" size="small" icon={<CheckRoundedIcon />} label="Attivo" /> : <Chip variant="outlined" label={formatEuro(module.monthly) + '/mese'} size="small" />}</div>
              {!active && editable && <Button size="small" variant={upgrade.includes(module.code) ? 'contained' : 'outlined'} onClick={() => setUpgrade(prev => prev.includes(module.code) ? prev.filter(code => code !== module.code) : [...prev, module.code])}>{upgrade.includes(module.code) ? 'Selezionato' : 'Richiedi'}</Button>}
            </div>;
          })}</div>
          {upgrade.length > 0 && <div className="upgrade-panel"><Typography variant="h6">Richiedi upgrade</Typography><Stack direction="row" flexWrap="wrap" gap={1} sx={{ my: 2 }}>{[1,3,6,12].map(months => <Chip key={months} clickable color={upgradeMonths === months ? 'primary' : 'default'} variant={upgradeMonths === months ? 'filled' : 'outlined'} label={months + (months === 1 ? ' mese' : ' mesi')} onClick={() => setUpgradeMonths(months)} />)}</Stack>
            <Typography>Stima moduli richiesti: <b>{formatEuro(estimate(upgradeMonths, upgrade).total - estimate(upgradeMonths, []).total)}</b></Typography><Typography variant="caption" color="text.secondary">La richiesta non attiva automaticamente moduli e non effettua addebiti.</Typography>
            <Box mt={2}><Button variant="contained" disabled={upgrading} onClick={() => void askUpgrade()}>{upgrading ? 'Invio…' : 'Invia richiesta upgrade'}</Button></Box>
          </div>}
        </div>}
        {selectedEditor && (enabled(selectedEditor.feature)
          ? <CrudEditor tenantId={tenant.id} config={selectedEditor} editable={editable} />
          : <div className="locked-panel"><LockOutlinedIcon sx={{ fontSize: 40, mb: 2 }} /><Typography variant="h4">Modulo non ancora attivo</Typography><p>La funzione {selectedEditor.label} è disponibile come estensione. Richiedi l'attivazione nella sezione moduli.</p><Button variant="contained" onClick={() => navigate('/console/' + slug + '/modules')}>Scopri i moduli</Button></div>)}
      </div>
    </div>
  </div>;
}
