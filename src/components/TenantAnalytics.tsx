/*
 * Data-driven analytics composition inspired by 21st.dev:
 * Advanced Stats (uilayout.contact) and Charts & KPI Cards (uvain).
 * Custom chart avoids bundled mock data or extra charting dependencies.
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Skeleton } from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import { client, friendlyError } from '../lib/supabase';

type Match = { id: string; status: string; kickoff_at: string | null };
type Totals = { teams: number; players: number; matches: Match[]; competitions: number };
const states = [
  { id: 'finished', label: 'Terminate', color: 'var(--stat-done)' },
  { id: 'live', label: 'In corso', color: 'var(--stat-live)' },
  { id: 'scheduled', label: 'In programma', color: 'var(--stat-planned)' },
] as const;

export function TenantAnalytics({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<Totals | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    const fetchTotals = async () => {
      try {
        const sb = client();
        const [teams, players, matches, competitions] = await Promise.all([
          sb.from('teams').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
          sb.from('players').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
          sb.from('matches').select('id,status,kickoff_at').eq('tenant_id', tenantId).limit(1000),
          sb.from('competitions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        ]);
        const issue = [teams, players, matches, competitions].find(result => result.error)?.error;
        if (issue) throw issue;
        if (active) setData({
          teams: teams.count ?? 0, players: players.count ?? 0,
          matches: (matches.data ?? []) as Match[], competitions: competitions.count ?? 0,
        });
      } catch (cause) {
        if (active) setError(friendlyError(cause));
      }
    };
    void fetchTotals();
    return () => { active = false; };
  }, [tenantId]);

  const distribution = useMemo(() => {
    if (!data) return [];
    return states.map(state => ({
      ...state, count: data.matches.filter(match => match.status === state.id).length,
    }));
  }, [data]);

  if (error) return <Alert severity="warning" sx={{ mb: 3 }}>Statistiche non disponibili: {error}</Alert>;
  if (!data) return <div className="analytics-loading" aria-label="Caricamento statistiche"><Skeleton variant="rounded" height={112} /><Skeleton variant="rounded" height={112} /><Skeleton variant="rounded" height={112} /></div>;
  const fixtures = data.matches.length;
  const overview = [
    { label: 'Competizioni', value: data.competitions, icon: <CalendarMonthRoundedIcon /> },
    { label: 'Squadre', value: data.teams, icon: <GroupsRoundedIcon /> },
    { label: 'Giocatori', value: data.players, icon: <SportsSoccerRoundedIcon /> },
    { label: 'Partite terminate', value: distribution[0]?.count ?? 0, icon: <CheckCircleOutlineRoundedIcon /> },
  ];

  return <section className="tenant-analytics" aria-label="Statistiche reali del torneo">
    <div className="tenant-analytics__stats">
      {overview.map(item => <div key={item.label} className="tenant-analytics__metric liquid-glass">
        <div className="tenant-analytics__metric-head">{item.icon}<span>{item.label}</span></div>
        <strong>{item.value.toLocaleString('it-IT')}</strong>
      </div>)}
    </div>
    <div className="tenant-analytics__distribution liquid-glass">
      <div className="tenant-analytics__header">
        <h4>Stato delle partite</h4>
        <span>{fixtures.toLocaleString('it-IT')} incontri registrati</span>
      </div>
      {fixtures === 0
        ? <p className="tenant-analytics__empty">Aggiungi le prime partite per visualizzare l'andamento del torneo.</p>
        : <div className="tenant-analytics__bars">{distribution.map(state => {
          const percentage = fixtures > 0 ? Math.round(state.count / fixtures * 100) : 0;
          return <div className="tenant-analytics__barrow" key={state.id}>
            <span className="tenant-analytics__barlabel">{state.label}</span>
            <div className="tenant-analytics__track" role="meter" aria-label={state.label}
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
              <div className="tenant-analytics__fill" style={{ width: percentage + '%', background: state.color }} />
            </div>
            <b>{state.count}</b>
          </div>;
        })}</div>}
    </div>
  </section>;
}
