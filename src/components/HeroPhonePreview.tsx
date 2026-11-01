/*
 * Interactive ItalFUT tournament preview inside a cinematic 3D device.
 * All visible controls operate on coherent in-memory illustrative data.
 * No live tenant data, Supabase writes, external navigation or dead controls.
 */
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion, useSpring } from 'motion/react';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import LeaderboardRoundedIcon from '@mui/icons-material/LeaderboardRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  demoMatches, demoTeams, goalEvents, goalsForPlayer, matchDate, matchTime,
  standings, teamById, type DemoMatch, type DemoTeam, type TeamId,
} from './heroDemoData';

type Page = 'home' | 'matches' | 'standings' | 'teams' | 'match' | 'team' | 'player';
type Route = {
  page: Page;
  matchId?: string;
  teamId?: TeamId;
  playerNumber?: number;
};
type MainPage = 'home' | 'matches' | 'standings' | 'teams';

const navigation: { id: MainPage; label: string; icon: typeof HomeRoundedIcon }[] = [
  { id: 'home', label: 'Home', icon: HomeRoundedIcon },
  { id: 'matches', label: 'Partite', icon: SportsSoccerRoundedIcon },
  { id: 'standings', label: 'Classifica', icon: LeaderboardRoundedIcon },
  { id: 'teams', label: 'Squadre', icon: GroupsRoundedIcon },
];
const completed = demoMatches.filter(match => Boolean(match.score));
const nextFixtures = demoMatches.filter(match => !match.score);
const lastResults = [...completed].reverse();

function TeamMark({ team, small = false }: { team: DemoTeam; small?: boolean }) {
  return <span className={'itf-phone-teamlogo' + (small ? ' itf-phone-teamlogo--small' : '')}
    style={{ '--team-color': team.color } as CSSProperties} aria-hidden="true">
    {team.short.slice(0, 2)}
  </span>;
}

function MatchRow({
  match, onOpen,
}: { match: DemoMatch; onOpen: (match: DemoMatch) => void }) {
  const home = teamById(match.home);
  const away = teamById(match.away);
  return <button type="button" className="itf-phone-match itf-demo-match-button"
    onClick={() => onOpen(match)}
    aria-label={home.name + ' contro ' + away.name + ', ' +
      (match.score ? match.score[0] + ' a ' + match.score[1] : 'in programma alle ' + matchTime(match.date)) +
      '. Apri dettagli partita'}>
    <span className="itf-phone-match-meta">
      <span className={match.score ? 'itf-demo-done' : 'itf-demo-planned'}>
        {match.score ? 'Terminata' : 'In programma'}
      </span>
      <span>{matchDate(match.date)} · {matchTime(match.date)}</span>
    </span>
    <span className="itf-phone-match-teams">
      <span><TeamMark team={home} /><b>{home.name}</b></span>
      <strong>{match.score ? match.score[0] + ' : ' + match.score[1] : 'VS'}</strong>
      <span><TeamMark team={away} /><b>{away.name}</b></span>
    </span>
  </button>;
}

export function HeroPhonePreview() {
  const [route, setRoute] = useState<Route>({ page: 'home' });
  const [history, setHistory] = useState<Route[]>([]);
  const [round, setRound] = useState(4);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const rotateX = useSpring(0, { stiffness: 115, damping: 26 });
  const rotateY = useSpring(0, { stiffness: 115, damping: 26 });

  const navigate = (next: Route) => {
    setHistory(old => [...old, route]);
    setRoute(next);
    setMenuOpen(false);
  };
  const goTo = (page: MainPage) => {
    setHistory([]);
    setRoute({ page });
    setMenuOpen(false);
    if (page === 'matches') setRound(4);
  };
  const back = () => {
    const previous = history[history.length - 1];
    if (previous) {
      setRoute(previous);
      setHistory(old => old.slice(0, -1));
    } else goTo('home');
  };
  const openMatch = (match: DemoMatch) => navigate({ page: 'match', matchId: match.id });
  const openTeam = (team: TeamId) => navigate({ page: 'team', teamId: team });
  const openPlayer = (teamId: TeamId, playerNumber: number) =>
    navigate({ page: 'player', teamId, playerNumber });

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' }); }, [route]);
  // Distinct screens within the mockup have their own scrollable viewport.
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || interacting || event.pointerType !== 'mouse') return;
    // Keep the real clickable screen facing forward; the outer stage alone tilts.
    if ((event.target as Element).closest('.itf-phone-frame')) {
      rotateX.set(0); rotateY.set(0);
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    rotateY.set(((event.clientX - bounds.left) / bounds.width - .5) * 6);
    rotateX.set(-((event.clientY - bounds.top) / bounds.height - .5) * 5);
  };
  const straighten = () => { rotateX.set(0); rotateY.set(0); };
  const isMain = navigation.some(item => item.id === route.page);
  const title = route.page === 'home' ? 'Street Cup'
    : route.page === 'matches' ? 'Calendario'
    : route.page === 'standings' ? 'Classifica'
    : route.page === 'teams' ? 'Squadre'
    : route.page === 'match' ? 'Dettaglio partita'
    : route.page === 'team' ? 'Scheda squadra' : 'Profilo giocatore';
  const selectedMatch = demoMatches.find(match => match.id === route.matchId);
  const selectedTeam = route.teamId ? teamById(route.teamId) : undefined;
  const selectedPlayer = selectedTeam?.players.find(player => player.number === route.playerNumber);
  const filteredTeams = demoTeams.filter(team =>
    team.name.toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it')) ||
    team.district.toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it')));
  const currentRoundMatches = demoMatches.filter(match => match.round === round &&
    (!route.teamId || match.home === route.teamId || match.away === route.teamId));

  const main = (
    <>
      {route.page === 'home' && <>
        <div className="itf-phone-competition">
          <span className="itf-phone-competition-tag">ANTEPRIMA INTERATTIVA</span>
          <div className="itf-phone-competition-title">
            <span className="itf-phone-cup"><EmojiEventsRoundedIcon sx={{ fontSize: 22 }} /></span>
            <div><strong>Street Cup</strong><small>Stagione 2026/27</small></div>
          </div>
          <div className="itf-phone-competition-metrics">
            <span><b>{demoTeams.length}</b> squadre</span>
            <span><b>{demoMatches.length}</b> incontri</span>
            <span><b>5</b> giornate</span>
          </div>
        </div>
        <div className="itf-phone-content">
          <div className="itf-demo-section-title"><strong>Prossime partite</strong>
            <button type="button" onClick={() => { setRound(5); navigate({ page: 'matches' }); }}
              aria-label="Vedi tutto il calendario">Vedi tutte <ChevronRightRoundedIcon fontSize="inherit" /></button>
          </div>
          <MatchRow match={nextFixtures[0]} onOpen={openMatch} />
          <div className="itf-demo-section-title itf-demo-section-title--space"><strong>Ultimi risultati</strong>
            <button type="button" onClick={() => navigate({ page: 'matches' })}>Giornata 4 <ChevronRightRoundedIcon fontSize="inherit" /></button>
          </div>
          {lastResults.slice(0, 2).map(match => <MatchRow key={match.id} match={match} onOpen={openMatch} />)}
          <button type="button" className="itf-demo-link-card" onClick={() => goTo('standings')}>
            <LeaderboardRoundedIcon fontSize="small" /><span>Classifica aggiornata</span><ChevronRightRoundedIcon fontSize="small" />
          </button>
        </div>
      </>}
      {route.page === 'matches' && <div className="itf-phone-content itf-demo-page">
        <div className="itf-demo-page-heading">
          <span>Calendario e risultati</span><strong>Partite</strong>
        </div>
        {route.teamId && <div className="itf-demo-filter">
          {teamById(route.teamId).name}
          <button type="button" onClick={() => setRoute({ page: 'matches' })} aria-label="Rimuovi filtro squadra"><CloseRoundedIcon fontSize="small" /></button>
        </div>}
        <div className="itf-demo-round-nav" role="group" aria-label="Seleziona la giornata">
          {[1, 2, 3, 4, 5].map(number => <button type="button" key={number}
            aria-pressed={number === round} className={round === number ? 'is-active' : ''}
            onClick={() => setRound(number)}>{number}</button>)}
        </div>
        <div className="itf-phone-list-caption">Giornata {round} · {round === 5 ? 'Da giocare' : 'Risultati'}</div>
        {currentRoundMatches.length
          ? currentRoundMatches.map(match => <MatchRow match={match} onOpen={openMatch} key={match.id} />)
          : <p className="itf-demo-empty">Nessuna partita per questa squadra nella giornata selezionata.</p>}
      </div>}
      {route.page === 'standings' && <div className="itf-phone-content itf-demo-page">
        <div className="itf-demo-page-heading"><span>Stagione 2026/27</span><strong>Classifica</strong></div>
        <div className="itf-demo-table-wrap">
          <div className="itf-demo-standing-head"><span>Squadra</span><span>PG</span><span>DR</span><span>PT</span></div>
          {standings.map((stats, index) => {
            const team = teamById(stats.id);
            return <button type="button" className="itf-demo-standing" key={team.id}
              aria-label={team.name + ', ' + stats.points + ' punti. Apri scheda squadra'}
              onClick={() => openTeam(team.id)}>
              <span className="itf-demo-standing-name"><em>{index + 1}</em><TeamMark team={team} small />{team.name}</span>
              <span>{stats.played}</span><span>{stats.gd > 0 ? '+' : ''}{stats.gd}</span><b>{stats.points}</b>
            </button>;
          })}
        </div>
        <p className="itf-demo-footnote">3 punti per vittoria · Classifica calcolata dai risultati.</p>
      </div>}
      {route.page === 'teams' && <div className="itf-phone-content itf-demo-page">
        <div className="itf-demo-page-heading"><span>Street Cup</span><strong>Squadre</strong></div>
        <label className="itf-demo-search">
          <SearchRoundedIcon sx={{ fontSize: 17 }} aria-hidden="true" />
          <span className="itf-demo-sr-only">Cerca squadra o città</span>
          <input type="search" placeholder="Cerca squadra o città..." value={query}
            onChange={event => setQuery(event.target.value)} />
        </label>
        <div className="itf-demo-team-list">
          {filteredTeams.map(team => <button type="button" className="itf-demo-team-button" key={team.id}
            onClick={() => openTeam(team.id)}>
            <TeamMark team={team} />
            <span><b>{team.name}</b><small>{team.district}</small></span>
            <ChevronRightRoundedIcon fontSize="small" />
          </button>)}
          {!filteredTeams.length && <p className="itf-demo-empty">Nessuna squadra trovata. Modifica la ricerca.</p>}
        </div>
      </div>}
      {route.page === 'match' && selectedMatch && <div className="itf-phone-content itf-demo-page">
        <div className="itf-demo-page-heading"><span>Giornata {selectedMatch.round}</span><strong>Dettaglio partita</strong></div>
        <div className="itf-demo-scoreboard">
          <button type="button" onClick={() => openTeam(selectedMatch.home)}>
            <TeamMark team={teamById(selectedMatch.home)} />
            <span>{teamById(selectedMatch.home).name}</span>
          </button>
          <div><strong>{selectedMatch.score ? selectedMatch.score.join(' : ') : 'VS'}</strong>
            <small>{selectedMatch.score ? 'Terminata' : 'In programma'}</small></div>
          <button type="button" onClick={() => openTeam(selectedMatch.away)}>
            <TeamMark team={teamById(selectedMatch.away)} />
            <span>{teamById(selectedMatch.away).name}</span>
          </button>
        </div>
        <div className="itf-demo-location"><CalendarMonthRoundedIcon fontSize="small" />
          {matchDate(selectedMatch.date)} · {matchTime(selectedMatch.date)}</div>
        <div className="itf-demo-location"><PlaceRoundedIcon fontSize="small" />{selectedMatch.venue}</div>
        <div className="itf-demo-section-title itf-demo-section-title--space"><strong>Eventi partita</strong></div>
        {selectedMatch.score && goalEvents(selectedMatch).length ? <div className="itf-demo-events">
          {goalEvents(selectedMatch).map((goal, index) => <button type="button"
            key={goal.team + goal.minute + index} onClick={() => openPlayer(goal.team, goal.player.number)}>
            <span className="itf-demo-goal-minute">{goal.minute}'</span>
            <SportsSoccerRoundedIcon sx={{ fontSize: 15 }} aria-hidden="true" />
            <span><b>{goal.player.name}</b><small>{teamById(goal.team).name} · Gol</small></span>
            <ChevronRightRoundedIcon fontSize="small" />
          </button>)}
        </div> : <p className="itf-demo-empty">{selectedMatch.score ? 'Nessun gol segnato.' : 'Gli eventi saranno disponibili dopo la partita.'}</p>}
      </div>}
      {route.page === 'team' && selectedTeam && <div className="itf-phone-content itf-demo-page">
        <div className="itf-demo-team-heading">
          <TeamMark team={selectedTeam} />
          <div><span>{selectedTeam.district}</span><strong>{selectedTeam.name}</strong></div>
        </div>
        <div className="itf-demo-facts">
          {(() => { const stats = standings.find(s => s.id === selectedTeam.id)!; return <>
            <span><b>{stats.points}</b> punti</span><span><b>{stats.won}</b> vittorie</span><span><b>{stats.gf}</b> gol</span>
          </>; })()}
        </div>
        <p className="itf-demo-manager">Allenatore: <b>{selectedTeam.coach}</b></p>
        <div className="itf-demo-section-title"><strong>Rosa giocatori</strong></div>
        {selectedTeam.players.map(player => <button type="button" key={player.number}
          className="itf-demo-roster-item" onClick={() => openPlayer(selectedTeam.id, player.number)}>
          <span className="itf-demo-shirt">{player.number}</span>
          <span><b>{player.name}</b><small>{player.role}</small></span>
          <ChevronRightRoundedIcon fontSize="small" />
        </button>)}
        <button type="button" className="itf-demo-link-card" onClick={() => {
          setRound(5);
          navigate({ page: 'matches', teamId: selectedTeam.id });
        }}>
          <CalendarMonthRoundedIcon fontSize="small" /><span>Partite della squadra</span><ChevronRightRoundedIcon fontSize="small" />
        </button>
      </div>}
      {route.page === 'player' && selectedTeam && selectedPlayer && <div className="itf-phone-content itf-demo-page">
        <div className="itf-demo-player-heading">
          <div className="itf-demo-player-shirt">{selectedPlayer.number}</div>
          <span>{selectedPlayer.role}</span><strong>{selectedPlayer.name}</strong>
        </div>
        <button type="button" className="itf-demo-link-card" onClick={() => openTeam(selectedTeam.id)}>
          <TeamMark team={selectedTeam} small /><span>{selectedTeam.name}</span><ChevronRightRoundedIcon fontSize="small" />
        </button>
        <div className="itf-demo-player-stat">
          <strong>{goalsForPlayer(selectedTeam.id, selectedPlayer.number)}</strong><span>Gol segnati nel torneo</span>
        </div>
        <p className="itf-demo-footnote">Profilo dimostrativo. Le statistiche sono calcolate dagli eventi delle partite.</p>
      </div>}
    </>
  );

  return <div className="itf-phone-stage"
    aria-label="Demo interattiva ItalFUT dentro uno smartphone tridimensionale"
    onPointerMove={handlePointerMove} onPointerLeave={straighten}>
    <div className="itf-phone-ambient-light" aria-hidden="true" />
    <motion.div className="itf-phone-arrival"
      initial={reducedMotion ? false : { opacity: .7, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : .65, ease: [.16, 1, .3, 1] }}>
      <motion.div className="itf-phone-float"
        animate={reducedMotion || interacting ? { y: 0 } : { y: [0, -5, 0] }}
        transition={{ duration: reducedMotion || interacting ? .2 : 8, repeat: reducedMotion || interacting ? 0 : Infinity, ease: 'easeInOut' }}>
        <motion.div className="itf-phone-tilt" style={{ rotateX, rotateY }}>
          <div className="itf-phone-frame" onPointerEnter={() => { straighten(); setInteracting(true); }}
            onPointerLeave={() => setInteracting(false)}
            onFocusCapture={() => { straighten(); setInteracting(true); }}
            onBlurCapture={event => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteracting(false);
            }}>
            <span className="itf-phone-button itf-phone-button--volume" aria-hidden="true" />
            <span className="itf-phone-button itf-phone-button--action" aria-hidden="true" />
            <span className="itf-phone-button itf-phone-button--power" aria-hidden="true" />
            <div className="itf-phone-screen">
              <div className="itf-phone-status" aria-hidden="true">
                <span>9:41</span><div className="itf-phone-dynamic-island" />
                <span className="itf-phone-status-icons">
                  <i className="itf-phone-signal" /><i className="itf-phone-wifi" /><i className="itf-phone-battery" />
                </span>
              </div>
              <div className="itf-phone-appbar">
                <button type="button" className="itf-phone-appbrand itf-demo-brand-button"
                  onClick={() => goTo('home')} aria-label="Torna alla home della demo ItalFUT">
                  <span className="itf-phone-appmark"><SportsSoccerRoundedIcon sx={{ fontSize: 14 }} /></span>
                  <span>ital<b>FUT</b><em>.</em></span>
                </button>
                <button type="button" className="itf-demo-menu-trigger"
                  onClick={() => setMenuOpen(current => !current)}
                  aria-label={menuOpen ? 'Chiudi menu della demo' : 'Apri menu della demo'}
                  aria-expanded={menuOpen} aria-controls="itf-demo-mobile-menu">
                  {menuOpen ? <CloseRoundedIcon fontSize="small" /> : <MenuRoundedIcon fontSize="small" />}
                </button>
                {menuOpen && <nav id="itf-demo-mobile-menu" className="itf-demo-menu" aria-label="Menu della demo">
                  {navigation.map(item => <button type="button" key={item.id}
                    onClick={() => goTo(item.id)}><item.icon fontSize="small" />{item.label}</button>)}
                </nav>}
              </div>
              <div className="itf-demo-current-page">
                {isMain ? <span>{title}</span> : <button type="button" onClick={back}
                  aria-label="Torna alla schermata precedente"><ArrowBackRoundedIcon fontSize="small" />{title}</button>}
                <span className="itf-demo-status-bullet">DEMO</span>
              </div>
              <div className="itf-phone-scrollview itf-demo-scroll" ref={scrollRef}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={route.page + '-' + (route.matchId ?? '') + '-' + (route.teamId ?? '') + '-' + (route.playerNumber ?? '')}
                    className="itf-demo-view"
                    initial={reducedMotion ? false : { opacity: .86, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reducedMotion ? undefined : { opacity: .75, x: -5 }}
                    transition={{ duration: reducedMotion ? 0 : .15 }}>
                    {main}
                    <p className="itf-phone-demo-note">Anteprima interattiva · Dati simulati</p>
                  </motion.div>
                </AnimatePresence>
              </div>
              <nav className="itf-demo-bottom-nav" aria-label="Navigazione demo ItalFUT">
                {navigation.map(item => <button type="button" key={item.id}
                  className={route.page === item.id ? 'is-active' : ''}
                  aria-current={route.page === item.id ? 'page' : undefined}
                  aria-label={item.label}
                  onClick={() => goTo(item.id)}>
                  <item.icon sx={{ fontSize: 18 }} aria-hidden="true" /><span>{item.label}</span>
                </button>)}
              </nav>
              <div className="itf-phone-home-indicator" aria-hidden="true" />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  </div>;
}
