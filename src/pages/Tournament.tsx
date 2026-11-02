import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link as RouterLink, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Button, Chip, CircularProgress, Container, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import { client, configured, friendlyError } from '../lib/supabase';
import { AnimatedTabs } from '../components/AnimatedTabs';
import type { FeatureCode, Row, Tenant, TenantFeature } from '../lib/types';
import { ThemeToggle } from '../components/ThemeToggle';
import { VALUE_LABELS } from '../components/CrudEditor';
import { GlowField } from '../components/fx/Backdrop';
import { safeUrl } from '../lib/validation';
import { MadeBy } from '../components/SiteLayout';
import { ErrorView } from './ErrorPage';
import { useCookiePreferences } from '../components/CookieNotice';

type Data = Record<string, Row[]>;
const tables = ['competitions', 'teams', 'competition_teams', 'players', 'matches', 'match_events', 'staff_members', 'awards', 'sponsors', 'articles', 'market_slots', 'galleries'];
// Public pages request only the columns they display (anonymous users cannot read audit columns).
const PUBLIC_COLUMNS: Record<string, string> = {
  players: 'id,tenant_id,team_id,first_name,last_name,shirt_number,position,profile_image_url,age_category',
};
type Nav = { slug: string; label: string; feature: FeatureCode };
const navigation: Nav[] = [
  { slug: 'competizioni', label: 'Competizioni', feature: 'competitions' },
  { slug: 'partite', label: 'Partite', feature: 'matches' },
  { slug: 'classifiche', label: 'Classifiche', feature: 'standings' },
  { slug: 'squadre', label: 'Squadre', feature: 'teams' },
  { slug: 'statistiche', label: 'Statistiche', feature: 'statistics' },
  { slug: 'staff', label: 'Staff', feature: 'staff' },
  { slug: 'premi', label: 'Premi', feature: 'awards' },
  { slug: 'mercato', label: 'Mercato', feature: 'market' },
  { slug: 'articoli', label: 'News', feature: 'articles' },
  { slug: 'sponsor', label: 'Sponsor', feature: 'sponsors' },
  { slug: 'gallery', label: 'Gallery', feature: 'gallery' },
];
function dateOf(value: unknown) {
  if (!value) return 'Da definire';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}
function nameOf(row: Row | undefined) { return String(row?.name ?? 'Da definire'); }
const statusLabels: Record<string, string> = {
  scheduled: 'In programma', live: 'In corso', finished: 'Terminata', postponed: 'Rinviata',
};
function matchStatus(value: unknown) {
  const status = String(value ?? '');
  return statusLabels[status] ?? status;
}
const src = (value: unknown) => safeUrl(value);
const lbl = (value: unknown) => VALUE_LABELS[String(value)] ?? String(value ?? '');
/** CSS url() with the value JSON-quoted so it cannot break out of the declaration. */
const cssUrl = (url: string) => 'url(' + JSON.stringify(url) + ')';
type Standing = { team: Row; played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number };
function standings(competition: string, data: Data): Standing[] {
  const enrolled = (data.competition_teams ?? []).filter(link => link.competition_id === competition).map(link => String(link.team_id));
  const results = (data.matches ?? []).filter(match => match.competition_id === competition && match.status === 'finished');
  const ids = new Set(enrolled.length ? enrolled : results.flatMap(match => [String(match.home_team_id), String(match.away_team_id)]));
  const rows = (data.teams ?? []).filter(team => ids.has(team.id)).map(team => ({ team, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 }));
  const byId = new Map(rows.map(row => [row.team.id, row]));
  for (const match of results) {
    if (match.home_score == null || match.away_score == null) continue;
    const home = byId.get(String(match.home_team_id));
    const away = byId.get(String(match.away_team_id));
    if (!home || !away) continue;
    const hs = Number(match.home_score), as = Number(match.away_score);
    home.played++; away.played++; home.gf += hs; home.ga += as; away.gf += as; away.ga += hs;
    if (hs > as) { home.wins++; away.losses++; home.points += 3; }
    else if (hs < as) { away.wins++; home.losses++; away.points += 3; }
    else { home.draws++; away.draws++; home.points++; away.points++; }
  }
  return rows.sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || nameOf(a.team).localeCompare(nameOf(b.team)));
}
function BrandImage({ url, name, size = 46 }: { url: unknown; name: string; size?: number }) {
  // Always rendered next to the visible name, so the image is decorative (empty alt avoids double reading).
  return src(url) ? <img className="tournament-logo" src={src(url)} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" width={size} height={size} data-name={name} />
    : <span className="tournament-logo fallback-logo" style={{ width: size, height: size }} aria-hidden="true">{name.charAt(0)}</span>;
}
function Empty({ title = 'Qui non c’è ancora nulla.', text = 'I contenuti compariranno quando l’organizzatore inizierà a pubblicarli.' }: { title?: string; text?: string }) {
  return <div className="public-empty"><SportsSoccerRoundedIcon aria-hidden="true" sx={{ fontSize: 36, mb: 1 }} /><Typography variant="h5">{title}</Typography><p>{text}</p></div>;
}
function MatchList({ matches, data, slug }: { matches: Row[]; data: Data; slug: string }) {
  if (!matches.length) return <Empty title="Nessuna partita in programma." />;
  const teamMap = new Map((data.teams ?? []).map(team => [team.id, team]));
  return <div className="match-list">{matches.map(match => {
    const home = teamMap.get(String(match.home_team_id));
    const away = teamMap.get(String(match.away_team_id));
    return <RouterLink key={match.id} className="public-match glass" to={'/t/' + slug + '/partite/' + match.id}>
      <div className="match-meta"><span>{String(match.matchday ?? 'Incontro')}</span><span>{dateOf(match.kickoff_at)}</span><Chip label={matchStatus(match.status)} size="small" variant="outlined" className={'match-status match-status--' + String(match.status)} /></div>
      <div className="match-teams"><div><BrandImage url={home?.logo_url} name={nameOf(home)} />{nameOf(home)}</div><strong>{match.status === 'finished' || match.status === 'live' ? String(match.home_score ?? '–') + ' : ' + String(match.away_score ?? '–') : 'VS'}</strong><div>{nameOf(away)}<BrandImage url={away?.logo_url} name={nameOf(away)} /></div></div>
      <small>{String(match.venue ?? 'Campo da definire')}</small>
    </RouterLink>;
  })}</div>;
}

export function Tournament() {
  const { openPreferences } = useCookiePreferences();
  const { slug } = useParams();
  const location = useLocation();
  const [query, setQuery] = useSearchParams();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [grants, setGrants] = useState<TenantFeature[]>([]);
  const [data, setData] = useState<Data>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const base = '/t/' + slug;
  const fragments = location.pathname.split('/').slice(3);
  const page = fragments[0] || 'home';
  const detail = fragments[1];
  const enabled = (code: FeatureCode) => grants.some(g => g.code === code && g.enabled && (!g.ends_at || new Date(g.ends_at).getTime() > Date.now()));
  useEffect(() => {
    if (!slug || !configured) { setLoading(false); return; }
    let live = true;
    setLoading(true); setError('');
    const run = async () => {
      try {
        const sb = client();
        const { data: found, error: issue } = await sb.from('tenants').select('id,slug,name,tagline,logo_url,cover_url,brand_color,status,created_at').eq('slug', slug).maybeSingle();
        if (issue) throw issue;
        if (!found) { if (live) setTenant(null); return; }
        const [grantResponse, ...rows] = await Promise.all([
          sb.from('tenant_features').select('tenant_id,code,enabled,ends_at').eq('tenant_id', found.id),
          ...tables.map(table => sb.from(table).select(PUBLIC_COLUMNS[table] ?? '*').eq('tenant_id', found.id).limit(1000)),
        ]);
        if (grantResponse.error) throw grantResponse.error;
        const collected: Data = {};
        rows.forEach((result, index) => {
          if (result.error) throw result.error;
          collected[tables[index]] = (result.data ?? []) as unknown as Row[];
        });
        if (live) { setTenant(found as Tenant); setGrants((grantResponse.data ?? []) as TenantFeature[]); setData(collected); }
      } catch (cause) { if (live) setError(friendlyError(cause)); }
      finally { if (live) setLoading(false); }
    };
    void run();
    return () => { live = false; };
  }, [slug]);

  const competitions = useMemo(() => [...(data.competitions ?? [])].sort((a, b) => String(a.name).localeCompare(String(b.name), 'it')), [data]);
  // Default to the competition people most likely want: in progress, then with most fixtures.
  const featured = useMemo(() => {
    const count = (id: string) => (data.matches ?? []).filter(m => m.competition_id === id).length;
    const order = { active: 0, upcoming: 1, finished: 2 } as Record<string, number>;
    return [...competitions].sort((a, b) => (order[String(a.status)] ?? 3) - (order[String(b.status)] ?? 3) || count(b.id) - count(a.id))[0];
  }, [competitions, data]);
  const requestedCompetition = query.get('competizione');
  const selected = competitions.some(item => String(item.id) === requestedCompetition) ? requestedCompetition! : String(featured?.id ?? '');
  const filteredMatches = (data.matches ?? []).filter(match => !selected || match.competition_id === selected).sort((a, b) => String(b.kickoff_at).localeCompare(String(a.kickoff_at)));
  const latestResults = filteredMatches.filter(m => m.status === 'finished' || m.status === 'live').slice(0, 3);
  const nextFixtures = filteredMatches.filter(m => m.status === 'scheduled' || m.status === 'postponed').reverse().slice(0, 3);
  const ranking = useMemo(() => standings(selected, data), [selected, data]);
  const players = data.players ?? [];
  const teams = data.teams ?? [];
  const teamMap = new Map(teams.map(t => [t.id, t]));
  const playerMap = new Map(players.map(p => [p.id, p]));
  const byId = (table: string, id: string | undefined) => (data[table] ?? []).find(row => row.id === id);
  const containerStyle = tenant ? ({ '--tenant-accent': /^#[0-9a-f]{6}$/i.test(tenant.brand_color) ? tenant.brand_color : '#174638' } as CSSProperties) : undefined;

  if (loading) return <div className="center-screen"><CircularProgress /></div>;
  if (!configured) return <ErrorView code="503" detail="Il database non è configurato per questa installazione." />;
  if (error) return <ErrorView code={navigator.onLine ? '503' : 'offline'} retry={() => window.location.reload()} detail="Non è stato possibile caricare il torneo." />;
  if (!tenant) return <ErrorView code="404" detail="Questo torneo non esiste oppure non è ancora pubblico." />;
  const pageFeature = navigation.find(nav => nav.slug === page)?.feature;
  return <div className="tournament-app" style={containerStyle}>
    <a className="skip-link" href="#tournament-content">Vai ai contenuti del torneo</a>
    <header className="tournament-header glass"><Container maxWidth="lg" className="tournament-header-inner">
      <RouterLink to={base} className="tournament-brand"><BrandImage url={tenant.logo_url} name={tenant.name} size={42} /><b>{tenant.name}</b></RouterLink>
      <div className="tournament-head-actions"><ThemeToggle /><RouterLink to="/" className="tournament-backlink">ItalFUT <ArrowOutwardRoundedIcon sx={{ fontSize: 15 }} /></RouterLink></div>
    </Container></header>
    <div className="tournament-nav" role="navigation" aria-label="Sezioni del torneo"><Container maxWidth="lg"><div className="tournament-nav-scroll">
      <RouterLink to={base} aria-current={page === 'home' ? 'page' : undefined} className={page === 'home' ? 'active' : ''}>Home</RouterLink>
      {navigation.filter(nav => enabled(nav.feature)).map(nav => <RouterLink key={nav.slug} to={base + '/' + nav.slug} aria-current={page === nav.slug ? 'page' : undefined} className={page === nav.slug ? 'active' : ''}>{nav.label}</RouterLink>)}
    </div></Container></div>
    {tenant.status !== 'active' && <div className="preview-alert"><Container maxWidth="lg">Anteprima visibile solo ai membri: il sito è in bozza e non è ancora pubblico.</Container></div>}
    {pageFeature && !enabled(pageFeature) ? <Container id="tournament-content" maxWidth="lg" sx={{ py: 8 }}><Empty title="Sezione non disponibile." text="L'organizzatore non ha ancora attivato questo modulo." /></Container> :
      <main id="tournament-content" className="tournament-main"><Container maxWidth="lg">
        {page === 'home' && <>
          <section className={'tournament-hero' + (src(tenant.cover_url) ? ' has-cover' : '')} style={src(tenant.cover_url) ? { ['--cover' as string]: cssUrl(src(tenant.cover_url)) } : undefined}>
            <GlowField count={8} />
            <Typography variant="h2" component="h1">{tenant.name}</Typography>{tenant.tagline && <p>{tenant.tagline}</p>}
            <Button component={RouterLink} to={base + '/partite'} variant="contained" color="secondary" endIcon={<ArrowForwardRoundedIcon />}>Scopri le partite</Button>
          </section>
          <div className="public-metric-grid"><div><EmojiEventsRoundedIcon /><strong>{competitions.length}</strong><span>Competizioni</span></div><div><GroupsRoundedIcon /><strong>{teams.length}</strong><span>Squadre</span></div><div><CalendarMonthRoundedIcon /><strong>{(data.matches ?? []).length}</strong><span>Partite</span></div><div><SportsSoccerRoundedIcon /><strong>{players.length}</strong><span>Giocatori</span></div></div>
          <div className="public-split"><section><div className="public-heading"><Typography variant="h4" component="h2">{latestResults.length ? 'Ultimi risultati' : 'Prossime partite'}</Typography><Button component={RouterLink} to={base + '/partite'} endIcon={<ArrowForwardRoundedIcon />}>Calendario</Button></div><MatchList matches={latestResults.length ? latestResults : nextFixtures} data={data} slug={slug ?? ''} />{latestResults.length > 0 && nextFixtures.length > 0 && <><div className="public-heading public-heading--space"><Typography variant="h4" component="h2">Prossime partite</Typography></div><MatchList matches={nextFixtures} data={data} slug={slug ?? ''} /></>}</section>
            <section><div className="public-heading"><Typography variant="h4" component="h2">Classifica{featured && competitions.length > 1 ? ' · ' + String(competitions.find(c => c.id === selected)?.name ?? '') : ''}</Typography><Button component={RouterLink} to={base + '/classifiche'} endIcon={<ArrowForwardRoundedIcon />}>Completa</Button></div>
              {ranking.length ? <div className="standing-table">{ranking.slice(0, 7).map((row,i) => <div className="standing-row" key={row.team.id}><span>{i+1}</span><BrandImage url={row.team.logo_url} name={nameOf(row.team)} size={28} /><b>{nameOf(row.team)}</b><strong>{row.points} pt</strong></div>)}</div> : <Empty title="Classifica in preparazione." />}
            </section></div>
          {enabled('articles') && (data.articles ?? []).length > 0 && <section className="public-section"><div className="public-heading"><Typography variant="h4">Ultime notizie</Typography><Button component={RouterLink} to={base + '/articoli'}>Tutte le news</Button></div><div className="public-card-grid">{(data.articles ?? []).slice(0, 3).map(article => <RouterLink to={base + '/articoli/' + article.id} className="public-card glass" key={article.id}>{src(article.image_url) && <div className="public-card-photo"><img src={src(article.image_url)} alt={String(article.image_alt || "Immagine articolo: " + article.title)} loading="lazy" referrerPolicy="no-referrer" /></div>}<b>{String(article.title)}</b><small>{String(article.summary ?? '')}</small></RouterLink>)}</div></section>}
        </>}
        {page === 'competizioni' && <section className="public-section"><Typography variant="h3">Competizioni</Typography>{competitions.length ? <div className="public-card-grid">{competitions.map(comp => <RouterLink key={comp.id} className="public-card competition-card" to={base + '/classifiche?competizione=' + comp.id}><Chip label={lbl(comp.status)} size="small" variant="outlined" /><Typography variant="h5">{String(comp.name)}</Typography><small>{String(comp.season_label ?? 'Stagione in corso')}</small><ArrowForwardRoundedIcon /></RouterLink>)}</div> : <Empty />}</section>}
        {page === 'partite' && <section className="public-section"><Typography variant="h3">{detail ? 'Dettaglio partita' : 'Calendario e risultati'}</Typography>
          {detail ? (() => { const match = byId('matches', detail); if (!match) return <Empty title="Partita non trovata." />;
            const home = teamMap.get(String(match.home_team_id)), away = teamMap.get(String(match.away_team_id));
            const events = (data.match_events ?? []).filter(e => e.match_id === detail).sort((a, b) => Number(a.minute ?? 0) - Number(b.minute ?? 0));
            const galleries = enabled('gallery') ? (data.galleries ?? []).filter(g => g.match_id === detail) : [];
            return <><div className="match-detail-box"><div className="match-detail-teams"><div><BrandImage url={home?.logo_url} name={nameOf(home)} size={74} /><b>{nameOf(home)}</b></div><strong>{match.status === 'finished' || match.status === 'live' ? String(match.home_score ?? '–') + ' : ' + String(match.away_score ?? '–') : 'VS'}</strong><div><BrandImage url={away?.logo_url} name={nameOf(away)} size={74} /><b>{nameOf(away)}</b></div></div><p>{dateOf(match.kickoff_at)} · {String(match.venue ?? 'Campo da definire')}</p></div>
              {events.length > 0 && <div className="public-detail-list"><Typography variant="h5">Cronaca della partita</Typography>{events.map(event => <div key={event.id}><b>{String(event.minute ?? '–')}'</b><span>{lbl(event.event_type)} · {String(playerMap.get(String(event.player_id))?.first_name ?? '')} {String(playerMap.get(String(event.player_id))?.last_name ?? '')}</span></div>)}</div>}
              {galleries.map(g => <Button key={g.id} href={src(g.url)} target="_blank" rel="noopener noreferrer" endIcon={<ArrowOutwardRoundedIcon />}>{String(g.label)} · Foto gallery</Button>)}
            </>;
          })() : <><CompetitionSelect competitions={competitions} selected={selected} onSelect={id => setQuery(id ? { competizione: id } : {})} /><div id="itf-competition-panel" role={competitions.length > 1 ? 'tabpanel' : undefined} aria-labelledby={competitions.length > 1 ? 'itf-competition-tab-' + selected : undefined}><MatchList matches={filteredMatches} data={data} slug={slug ?? ''} /></div></>}
        </section>}
        {page === 'classifiche' && <section className="public-section"><Typography variant="h3">Classifiche</Typography><CompetitionSelect competitions={competitions} selected={selected} onSelect={id => setQuery({ competizione: id })} />
          <div id="itf-competition-panel" role={competitions.length > 1 ? 'tabpanel' : undefined} aria-labelledby={competitions.length > 1 ? 'itf-competition-tab-' + selected : undefined}>
          {ranking.length ? <div className="standings-scroll"><table className="standings-full"><caption className="sr-only">Classifica della competizione selezionata</caption><thead><tr><th>#</th><th>Squadra</th><th>PG</th><th>V</th><th>N</th><th>P</th><th>GF</th><th>GS</th><th>DR</th><th>Pt</th></tr></thead><tbody>{ranking.map((row,i) => <tr key={row.team.id}><td>{i+1}</td><td><RouterLink to={base + '/squadre/' + row.team.id}><BrandImage url={row.team.logo_url} name={nameOf(row.team)} size={27} />{nameOf(row.team)}</RouterLink></td><td>{row.played}</td><td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td><td>{row.gf}</td><td>{row.ga}</td><td>{row.gf - row.ga}</td><td><b>{row.points}</b></td></tr>)}</tbody></table></div> : <Empty title="La classifica sarà disponibile dopo le iscrizioni." />}
          </div>
        </section>}
        {page === 'squadre' && <section className="public-section"><Typography variant="h3">{detail ? 'Scheda squadra' : 'Le squadre'}</Typography>{detail ? (() => {
          const team = byId('teams', detail); if (!team) return <Empty title="Squadra non trovata." />;
          const roster = players.filter(p => p.team_id === detail);
          const games = (data.matches ?? []).filter(m => m.home_team_id === detail || m.away_team_id === detail);
          return <><div className="team-profile"><BrandImage url={team.logo_url} name={nameOf(team)} size={96} /><Typography variant="h3">{nameOf(team)}</Typography><Chip label={roster.length + ' giocatori'} /></div><Typography variant="h5" sx={{ mt: 5, mb: 2 }}>Rosa giocatori</Typography><div className="player-grid">{roster.map(p => <RouterLink key={p.id} to={base + '/giocatori/' + p.id} className="player-card"><BrandImage url={p.profile_image_url} name={String(p.first_name)} size={58} /><div><b>{String(p.first_name)} {String(p.last_name)}</b><small>#{String(p.shirt_number ?? '—')} · {p.position ? lbl(p.position) : 'Giocatore'}</small></div></RouterLink>)}</div>{roster.length === 0 && <Empty title="Rosa non ancora inserita." />}<Typography variant="h5" sx={{ mt: 6, mb: 2 }}>Partite</Typography><MatchList matches={games} data={data} slug={slug ?? ''} /></>;
        })() : teams.length ? <div className="public-card-grid">{teams.map(team => <RouterLink to={base + '/squadre/' + team.id} key={team.id} className="public-team-card"><BrandImage url={team.logo_url} name={nameOf(team)} size={58} /><strong>{nameOf(team)}</strong><ArrowForwardRoundedIcon /></RouterLink>)}</div> : <Empty />}</section>}
        {page === 'giocatori' && <section className="public-section">{(() => { const player = byId('players', detail); if (!player) return <Empty title="Giocatore non trovato." />;
          const fullName = String(player.first_name) + ' ' + String(player.last_name);
          return <div className="player-profile"><BrandImage url={player.profile_image_url} name={fullName} size={124} /><div><Chip label={'#' + String(player.shirt_number ?? '—')} /><Typography variant="h3">{fullName}</Typography><p>{nameOf(teamMap.get(String(player.team_id)))} · {player.position ? lbl(player.position) : 'Calciatore'}</p></div></div>;
        })()}</section>}
        {page === 'statistiche' && <section className="public-section"><Typography variant="h3">Statistiche</Typography>{(() => {
          const valid = (data.match_events ?? []).filter(e => e.player_id && ['goal', 'assist', 'yellow_card', 'red_card', 'mvp'].includes(String(e.event_type)));
          const categories = [{ code: 'goal', title: 'Marcatori' }, { code: 'assist', title: 'Assist' }, { code: 'mvp', title: 'MVP' }, { code: 'yellow_card', title: 'Cartellini gialli' }, { code: 'red_card', title: 'Cartellini rossi' }];
          return <div className="stats-grid">{categories.map(category => { const tally = new Map<string, number>(); valid.filter(e => e.event_type === category.code).forEach(event => tally.set(String(event.player_id), (tally.get(String(event.player_id)) ?? 0) + 1)); const sorted = [...tally.entries()].sort((a,b) => b[1] - a[1]).slice(0, 7);
            return <div className="stat-block" key={category.code}><Typography variant="h5">{category.title}</Typography>{sorted.length ? sorted.map(([id,count],i) => { const person = playerMap.get(id); return <RouterLink to={base + '/giocatori/' + id} key={id}><span>{i+1}</span><b>{String(person?.first_name ?? '')} {String(person?.last_name ?? '')}</b><strong>{count}</strong></RouterLink>; }) : <p>Dati non ancora pubblicati.</p>}</div>;
          })}</div>;
        })()}</section>}
        {page === 'staff' && <section className="public-section"><Typography variant="h3">Staff</Typography><div className="public-card-grid">{(data.staff_members ?? []).map(person => <div className="public-team-card" key={person.id}><BrandImage url={person.photo_url} name={nameOf(person)} size={60} /><div><strong>{String(person.name)}</strong><small>{String(person.role ?? 'Staff')} · {String(person.goals ?? 0)} gol</small></div></div>)}</div>{!(data.staff_members ?? []).length && <Empty />}</section>}
        {page === 'premi' && <section className="public-section"><Typography variant="h3">Premi e riconoscimenti</Typography><div className="public-card-grid">{(data.awards ?? []).map(award => <div className="public-card glass" key={award.id}><EmojiEventsRoundedIcon sx={{ fontSize: 34 }} /><Typography variant="h5">{String(award.title)}</Typography><small>{[award.month_label, lbl(award.award_type)].filter(Boolean).join(' · ')}</small></div>)}</div>{!(data.awards ?? []).length && <Empty />}</section>}
        {page === 'mercato' && <section className="public-section"><Typography variant="h3">Calciomercato</Typography><div className="public-card-grid">{teams.map(team => {
          const slots = (data.market_slots ?? []).filter(slot => slot.team_id === team.id).sort((a,b) => Number(a.slot_number)-Number(b.slot_number));
          return <div className="market-team" key={team.id}><div className="market-team-title"><BrandImage url={team.logo_url} name={nameOf(team)} size={40} /><b>{nameOf(team)}</b></div>{slots.length ? slots.map(slot => <div key={slot.id}><span>{String(slot.slot_number).padStart(2, '0')}</span>{String(slot.player_name)}</div>) : <p>Nessun movimento ancora pubblicato.</p>}</div>;
        })}</div></section>}
        {page === 'articoli' && <section className="public-section"><Typography variant="h3">{detail ? 'News' : 'Notizie e aggiornamenti'}</Typography>{detail ? (() => {
          const article = byId('articles', detail); return article ? <article className="article-detail"><Typography variant="h2">{String(article.title)}</Typography><p className="article-summary">{String(article.summary ?? '')}</p>{src(article.image_url) && <img src={src(article.image_url)} alt={String(article.image_alt || "Immagine articolo: " + article.title)} loading="lazy" referrerPolicy="no-referrer" />}<div className="article-body">{String(article.body ?? '')}</div></article> : <Empty title="Articolo non disponibile." />;
        })() : <div className="public-card-grid">{(data.articles ?? []).sort((a,b) => Number(a.sort_order ?? 0)-Number(b.sort_order ?? 0)).map(article => <RouterLink className="public-card glass" key={article.id} to={base + '/articoli/' + article.id}>{src(article.image_url) && <div className="public-card-photo"><img src={src(article.image_url)} alt={String(article.image_alt || "Immagine articolo: " + article.title)} loading="lazy" referrerPolicy="no-referrer" /></div>}<Typography variant="h6">{String(article.title)}</Typography><p>{String(article.summary ?? '')}</p></RouterLink>)}</div>}{!(data.articles ?? []).length && <Empty />}</section>}
        {page === 'sponsor' && <section className="public-section"><Typography variant="h3">Sponsor e partner</Typography><div className="public-card-grid">{(data.sponsors ?? []).sort((a,b)=>Number(a.sort_order??0)-Number(b.sort_order??0)).map(s => <a key={s.id} className="public-card sponsor-card" href={src(s.website_url) || undefined} target="_blank" rel="noopener noreferrer">{src(s.image_url) && <div className="public-card-photo"><img src={src(s.image_url)} alt={String(s.image_alt || "Immagine dello sponsor " + s.name)} loading="lazy" referrerPolicy="no-referrer" /></div>}<BrandImage url={s.logo_url} name={nameOf(s)} size={45} /><b>{String(s.name)}</b><p>{String(s.description ?? '')}</p><ArrowOutwardRoundedIcon /></a>)}</div>{!(data.sponsors ?? []).length && <Empty />}</section>}
        {page === 'gallery' && <section className="public-section"><Typography variant="h3">Foto gallery</Typography><div className="public-card-grid">{(data.galleries ?? []).map(g => <a className="public-card gallery-card" key={g.id} href={src(g.url) || undefined} target="_blank" rel="noopener noreferrer"><Typography variant="h6">{String(g.label)}</Typography><small>Apri la galleria esterna</small><ArrowOutwardRoundedIcon /></a>)}</div>{!(data.galleries ?? []).length && <Empty />}</section>}
      </Container></main>}
    <footer className="tournament-footer"><Container maxWidth="lg">
      <b>{tenant.name}</b><span>Realizzato con <RouterLink to="/" className="brand brand--inline"><span className="brand__ital">ital</span><span className="brand__fut">FUT</span></RouterLink> · <MadeBy /></span>
      <nav aria-label="Documenti legali" className="tournament-legal-links">
        <RouterLink to="/privacy-policy">Privacy</RouterLink>
        <RouterLink to="/terms-of-service">Termini</RouterLink>
        <RouterLink to="/cookie-policy">Cookie</RouterLink>
        <button type="button" onClick={openPreferences}>Preferenze cookie</button>
        <RouterLink to="/business">Operatore</RouterLink>
        <RouterLink to="/contatti">Contatti</RouterLink>
      </nav>
    </Container></footer>
  </div>;
}
function CompetitionSelect({ competitions, selected, onSelect }: { competitions: Row[]; selected: string; onSelect: (id: string) => void }) {
  if (competitions.length <= 1) return null;
  return <div className="public-competition-switch">
    <span className="public-competition-switch__label">Competizione</span>
    <AnimatedTabs
      tabs={competitions.map(comp => ({ id: String(comp.id), label: String(comp.name) }))}
      activeTab={selected}
      onChange={onSelect}
      variant="pill"
      layoutId="itf-competition-tab"
      ariaLabel="Seleziona competizione"
      panelId="itf-competition-panel"
    />
  </div>;
}
