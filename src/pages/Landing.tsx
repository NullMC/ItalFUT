import { useNavigate } from 'react-router-dom';
import { Button, Container, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import LeaderboardRoundedIcon from '@mui/icons-material/LeaderboardRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import { EXTRA } from '../lib/catalog';
import { FeatureAccordion } from '../components/FeatureAccordion';

const capabilities = [
  { title: 'Una casa per ogni torneo', text: 'Una pagina dedicata con identità, competizioni, squadre e calendario. Tutto raggiungibile da un unico indirizzo.', icon: <TuneRoundedIcon /> },
  { title: 'Partite senza complicazioni', text: 'Organizza le giornate, aggiorna i risultati e collega eventi e giocatori ai singoli incontri.', icon: <CalendarMonthRoundedIcon /> },
  { title: 'Classifiche sempre leggibili', text: 'Punti, gare giocate, gol fatti e subiti: i risultati pubblicati alimentano le classifiche.', icon: <LeaderboardRoundedIcon /> },
  { title: 'Squadre e persone al centro', text: 'Gestisci le rose e lascia a giocatori e spettatori uno spazio semplice da consultare.', icon: <GroupsRoundedIcon /> },
];

export function Landing() {
  const navigate = useNavigate();
  return <>
    <section className="hero hero-dynamic">
      <Container maxWidth="xl" className="hero-grid hero-photo-grid">
        <div className="hero-copy">
          <Typography variant="h1" className="hero-title">Ogni torneo<br />merita <span>un grande</span><br />palcoscenico.</Typography>
          <Typography className="hero-description">Competizioni, squadre, partite e classifiche. Un unico spazio digitale per organizzare il tuo torneo e farlo seguire a tutti.</Typography>
          <div className="hero-actions">
            <Button color="secondary" variant="contained" size="large" onClick={() => navigate('/configura')} endIcon={<ArrowForwardRoundedIcon />}>Crea il tuo torneo</Button>
            <Button size="large" className="hero-secondary" onClick={() => document.getElementById('funzionalita')?.scrollIntoView({ behavior: 'smooth' })}>Scopri la piattaforma</Button>
          </div>
          <p className="hero-footnote">Parti dalle funzioni essenziali. Aggiungi soltanto i moduli che ti servono.</p>
        </div>
      </Container>
    </section>

    <section className="feature-section section-spacing" id="funzionalita">
      <Container maxWidth="lg">
        <div className="feature-stage">
          <div className="section-heading feature-stage-lead">
            <div><Typography variant="h2">Dal primo sorteggio<br />all'ultimo fischio.</Typography><p>Tutto ciò che serve agli organizzatori, semplice da usare per chi segue il calcio.</p></div>
          </div>
          <div className="capability-list">
          {capabilities.map(capability => <article className="capability-item liquid-glass" key={capability.title}>
            <span className="capability-icon" aria-hidden="true">{capability.icon}</span>
            <div><h3>{capability.title}</h3><p>{capability.text}</p></div>
          </article>)}
          </div>
        </div>
      </Container>
    </section>

    <section className="modules-section section-spacing" id="moduli">
      <Container maxWidth="lg" className="modules-composition">
        <div className="modules-intro">
          <Typography variant="h2">La tua competizione.<br />Le tue funzionalità.</Typography>
          <p>Scegli la dotazione che ti serve oggi. Potrai richiedere nuovi moduli anche in seguito.</p>
          <Button variant="contained" onClick={() => navigate('/configura')} endIcon={<ArrowForwardRoundedIcon />}>Configura i moduli</Button>
        </div>
        <FeatureAccordion modules={EXTRA} />
      </Container>
    </section>

    <section className="steps-section section-spacing" id="come-funziona">
      <Container maxWidth="lg">
        <Typography variant="h2">Dall'idea al campo.<br />Tre passaggi.</Typography>
        <ol className="steps-grid">
          <li><h3>Configura</h3><p>Scegli la durata e i moduli. Il riepilogo dei costi si aggiorna subito.</p></li>
          <li><h3>Personalizza</h3><p>Dai un nome al torneo e imposta l'identità del tuo spazio.</p></li>
          <li><h3>Organizza</h3><p>Inserisci squadre e partite nel backoffice e prepara il sito pubblico.</p></li>
        </ol>
      </Container>
    </section>

    <section className="bottom-cta bottom-cta-dynamic"><Container maxWidth="lg"><div><Typography variant="h2">Il prossimo torneo<br />inizia qui.</Typography><p>La tua competizione. La tua piattaforma.</p></div><Button variant="contained" color="secondary" size="large" onClick={() => navigate('/configura')} endIcon={<ArrowForwardRoundedIcon />}>Configura ItalFUT</Button></Container></section>
  </>;
}
