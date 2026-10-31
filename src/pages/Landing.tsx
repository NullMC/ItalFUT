import { useNavigate } from 'react-router-dom';
import { Button, Container, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import LeaderboardRoundedIcon from '@mui/icons-material/LeaderboardRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import { EXTRA } from '../lib/catalog';

const capabilities = [
  { title: 'Una casa per ogni torneo', text: 'Una pagina dedicata con identità, competizioni, squadre e calendario. Tutto raggiungibile da un unico indirizzo.', icon: <TuneRoundedIcon /> },
  { title: 'Partite senza complicazioni', text: 'Organizza le giornate, aggiorna i risultati e collega eventi e giocatori ai singoli incontri.', icon: <CalendarMonthRoundedIcon /> },
  { title: 'Classifiche sempre leggibili', text: 'Punti, gare giocate, gol fatti e subiti: i risultati pubblicati alimentano le classifiche.', icon: <LeaderboardRoundedIcon /> },
  { title: 'Squadre e persone al centro', text: 'Gestisci le rose e lascia a giocatori e spettatori uno spazio semplice da consultare.', icon: <GroupsRoundedIcon /> },
];

export function Landing() {
  const navigate = useNavigate();
  return <>
    <section className="hero">
      <Container maxWidth="xl" className="hero-grid">
        <div className="hero-copy">
          <Typography variant="h1" className="hero-title">Ogni torneo<br />merita <span>un grande</span><br />palcoscenico.</Typography>
          <Typography className="hero-description">Competizioni, squadre, partite e classifiche. Un unico spazio digitale per organizzare il tuo torneo e farlo seguire a tutti.</Typography>
          <div className="hero-actions">
            <Button color="secondary" variant="contained" size="large" onClick={() => navigate('/configura')} endIcon={<ArrowForwardRoundedIcon />}>Crea il tuo torneo</Button>
            <Button size="large" className="hero-secondary" onClick={() => document.getElementById('funzionalita')?.scrollIntoView({ behavior: 'smooth' })}>Scopri la piattaforma</Button>
          </div>
          <p className="hero-footnote">Parti dalle funzioni essenziali. Aggiungi soltanto i moduli che ti servono.</p>
        </div>
        <div className="match-visual" aria-label="Esempio dimostrativo di risultati e classifica">
          <div className="match-visual-top"><span><SportsSoccerRoundedIcon fontSize="small" /> Street Cup</span><small>Dati dimostrativi</small></div>
          <div className="match-visual-title">RISULTATI<br />E CLASSIFICA.</div>
          <div className="match-visual-board">
            <div className="match-visual-section">Risultati · Giornata 5</div>
            <div className="match-visual-score"><span><i className="team-token emerald">R</i>Real Bari</span><strong>3 <em>—</em> 1</strong><span>FC Levante<i className="team-token pink">L</i></span></div>
            <div className="match-visual-score"><span><i className="team-token yellow">A</i>Atletico Sud</span><strong>2 <em>—</em> 2</strong><span>Sport Club<i className="team-token cyan">S</i></span></div>
            <div className="match-visual-section match-visual-standing-title">Classifica</div>
            <div className="match-visual-standing"><span><b>1</b> Real Bari</span><strong>21 PT</strong></div>
            <div className="match-visual-standing"><span><b>2</b> Atletico Sud</span><strong>18 PT</strong></div>
            <div className="match-visual-standing"><span><b>3</b> Sport Club</span><strong>16 PT</strong></div>
          </div>
        </div>
      </Container>
    </section>

    <section className="feature-section section-spacing" id="funzionalita">
      <Container maxWidth="lg">
        <div className="section-heading">
          <div><Typography variant="h2">Dal primo sorteggio<br />all'ultimo fischio.</Typography><p>Tutto ciò che serve agli organizzatori, semplice da usare per chi segue il calcio.</p></div>
        </div>
        <div className="capability-list">
          {capabilities.map(capability => <article className="capability-item" key={capability.title}>
            <span className="capability-icon" aria-hidden="true">{capability.icon}</span>
            <div><h3>{capability.title}</h3><p>{capability.text}</p></div>
          </article>)}
        </div>
      </Container>
    </section>

    <section className="modules-section section-spacing" id="moduli">
      <Container maxWidth="lg">
        <div className="section-heading"><div><Typography variant="h2">Le funzioni che ti servono.<br />Niente di più.</Typography><p>Parti con le basi. Le estensioni sono facoltative e puoi sceglierle in fase di configurazione.</p></div></div>
        <div className="module-strip">{EXTRA.map(item => <div key={item.code} className="module-line"><strong>{item.name}</strong><p>{item.description}</p></div>)}</div>
        <Button variant="outlined" sx={{ mt: 4 }} onClick={() => navigate('/configura')} endIcon={<ArrowForwardRoundedIcon />}>Personalizza i moduli</Button>
      </Container>
    </section>

    <section className="steps-section section-spacing" id="come-funziona">
      <Container maxWidth="lg">
        <Typography variant="h2">Dall'idea al campo.<br />Tre passaggi.</Typography>
        <div className="steps-grid">
          <div><h3>Configura</h3><p>Scegli la durata e i moduli. Il riepilogo dei costi si aggiorna subito.</p></div>
          <div><h3>Personalizza</h3><p>Dai un nome al torneo e imposta l'identità del tuo spazio.</p></div>
          <div><h3>Organizza</h3><p>Inserisci squadre e partite nel backoffice e prepara il sito pubblico.</p></div>
        </div>
      </Container>
    </section>

    <section className="bottom-cta"><Container maxWidth="lg"><div><Typography variant="h2">Il prossimo torneo<br />inizia qui.</Typography><p>La tua competizione. La tua piattaforma.</p></div><Button variant="contained" color="secondary" size="large" onClick={() => navigate('/configura')} endIcon={<ArrowForwardRoundedIcon />}>Configura ItalFUT</Button></Container></section>
  </>;
}
