/*
 * Superadmin dashboard — structure adapted from 21st.dev admin-panel / analytics
 * templates: glass sidebar grouped by domain, KPI row, chart card, dense data grid.
 * Every operation goes through audited SQL functions (see 202611030001_superadmin.sql).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Link as RouterLink, NavLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, CircularProgress, MenuItem, TextField } from '@mui/material';
import { motion, useReducedMotion } from 'motion/react';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import ExtensionRoundedIcon from '@mui/icons-material/ExtensionRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { client, friendlyError } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { ErrorView } from '../pages/ErrorPage';
import { trackSpotlight } from '../components/MarketingMotion';
import { AdminTable } from './AdminTable';
import { GROUPS, TABLES, valueLabel, type AdminSchema } from './adminConfig';

type Stats = {
  users: number; users_7d: number; tenants: number; tenants_by_status: Record<string, number>;
  matches: number; players: number; open_requests: number; pending_upgrades: number;
  signups_by_week: { week: string; count: number }[];
};

function Overview() {
  const reduce = useReducedMotion();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    void Promise.resolve(client().rpc('admin_stats')).then(({ data, error: issue }) => {
      if (issue) setError(friendlyError(issue)); else setStats(data as Stats);
    });
  }, []);
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!stats) return <div className="center-min"><CircularProgress aria-label="Caricamento" /></div>;
  const kpis: { label: string; value: number; sub?: string; icon: ReactNode; to: string }[] = [
    { label: 'Utenti', value: stats.users, sub: `+${stats.users_7d} negli ultimi 7 giorni`, icon: <PeopleAltRoundedIcon />, to: '/admin/profiles' },
    { label: 'Tornei', value: stats.tenants, sub: Object.entries(stats.tenants_by_status).map(([k, v]) => `${v} ${valueLabel(k).toLowerCase()}`).join(' · ') || 'nessuno', icon: <EmojiEventsRoundedIcon />, to: '/admin/tenants' },
    { label: 'Partite', value: stats.matches, sub: `${stats.players} giocatori`, icon: <SportsSoccerRoundedIcon />, to: '/admin/matches' },
    { label: 'Richieste aperte', value: stats.open_requests, sub: 'supporto e privacy', icon: <SupportAgentRoundedIcon />, to: '/admin/support_requests' },
    { label: 'Moduli da valutare', value: stats.pending_upgrades, sub: 'richieste in attesa', icon: <ExtensionRoundedIcon />, to: '/admin/upgrade_requests' },
  ];
  const peak = Math.max(1, ...stats.signups_by_week.map(w => w.count));
  return <>
    <header className="workspace__head"><h1>Panoramica della piattaforma</h1><p>Numeri reali dal database, aggiornati a ogni apertura.</p></header>
    <div className="kpis kpis--admin">
      {kpis.map((kpi, index) => <motion.div key={kpi.label} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05, duration: .5, ease: [.16, 1, .3, 1] }}>
        <RouterLink to={kpi.to} className="kpi kpi--link glass spotlight" onPointerMove={trackSpotlight}>
          <div className="kpi__head"><span className="kpi__icon" aria-hidden="true">{kpi.icon}</span>{kpi.label}</div>
          <strong className="display-num">{kpi.value.toLocaleString('it-IT')}</strong>
          {kpi.sub && <small>{kpi.sub}</small>}
        </RouterLink>
      </motion.div>)}
    </div>
    <div className="chart-card glass" style={{ marginTop: 14 }}>
      <div className="chart-card__head"><h2>Nuovi utenti per settimana</h2><span>ultime 12 settimane</span></div>
      {stats.signups_by_week.length === 0 ? <p className="chart-card__empty">Nessuna registrazione nel periodo.</p> :
        <div className="weekly" role="img" aria-label={'Registrazioni: ' + stats.signups_by_week.map(w => w.week + ' ' + w.count).join(', ')}>
          {stats.signups_by_week.map(w => <div key={w.week} className="weekly__col">
            <motion.i initial={reduce ? false : { scaleY: 0 }} animate={{ scaleY: 1 }} style={{ height: Math.max(4, w.count / peak * 100) + '%' }} />
            <span>{new Date(w.week).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</span>
          </div>)}
        </div>}
    </div>
    <h2 className="workspace__subhead">Schede</h2>
    <div className="quick-grid">{Object.entries(TABLES).map(([key, meta]) => <RouterLink key={key} to={'/admin/' + key} className="quick-card glass spotlight" onPointerMove={trackSpotlight}>
      <span className="quick-card__text"><b>{meta.label}</b><small>{GROUPS.find(g => g.id === meta.group)?.label}</small></span>
      <ArrowForwardRoundedIcon className="quick-card__arrow" />
    </RouterLink>)}</div>
  </>;
}

export function AdminDashboard() {
  const { table } = useParams();
  const { isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const [schema, setSchema] = useState<AdminSchema | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    void Promise.resolve(client().rpc('admin_schema')).then(({ data, error: issue }) => {
      if (issue) setError(friendlyError(issue)); else setSchema(data as AdminSchema);
    });
  }, [isAdmin]);

  if (isAdmin === null) return <div className="center-screen"><CircularProgress aria-label="Verifica permessi" /></div>;
  if (!isAdmin) return <ErrorView code="403" compact detail="Questa area è riservata al superadmin della piattaforma." />;
  if (table && !TABLES[table]) return <ErrorView code="404" compact detail="Questa scheda non esiste." />;

  return <div className="workspace workspace--admin">
    <aside className="workspace__side glass" aria-label="Schede superadmin">
      <div className="side-identity">
        <span className="tenant-card__avatar admin-avatar"><AdminPanelSettingsRoundedIcon /></span>
        <div><b>{profile?.username ? '@' + profile.username : 'Superadmin'}</b><small>Superadmin · accesso completo</small></div>
      </div>
      <nav className="side-nav">
        <NavLink to="/admin" end className={({ isActive }) => 'side-link' + (isActive ? ' is-active' : '')}><SpaceDashboardRoundedIcon fontSize="small" /><span>Panoramica</span></NavLink>
        {GROUPS.map(group => <div key={group.id}>
          <p className="side-nav__title">{group.label}</p>
          {Object.entries(TABLES).filter(([, meta]) => meta.group === group.id).map(([key, meta]) =>
            <NavLink key={key} to={'/admin/' + key} className={({ isActive }) => 'side-link' + (isActive ? ' is-active' : '')}><span className="side-link__dot" aria-hidden="true" /><span>{meta.label}</span></NavLink>)}
        </div>)}
      </nav>
    </aside>
    <div className="workspace__main">
      <div className="admin-mobile-nav">
        <TextField select size="small" label="Scheda" value={table ?? 'overview'} onChange={event => navigate(event.target.value === 'overview' ? '/admin' : '/admin/' + event.target.value)}>
          <MenuItem value="overview">Panoramica</MenuItem>
          {Object.entries(TABLES).map(([key, meta]) => <MenuItem key={key} value={key}>{meta.label}</MenuItem>)}
        </TextField>
      </div>
      {error ? <Alert severity="error">{error} — hai eseguito la migrazione 202611030001_superadmin.sql?</Alert>
        : !schema ? <div className="center-min"><CircularProgress aria-label="Caricamento schema" /></div>
        : table ? <AdminTable key={table} table={table} schema={schema} /> : <Overview />}
    </div>
  </div>;
}
