import { useNavigate } from 'react-router-dom';
import { Button, Container, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import LeaderboardRoundedIcon from '@mui/icons-material/LeaderboardRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import { EXTRA } from '../lib/catalog';

export function Landing() {
  const navigate = useNavigate();
  return <>
    <section className="hero">
      <Container maxWidth="xl" className="hero-grid">
        <div className="hero-copy">
          <div className="hero-intro"><span className="hero-live-dot" /> IL NUOVO MODO DI VIVERE IL CALCIO</div>
          <Typography variant="h1" className="hero-title">Il tuo torneo.<br />Le tue regole.<br /><span>Un solo posto.</span></Typography>
          <Typography className="hero-description">Dall'iscrizione delle squadre al fischio finale. Crea la tua piattaforma di calcio, personalizzala e gestisci ogni dettaglio in autonomia.</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4, alignItems: { xs: 'stretch', sm: 'center' } }}>
            <Button color="secondary" variant="contained" size="large" onClick={() => navigate('/configura')} endIcon={<ArrowForwardRoundedIcon />}>Costruisci la tua piattaforma</Button>
            <Button size="large" className="hero-secondary" onClick={() => document.getElementById('come-funziona')?.scrollIntoView({ behavior: 'smooth' })} endIcon={<ArrowOutwardRoundedIcon />}>Scopri come funziona</Button>
          </Stack>
          <div className="hero-trust"><span><CheckRoundedIcon fontSize="small" /> Nessuna competenza tecnica</span><span><CheckRoundedIcon fontSize="small" /> Moduli su misura</span></div>
        </div>
        <div className="preview-scene" aria-label="Anteprima illustrativa della dashboard ItalFUT">
          <div className="preview-orbit" />
          <div className="preview-board">
            <div className="preview-top"><div className="preview-mark"><SportsSoccerRoundedIcon fontSize="small" /> ITALFUT / DEMO</div><span className="preview-indicator">● TORNEO ATTIVO</span></div>
            <div className="preview-heading">Street Cup 2026 <span>↗</span></div>
            <div className="preview-subheading">Panoramica competizione · dati dimostrativi</div>
            <div className="preview-metrics">
              <div><CalendarMonthRoundedIcon /><small>Partite</small><strong>48</strong></div>
              <div><SportsSoccerRoundedIcon /><small>Gol segnati</small><strong>126</strong></div>
              <div><EmojiEventsRoundedIcon /><small>Squadre</small><strong>12</strong></div>
            </div>
            <div className="preview-scores">
              <div className="preview-label"><span>ULTIME PARTITE</span><span>VEDI TUTTE →</span></div>
              <div className="scoreline"><div className="team-token emerald">R</div><span>Real Bari</span><b>3 <em>–</em> 1</b><span>FC Levante</span><div className="team-token pink">L</div></div>
              <div className="scoreline"><div className="team-token yellow">A</div><span>Atletico Sud</span><b>2 <em>–</em> 2</b><span>Sport Club</span><div className="team-token cyan">S</div></div>
            </div>
            <div className="preview-table">
              <div className="preview-label"><span>CLASSIFICA</span><span>PT</span></div>
              <div><span><b>01</b> Real Bari</span><strong>21</strong></div>
              <div><span><b>02</b> Atletico Sud</span><strong>18</strong></div>
              <div><span><b>03</b> Sport Club</span><strong>16</strong></div>
            </div>
          </div>
          <div className="preview-floating"><LeaderboardRoundedIcon /><div><b>Tutto sotto controllo</b><small>Dal campo alla classifica</small></div></div>
        </div>
      </Container>
      <div className="hero-lower">UNA PIATTAFORMA. INFINITE COMPETIZIONI. <span>↗</span></div>
    </section>
    <section className="feature-section section-spacing" id="funzionalita">
      <Container maxWidth="lg">
        <div className="section-heading"><div><Typography variant="h2">Il calcio si gioca in campo.<br />Al resto pensa ItalFUT.</Typography><p>Uno spazio professionale per dare valore a ogni competizione, dalla prima giornata alla finale.</p></div><Button variant="outlined" onClick={() => navigate('/configura')} endIcon={<ArrowForwardRoundedIcon />}>Esplora i moduli</Button></div>
        <div className="feature-bento">
          <article className="bento-feature bento-dark"><div className="bento-icon"><TuneRoundedIcon /></div><h3>La tua piattaforma,<br />la tua identità.</h3><p>Nome, colori e pagina dedicata. Il tuo torneo merita molto più di un foglio di calcolo.</p><div className="bento-pitch"><span className="pitch-mid" /><span className="pitch-arc" /><span className="pitch-dot" /></div></article>
          <article className="bento-feature bento-light"><div className="bento-icon"><CalendarMonthRoundedIcon /></div><h3>Partite e risultati</h3><p>Programma le giornate, aggiorna i punteggi e tieni tutto sincronizzato.</p><div className="bento-chip-row"><span>GIORNATA 05</span><strong>3 — 1</strong><span>FINALE</span></div></article>
          <article className="bento-feature bento-lime"><div className="bento-icon"><LeaderboardRoundedIcon /></div><h3>Classifiche che si aggiornano da sole</h3><p>Risultati, punti, differenza reti e statistiche in un colpo d'occhio.</p><div className="bento-leader"><span>01</span><b>La tua squadra</b><strong>24 PT</strong></div></article>
          <article className="bento-feature bento-light"><div className="bento-icon"><VerifiedUserRoundedIcon /></div><h3>Tu decidi. Tu gestisci.</h3><p>Backoffice riservato, ruoli separati e moduli attivabili quando servono davvero.</p><div className="bento-role"><span className="status-dot" /> Admin organizzatore <CheckRoundedIcon fontSize="small" /></div></article>
        </div>
      </Container>
    </section>
    <section className="modules-section section-spacing">
      <Container maxWidth="lg">
        <Typography variant="h2" className="modules-title">Solo quello che serve.<br />Tutto quello che vuoi.</Typography>
        <div className="module-strip">{EXTRA.map((item, i) => <div key={item.code} className="module-line"><span>{String(i + 1).padStart(2, '0')}</span><strong>{item.name}</strong><p>{item.description}</p><ArrowOutwardRoundedIcon /></div>)}</div>
      </Container>
    </section>
    <section className="steps-section section-spacing" id="come-funziona">
      <Container maxWidth="lg">
        <Typography variant="h2">Dall'idea al fischio d'inizio.</Typography>
        <div className="steps-grid">
          <div><span>01</span><h3>Configura</h3><p>Scegli la durata e i moduli che fanno al caso del tuo torneo. Il preventivo si aggiorna subito.</p></div>
          <div><span>02</span><h3>Personalizza</h3><p>Crea un account, scegli il nome e l'indirizzo del tuo spazio, aggiungi l'identità del tuo torneo.</p></div>
          <div><span>03</span><h3>Gestisci</h3><p>Dal pannello admin organizzi competizioni, squadre e partite. Sblocchi altri moduli quando vuoi.</p></div>
        </div>
      </Container>
    </section>
    <section className="bottom-cta"><Container maxWidth="lg"><div><Typography variant="h2">Il prossimo torneo<br />parte da qui.</Typography><p>Prendi il controllo dell'organizzazione. Il resto lascialo al gioco.</p></div><Button variant="contained" color="secondary" size="large" onClick={() => navigate('/configura')} endIcon={<ArrowForwardRoundedIcon />}>Configura ItalFUT</Button></Container></section>
  </>;
}
