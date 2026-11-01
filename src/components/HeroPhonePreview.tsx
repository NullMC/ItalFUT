/*
 * ItalFUT mobile device showcase.
 *
 * Original React/CSS 3D composition informed by 21st.dev Phone Scroll Hero
 * (ruixen.ui), Phone Mockups 1 (solaceui), and 3D Tilt (ibelick).
 * The screen is a clearly labeled illustrative preview of public tournament
 * views, not a claimed screenshot of an actual customer's tournament.
 */
import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion, useSpring } from 'motion/react';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';

type PreviewView = 'matches' | 'standings';

const DEMO_MATCHES = [
  { home: 'Bari FC', away: 'Real Sud', homeShort: 'BF', awayShort: 'RS', homeScore: 3, awayScore: 1, day: '14 OTT' },
  { home: 'Atletico', away: 'Levante', homeShort: 'AT', awayShort: 'LV', homeScore: 2, awayScore: 2, day: '14 OTT' },
];

const DEMO_STANDINGS = [
  { name: 'Bari FC', abbr: 'BF', games: 5, points: 13 },
  { name: 'Atletico', abbr: 'AT', games: 5, points: 11 },
  { name: 'Levante', abbr: 'LV', games: 5, points: 8 },
  { name: 'Real Sud', abbr: 'RS', games: 5, points: 6 },
];

export function HeroPhonePreview() {
  const [view, setView] = useState<PreviewView>('matches');
  const reducedMotion = useReducedMotion();
  const rotateX = useSpring(-5, { stiffness: 105, damping: 23, mass: 0.6 });
  const rotateY = useSpring(-16, { stiffness: 105, damping: 23, mass: 0.6 });

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(-16 + x * 14);
    rotateX.set(-5 - y * 11);
  };

  const handlePointerLeave = () => {
    rotateX.set(-5);
    rotateY.set(-16);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next: PreviewView = event.key === 'Home' ? 'matches'
      : event.key === 'End' ? 'standings'
      : view === 'matches' ? 'standings' : 'matches';
    setView(next);
    event.currentTarget.parentElement
      ?.querySelector<HTMLButtonElement>(`#itf-demo-${next}-tab`)?.focus();
  };

  return (
    <div className="itf-phone-stage" aria-label="Anteprima illustrativa della piattaforma ItalFUT in formato smartphone"
      onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
      <div className="itf-phone-orbit" aria-hidden="true" />
      <div className="itf-phone-ambient-light" aria-hidden="true" />
      <motion.div className="itf-phone-arrival"
        initial={reducedMotion ? false : { opacity: 0, y: 46, scale: 0.91 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}>
        <motion.div className="itf-phone-float"
          animate={reducedMotion ? undefined : { y: [0, -12, 0] }}
          transition={{ duration: 7.2, repeat: Infinity, ease: 'easeInOut' }}>
          <motion.div className="itf-phone-tilt" style={{ rotateX, rotateY, rotateZ: 6 }}>
            <div className="itf-phone-frame">
              <span className="itf-phone-button itf-phone-button--volume" aria-hidden="true" />
              <span className="itf-phone-button itf-phone-button--action" aria-hidden="true" />
              <span className="itf-phone-button itf-phone-button--power" aria-hidden="true" />
              <div className="itf-phone-screen">
                <div className="itf-phone-status" aria-hidden="true">
                  <span>9:41</span>
                  <div className="itf-phone-dynamic-island" />
                  <span className="itf-phone-status-icons">
                    <i className="itf-phone-signal" /><i className="itf-phone-wifi" /><i className="itf-phone-battery" />
                  </span>
                </div>
                <div className="itf-phone-appbar">
                  <div className="itf-phone-appbrand">
                    <span className="itf-phone-appmark"><SportsSoccerRoundedIcon sx={{ fontSize: 14 }} /></span>
                    <span>ital<b>FUT</b><em>.</em></span>
                  </div>
                  <span className="itf-phone-appbar-menu" aria-hidden="true"><i /><i /><i /></span>
                </div>
                <div className="itf-phone-scrollview">
                  <div className="itf-phone-competition">
                    <span className="itf-phone-competition-tag">TORNEO DIMOSTRATIVO</span>
                    <div className="itf-phone-competition-title">
                      <span className="itf-phone-cup"><EmojiEventsRoundedIcon sx={{ fontSize: 23 }} /></span>
                      <div><strong>Street Cup</strong><small>Stagione 2026/27</small></div>
                    </div>
                    <div className="itf-phone-competition-metrics">
                      <span><b>6</b> squadre</span>
                      <span><b>18</b> incontri</span>
                      <span><b>5</b> giornate</span>
                    </div>
                  </div>
                  <div className="itf-phone-content">
                    <div className="itf-phone-section-heading">
                      <span>La competizione</span>
                      <CalendarMonthRoundedIcon sx={{ fontSize: 14 }} aria-hidden="true" />
                    </div>
                    <div className="itf-phone-tabs" role="tablist" aria-label="Visualizza l'anteprima del torneo">
                      <button type="button" role="tab" id="itf-demo-matches-tab"
                        aria-selected={view === 'matches'} aria-controls="itf-phone-demo-content"
                        tabIndex={view === 'matches' ? 0 : -1}
                        onKeyDown={handleTabKeyDown}
                        className={view === 'matches' ? 'is-selected' : ''}
                        onClick={() => setView('matches')}>Partite</button>
                      <button type="button" role="tab" id="itf-demo-standings-tab"
                        aria-selected={view === 'standings'} aria-controls="itf-phone-demo-content"
                        tabIndex={view === 'standings' ? 0 : -1}
                        onKeyDown={handleTabKeyDown}
                        className={view === 'standings' ? 'is-selected' : ''}
                        onClick={() => setView('standings')}>Classifica</button>
                    </div>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div key={view} id="itf-phone-demo-content" role="tabpanel"
                        aria-labelledby={view === 'matches' ? 'itf-demo-matches-tab' : 'itf-demo-standings-tab'}
                        initial={reducedMotion ? false : { opacity: 0, x: 9 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={reducedMotion ? undefined : { opacity: 0, x: -7 }}
                        transition={{ duration: reducedMotion ? 0 : 0.19, ease: 'easeOut' }}>
                        {view === 'matches' ? (
                          <div className="itf-phone-fixtures">
                            <div className="itf-phone-list-caption">Ultimi risultati · Giornata 5</div>
                            {DEMO_MATCHES.map(match => (
                              <div className="itf-phone-match" key={match.home}>
                                <div className="itf-phone-match-meta"><span>Terminata</span><time>{match.day}</time></div>
                                <div className="itf-phone-match-teams">
                                  <div><span className="itf-phone-teamlogo">{match.homeShort}</span><b>{match.home}</b></div>
                                  <strong>{match.homeScore} <i>:</i> {match.awayScore}</strong>
                                  <div><span className="itf-phone-teamlogo itf-phone-teamlogo--away">{match.awayShort}</span><b>{match.away}</b></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="itf-phone-table">
                            <div className="itf-phone-table-head"><span>Squadra</span><span>PG</span><span>PT</span></div>
                            {DEMO_STANDINGS.map((team, index) => (
                              <div className="itf-phone-table-row" key={team.abbr}>
                                <span><em>{index + 1}</em><span className="itf-phone-table-crest">{team.abbr}</span>{team.name}</span>
                                <span>{team.games}</span><b>{team.points}</b>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                    <p className="itf-phone-demo-note">Anteprima illustrativa · Dati di esempio</p>
                  </div>
                </div>
                <div className="itf-phone-home-indicator" aria-hidden="true" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
