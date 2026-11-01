import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import { AnimatedTabs } from './AnimatedTabs';

const demoTabs = [
  { id: 'risultati', label: 'Risultati' },
  { id: 'classifica', label: 'Classifica' },
];

const matches = [
  { home: 'Real Bari', away: 'FC Levante', score: '3 — 1', homeInitial: 'R', awayInitial: 'L', homeColor: 'emerald', awayColor: 'pink' },
  { home: 'Atletico Sud', away: 'Sport Club', score: '2 — 2', homeInitial: 'A', awayInitial: 'S', homeColor: 'yellow', awayColor: 'cyan' },
];

const ranking = [
  { name: 'Real Bari', points: 21, played: 8 },
  { name: 'Atletico Sud', points: 18, played: 8 },
  { name: 'Sport Club', points: 16, played: 8 },
  { name: 'FC Levante', points: 14, played: 8 },
];

export function DemoScoreboard() {
  const [active, setActive] = useState('risultati');
  const reduceMotion = useReducedMotion();

  return <div className="match-visual liquid-glass" aria-label="Anteprima interattiva di un torneo dimostrativo">
    <div className="match-visual-top">
      <span><SportsSoccerRoundedIcon fontSize="small" /> Street Cup</span>
      <small>Anteprima · dati di esempio</small>
    </div>
    <div className="match-visual-title">IL TORNEO.<br />SOTTO CONTROLLO.</div>
    <div className="match-visual-board">
      <AnimatedTabs
        tabs={demoTabs}
        activeTab={active}
        onChange={setActive}
        variant="underline"
        layoutId="demo-football-tabs"
        ariaLabel="Anteprima: risultati o classifica"
        panelId="demo-football-panel"
        className="scoreboard-tabs"
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          id="demo-football-panel"
          role="tabpanel"
          aria-labelledby={`demo-football-tabs-${active}`}
          className="scoreboard-panel"
          initial={reduceMotion ? false : { opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, x: -8 }}
          transition={{ duration: reduceMotion ? 0 : 0.16, ease: 'easeOut' }}
        >
          {active === 'risultati' ? <>
            <div className="match-visual-section">Giornata 5</div>
            {matches.map(match => <div className="match-visual-score" key={match.home}>
              <span><i className={`team-token ${match.homeColor}`}>{match.homeInitial}</i>{match.home}</span>
              <strong>{match.score}</strong>
              <span>{match.away}<i className={`team-token ${match.awayColor}`}>{match.awayInitial}</i></span>
            </div>)}
            <p className="scoreboard-note">Punteggi e calendario, sempre nello stesso posto.</p>
          </> : <>
            <div className="scoreboard-rank-head"><span>Squadra</span><span>PG</span><span>PT</span></div>
            {ranking.map((entry, index) => <div className="match-visual-standing" key={entry.name}>
              <span><b>{index + 1}</b>{entry.name}</span>
              <span>{entry.played}</span>
              <strong>{entry.points}</strong>
            </div>)}
            <p className="scoreboard-note">La classifica si calcola dai risultati pubblicati.</p>
          </>}
        </motion.div>
      </AnimatePresence>
    </div>
  </div>;
}
