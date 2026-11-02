/*
 * Tournament overview. Structure adapted from the 21st.dev dashboard templates
 * (Settle — payment operations console; Studio Admin): KPI cards with an insight line
 * and sparkline, a main chart with range control and a metric strip, a right rail with
 * a stacked status bar and a timeline of the next fixtures. Hand-built SVG/CSS charts,
 * no charting dependency, real data only.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Skeleton } from '@mui/material';
import { motion, useReducedMotion } from 'motion/react';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { summarize, useTenantStats } from '../lib/useTenantStats';

const STATES = [
  { id: 'finished', label: 'Terminate', color: 'var(--stat-done)' },
  { id: 'live', label: 'In corso', color: 'var(--stat-live)' },
  { id: 'scheduled', label: 'In programma', color: 'var(--stat-planned)' },
  { id: 'postponed', label: 'Rinviate', color: 'var(--stat-postponed)' },
] as const;
const RANGES = [{ weeks: 8, label: '8 sett.' }, { weeks: 12, label: '12 sett.' }, { weeks: 24, label: '24 sett.' }] as const;
const WEEK = 7 * 86_400_000;
const dayFormat = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
const timeFormat = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });
const shortFormat = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short' });

/** Tiny trend line for KPI cards. */
function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values), w = 72, h = 26;
  const points = values.map((v, i) => [i / (values.length - 1) * w, h - 3 - v / max * (h - 6)]);
  const line = points.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
  return <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
    <path d={line + ` L ${w} ${h} L 0 ${h} Z`} className="sparkline__area" />
    <path d={line} className="sparkline__line" />
  </svg>;
}

type Kpi = { label: string; value: string; unit?: string; sub: ReactNode; icon: ReactNode; spark?: number[]; progress?: number };

export function TenantAnalytics({ tenantId, base }: { tenantId: string; base: string }) {
  const reduce = useReducedMotion();
  const { data, error } = useTenantStats(tenantId);
  const [range, setRange] = useState<number>(12);

  const s = useMemo(() => data ? summarize(data) : null, [data]);
  const teamName = useMemo(() => new Map((data?.teams ?? []).map(t => [t.id, t.name])), [data]);

  // Matches per week: past weeks + the next 2, by kickoff date (real dates only).
  const weekly = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    const first = now - (range - 3) * WEEK;
    return Array.from({ length: range }, (_, i) => {
      const from = first + i * WEEK - WEEK / 2, to = from + WEEK;
      const inWeek = data.matches.filter(m => { const t = m.kickoff_at ? new Date(m.kickoff_at).getTime() : NaN; return t >= from && t < to; });
      return { label: shortFormat.format(new Date(from + WEEK / 2)), played: inWeek.filter(m => m.status === 'finished').length, other: inWeek.filter(m => m.status !== 'finished').length, future: from + WEEK / 2 > now };
    });
  }, [data, range]);

  if (error) return <Alert severity="warning" sx={{ mb: 3 }}>Statistiche non disponibili: {error}</Alert>;
  if (!data || !s) return <div className="kpis" aria-busy="true" aria-label="Caricamento statistiche">{[0, 1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={142} sx={{ borderRadius: '20px' }} />)}</div>;

  const playedPct = s.total ? Math.round(s.finished / s.total * 100) : 0;
  const next = s.upcoming[0];
  const spark = weekly.map(w => w.played + w.other);
  const kpis: Kpi[] = [
    { label: 'Squadre', value: data.teams.length.toLocaleString('it-IT'), icon: <GroupsRoundedIcon />,
      sub: data.teams.length ? <><b>{data.players.toLocaleString('it-IT')}</b> giocatori · {Math.round(data.players / data.teams.length * 10) / 10} per squadra</> : 'Aggiungi le squadre del torneo' },
    { label: 'Partite giocate', value: s.finished.toLocaleString('it-IT'), unit: '/ ' + s.total, icon: <CheckCircleOutlineRoundedIcon />,
      progress: playedPct, sub: s.total ? <><b>{playedPct}%</b> del calendario completato</> : 'Nessuna partita in calendario', spark: weekly.map(w => w.played) },
    { label: 'Da giocare', value: s.upcoming.length.toLocaleString('it-IT'), icon: <EventRoundedIcon />, spark,
      sub: next ? <>Prossima <b>{dayFormat.format(new Date(next.kickoff_at!))}</b></> : s.unscheduled ? `${s.unscheduled} senza data` : 'Calendario da completare' },
    { label: 'Competizioni', value: data.competitions.toLocaleString('it-IT'), icon: <EmojiEventsRoundedIcon />,
      sub: s.postponed ? <><b>{s.postponed}</b> partite rinviate</> : s.unscheduled ? <><b>{s.unscheduled}</b> partite senza data</> : 'Stagioni, gironi e coppe' },
  ];
  const peak = Math.max(1, ...weekly.map(w => w.played + w.other));
  const ticks = [peak, Math.round(peak / 2), 0].filter((v, i, all) => all.indexOf(v) === i);
  const pastWeeks = weekly.filter(w => !w.future);
  const average = pastWeeks.length ? pastWeeks.reduce((sum, w) => sum + w.played, 0) / pastWeeks.length : 0;
  const counts = { finished: s.finished, live: s.live, scheduled: s.scheduled, postponed: s.postponed };

  return <section className="analytics" aria-label="Statistiche del torneo">
    <div className="kpis">
      {kpis.map((kpi, index) => <motion.div key={kpi.label} className="kpi glass"
        initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05, duration: .5, ease: [.16, 1, .3, 1] }}>
        <div className="kpi__head"><span className="kpi__icon" aria-hidden="true">{kpi.icon}</span><span className="kpi__label">{kpi.label}</span></div>
        <div className="kpi__row"><strong className="display-num kpi__value">{kpi.value}{kpi.unit && <small>{kpi.unit}</small>}</strong>
          {kpi.spark && <Sparkline values={kpi.spark} label={'Andamento ' + kpi.label.toLowerCase()} />}</div>
        {kpi.progress != null && <span className="kpi__progress" role="progressbar" aria-valuenow={kpi.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Calendario completato"><i style={{ width: kpi.progress + '%' }} /></span>}
        <span className="kpi__sub">{kpi.sub}</span>
      </motion.div>)}
    </div>

    <div className="overview-grid">
      <div className="chart-card chart-card--main glass">
        <div className="chart-card__head">
          <div><h2>Partite per settimana</h2><p>Per data del calcio d’inizio · le ultime due colonne sono le prossime settimane</p></div>
          <div className="segmented" role="group" aria-label="Periodo">
            {RANGES.map(r => <button key={r.weeks} type="button" aria-pressed={range === r.weeks} onClick={() => setRange(r.weeks)}>{r.label}</button>)}
          </div>
        </div>
        {s.total === 0 ? <p className="chart-card__empty">Il calendario apparirà qui appena aggiungi le prime partite.</p> : <>
          <div className="bars" data-dense={range > 12} style={{ ['--cols' as string]: weekly.length }}>
            <div className="bars__grid" aria-hidden="true">{ticks.map(t => <span key={t}><em>{t}</em></span>)}</div>
            <div className="bars__plot" role="img" aria-label={'Partite per settimana: ' + weekly.map(w => `${w.label} ${w.played + w.other}`).join(', ')}>
              {weekly.map((w, i) => <div key={i} className={'bars__col' + (w.future ? ' is-future' : '')} title={`Settimana del ${w.label}: ${w.played} giocate, ${w.other} da giocare`}>
                <motion.span className="bars__stack" initial={reduce ? false : { scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: .05 + i * .02, duration: .6, ease: [.16, 1, .3, 1] }}
                  style={{ height: (w.played + w.other) / peak * 100 + '%' }}>
                  {w.other > 0 && <i className="bars__other" style={{ flexGrow: w.other }} />}
                  {w.played > 0 && <i className="bars__played" style={{ flexGrow: w.played }} />}
                </motion.span>
                <span className="bars__label">{w.label}</span>
              </div>)}
            </div>
          </div>
          <div className="chart-legend" aria-hidden="true"><span><i className="is-played" />Giocate</span><span><i className="is-other" />Da giocare</span></div>
        </>}
        <dl className="metric-strip">
          <div><dt>Media a settimana</dt><dd>{average.toLocaleString('it-IT', { maximumFractionDigits: 1 })}<small>partite giocate</small></dd></div>
          <div><dt>In corso</dt><dd>{s.live}<small>in questo momento</small></dd></div>
          <div><dt>Rinviate</dt><dd>{s.postponed}<small>da riprogrammare</small></dd></div>
          <div><dt>Senza data</dt><dd>{s.unscheduled}<small>in calendario</small></dd></div>
        </dl>
      </div>

      <div className="overview-rail">
        <div className="chart-card glass">
          <div className="chart-card__head"><div><h2>Stato delle partite</h2><p>{s.total.toLocaleString('it-IT')} incontri in calendario</p></div></div>
          <div className="stack-bar" role="img" aria-label={STATES.map(st => `${st.label} ${counts[st.id]}`).join(', ')}>
            {s.total === 0 ? <i style={{ flexGrow: 1, background: 'var(--line)' }} /> : STATES.filter(st => counts[st.id] > 0).map(st => <i key={st.id} style={{ flexGrow: counts[st.id], background: st.color }} />)}
          </div>
          <ul className="legend">{STATES.map(st => <li key={st.id}><i style={{ background: st.color }} />{st.label}<b>{counts[st.id]}</b></li>)}</ul>
        </div>

        <div className="chart-card glass">
          <div className="chart-card__head"><div><h2>Prossimi incontri</h2><p>{s.upcoming.length ? `${s.upcoming.length} in programma` : 'Nessuna partita in programma'}</p></div>
            <RouterLink to={base + '/matches'} className="text-link">Calendario<ArrowForwardRoundedIcon /></RouterLink></div>
          {s.upcoming.length === 0 ? <p className="chart-card__empty">Aggiungi data e ora alle partite per vederle qui.</p> :
            <ol className="timeline">{s.upcoming.slice(0, 4).map(match => {
              const date = new Date(match.kickoff_at!);
              return <li key={match.id}>
                <span className="timeline__dot" aria-hidden="true" />
                <div className="timeline__body">
                  <b>{teamName.get(match.home_team_id ?? '') ?? 'Da definire'} – {teamName.get(match.away_team_id ?? '') ?? 'Da definire'}</b>
                  <small>{dayFormat.format(date)} · {timeFormat.format(date)}{match.matchday ? ' · ' + match.matchday : ''}</small>
                  {match.venue && <small className="timeline__venue"><PlaceRoundedIcon />{match.venue}</small>}
                </div>
              </li>;
            })}</ol>}
        </div>
      </div>
    </div>
  </section>;
}
