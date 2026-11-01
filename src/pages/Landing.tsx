import { useNavigate } from 'react-router-dom';
import { Button, Container, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import LeaderboardRoundedIcon from '@mui/icons-material/LeaderboardRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import { EXTRA } from '../lib/catalog';
import { FeatureAccordion } from '../components/FeatureAccordion';
import { CinematicShader } from '../components/CinematicShader';
import { Reveal, ScrollRail } from '../components/MarketingMotion';
import { motion, useReducedMotion } from 'motion/react';

const capabilities = [
  { title: 'Una casa per ogni torneo', text: 'Una pagina dedicata con identità, competizioni, squadre e calendario. Tutto raggiungibile da un unico indirizzo.', icon: <TuneRoundedIcon /> },
  { title: 'Partite senza complicazioni', text: 'Organizza le giornate, aggiorna i risultati e collega eventi e giocatori ai singoli incontri.', icon: <CalendarMonthRoundedIcon /> },
  { title: 'Classifiche sempre leggibili', text: 'Punti, gare giocate, gol fatti e subiti: i risultati pubblicati alimentano le classifiche.', icon: <LeaderboardRoundedIcon /> },
  { title: 'Squadre e persone al centro', text: 'Gestisci le rose e lascia a giocatori e spettatori uno spazio semplice da consultare.', icon: <GroupsRoundedIcon /> },
];

export function Landing() {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  return <>
    <section className="hero hero-dynamic hero-cinematic">
      <CinematicShader variant="stadium" className="hero-ambient-shader" />
      <Container maxWidth="xl" className="hero-grid hero-photo-grid">
        <motion.div className="hero-copy" initial={reducedMotion ? false : { opacity: .92, y: 19 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : .7, ease: [.16, 1, .3, 1] }}>
          <Typography variant="h1" className="hero-title">Ogni torneo<br />merita <span>un grande</span><br />palcoscenico.</Typography>
          <Typography className="hero-description">Competizioni, squadre, partite e classifiche. Un unico spazio digitale per organizzare il tuo torneo e farlo seguire a tutti.</Typography>
          <div className="hero-actions">
            <Button color="secondary" variant="contained" size="large" onClick={() => navigate('/configura')} endIcon={<ArrowForwardRoundedIcon />}>Crea il tuo torneo</Button>
            <Button size="large" className="hero-secondary" onClick={() => document.getElementById('funzionalita')?.scrollIntoView({ behavior: 'smooth' })}>Scopri la piattaforma</Button>
          </div>
          <p className="hero-footnote">Parti dalle funzioni essenziali. Aggiungi soltanto i moduli che ti servono.</p>
        </motion.div>
      </Container>
    </section>

    <section className="feature-section section-spacing" id="funzionalita">
      <Container maxWidth="lg">
        <div className="feature-stage feature-cinematic">
          <ScrollRail />
          <Reveal className="section-heading feature-stage-lead">
            <div><Typography variant="h2">Dal primo sorteggio<br />all'ultimo fischio.</Typography><p>Tutto ciò che serve agli organizzatori, semplice da usare per chi segue il calcio.</p></div>
          </Reveal>
          <div className="capability-list">
          {capabilities.map((capability, index) => <motion.article className="capability-item liquid-glass" key={capability.title}
            initial={reducedMotion ? false : { opacity: .9, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .22 }}
            transition={{ duration: reducedMotion ? 0 : .53, delay: reducedMotion ? 0 : Math.min(index * .055, .16), ease: [.16, 1, .3, 1] }}>
            <span className="capability-icon" aria-hidden="true">{capability.icon}</span>
            <div><h3>{capability.title}</h3><p>{capability.text}</p></div>
          </motion.article>)}
          </div>
        </div>
      </Container>
    </section>

    <section className="modules-section section-spacing" id="moduli">
      <Container maxWidth="lg" className="modules-composition">
        <Reveal className="modules-intro">
          <Typography variant="h2">La tua competizione.<br />Le tue funzionalità.</Typography>
          <p>Scegli la dotazione che ti serve oggi. Potrai richiedere nuovi moduli anche in seguito.</p>
          <Button variant="contained" onClick={() => navigate('/configura')} endIcon={<ArrowForwardRoundedIcon />}>Configura i moduli</Button>
        </Reveal>
        <Reveal className="modules-accordion-stage" delay={.08}><FeatureAccordion modules={EXTRA} /></Reveal>
      </Container>
    </section>

    <section className="steps-section section-spacing" id="come-funziona">
      <Container maxWidth="lg">
        <Reveal><Typography variant="h2">Dall'idea al campo.<br />Tre passaggi.</Typography></Reveal>
        <ol className="steps-grid">
          <motion.li initial={reducedMotion ? false : { opacity: .9, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: reducedMotion ? 0 : .55 }}><h3>Configura</h3><p>Scegli la durata e i moduli. Il riepilogo dei costi si aggiorna subito.</p></motion.li>
          <motion.li initial={reducedMotion ? false : { opacity: .9, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: reducedMotion ? 0 : .55, delay: reducedMotion ? 0 : .07 }}><h3>Personalizza</h3><p>Dai un nome al torneo e imposta l'identità del tuo spazio.</p></motion.li>
          <motion.li initial={reducedMotion ? false : { opacity: .9, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: reducedMotion ? 0 : .55, delay: reducedMotion ? 0 : .14 }}><h3>Organizza</h3><p>Inserisci squadre e partite nel backoffice e prepara il sito pubblico.</p></motion.li>
        </ol>
      </Container>
    </section>

    <section className="bottom-cta bottom-cta-dynamic bottom-cta-cinematic"><CinematicShader variant="ribbons" className="bottom-cta-shader" /><Container maxWidth="lg"><div><Typography variant="h2">Il prossimo torneo<br />inizia qui.</Typography><p>La tua competizione. La tua piattaforma.</p></div><Button variant="contained" color="secondary" size="large" onClick={() => navigate('/configura')} endIcon={<ArrowForwardRoundedIcon />}>Configura ItalFUT</Button></Container></section>
  </>;
}
