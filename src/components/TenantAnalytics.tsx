/*
 * Data-driven analytics composition inspired by 21st.dev:
 * Advanced Stats (uilayout.contact) and Charts & KPI Cards (uvain).
 * Custom chart avoids bundled mock data or extra charting dependencies.
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Skeleton } from '@mui/material';
import { motion, useReducedMotion } from 'motion/react';
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
  { id: 'postponed', label: 'Rinviate', color: 'var(--stat-postponed)' },
] as const;

export function TenantAnalytics({ tenantId }: { tenantId: string }) {
  const reduce = useReducedMotion();
  const [data, setData] = useState<Totals | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    const fetchTotals = async () => {
      try {
        const sb = client();
        const [teams, players, competitions] = await Promise.all([
          sb.from('teams').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
          sb.from('players').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
          sb.from('competitions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        ]);
        const issue = [teams, players, competitions].find(result => result.error)?.error;
        if (issue) throw issue;
        const allMatches: Match[] = [];
        let offset = 0;
        while (true) {
          const response = await sb.from('matches').select('id,status,kickoff_at')
            .eq('tenant_id', tenantId).order('kickoff_at', { ascending: false })
            .range(offset, offset + 999);
          if (response.error) throw response.error;
          const page = (response.data ?? []) as Match[];
          allMatches.push(...page);
          if (page.length < 1000) break;
          offset += 1000;
        }
        if (active) setData({
          teams: teams.count ?? 0, players: players.count ?? 0,
          matches: allMatches, competitions: competitions.count ?? 0,
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

  // Matches per week for the last 10 weeks + next 2 (real kickoff dates only).
  const weekly = useMemo(() => {
    if (!data) return [] as { label: string; count: number; future: boolean }[];
    const week = 7 * 86_400_000; const now = Date.now();
    const start = now - 9 * week;
    return Array.from({ length: 12 }, (_, i) => {
      const from = start + i * week - week / 2, to = from + week;
      const count = data.matches.filter(m => { const t = m.kickoff_at ? new Date(m.kickoff_at).getTime() : NaN; return t >= from && t < to; }).length;
      return { label: new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short' }).format(new Date(from + week / 2)), count, future: from + week / 2 > now };
    });
  }, [data]);

  if (error) return <Alert severity="warning" sx={{ mb: 3 }}>Statistiche non disponibili: {error}</Alert>;
  if (!data) return <div className="kpis" aria-busy="true" aria-label="Caricamento statistiche">{[0, 1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={128} sx={{ borderRadius: '20px' }} />)}</div>;
  const fixtures = data.matches.length;
  const overview = [
    { label: 'Competizioni', value: data.competitions, icon: <CalendarMonthRoundedIcon /> },
    { label: 'Squadre', value: data.teams, icon: <GroupsRoundedIcon /> },
    { label: 'Giocatori', value: data.players, icon: <SportsSoccerRoundedIcon /> },
    { label: 'Partite terminate', value: distribution[0]?.count ?? 0, icon: <CheckCircleOutlineRoundedIcon /> },
  ];
  const peak = Math.max(1, ...weekly.map(w => w.count));
  let offset = 0;
  const R = 54, C = 2 * Math.PI * R;

  return <section className="analytics" aria-label="Statistiche del torneo">
    <div className="kpis">
      {overview.map((item, index) => <motion.div key={item.label} className="kpi glass"
        initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05, duration: .5, ease: [.16, 1, .3, 1] }}>
        <div className="kpi__head"><span className="kpi__icon" aria-hidden="true">{item.icon}</span>{item.label}</div>
        <strong className="display-num">{item.value.toLocaleString('it-IT')}</strong>
      </motion.div>)}
    </div>
    <div className="analytics__row">
      <div className="chart-card glass">
        <div className="chart-card__head"><h2>Stato delle partite</h2><span>{fixtures.toLocaleString('it-IT')} incontri</span></div>
        {fixtures === 0 ? <p className="chart-card__empty">Aggiungi le prime partite per vedere l’andamento del torneo.</p> :
          <div className="donut-wrap">
            <svg viewBox="0 0 140 140" className="donut" role="img" aria-label={distribution.map(s => s.label + ' ' + s.count).join(', ')}>
              <circle cx="70" cy="70" r={R} className="donut__track" />
              {distribution.filter(s => s.count > 0).map(state => {
                const len = state.count / fixtures * C; const dash = `${len} ${C - len}`; const el = <circle key={state.id} cx="70" cy="70" r={R}
                  stroke={state.color} strokeDasharray={dash} strokeDashoffset={-offset} className="donut__seg" />;
                offset += len; return el;
              })}
              <text x="70" y="66" className="donut__num">{Math.round((distribution[0]?.count ?? 0) / fixtures * 100)}%</text>
              <text x="70" y="86" className="donut__label">giocate</text>
            </svg>
            <ul className="legend">{distribution.map(state => <li key={state.id}><i style={{ background: state.color }} />{state.label}<b>{state.count}</b></li>)}</ul>
          </div>}
      </div>
      <div className="chart-card glass">
        <div className="chart-card__head"><h2>Partite per settimana</h2><span>ultime 10 · prossime 2</span></div>
        {fixtures === 0 ? <p className="chart-card__empty">Il calendario apparirà qui.</p> :
          <div className="weekly" role="img" aria-label={'Partite per settimana: ' + weekly.map(w => w.label + ' ' + w.count).join(', ')}>
            {weekly.map((w, i) => <div key={i} className={'weekly__col' + (w.future ? ' is-future' : '')}>
              <motion.i initial={reduce ? false : { scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: .1 + i * .03, duration: .6, ease: [.16, 1, .3, 1] }}
                style={{ height: Math.max(4, w.count / peak * 100) + '%' }} />
              <span>{i % 2 === 0 ? w.label : ''}</span>
            </div>)}
          </div>}
      </div>
    </div>
  </section>;
}
