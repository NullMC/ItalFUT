import { useRef, type CSSProperties, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import SouthRoundedIcon from '@mui/icons-material/SouthRounded';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import SyncAltRoundedIcon from '@mui/icons-material/SyncAltRounded';
import CollectionsRoundedIcon from '@mui/icons-material/CollectionsRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { EXTRA, CORE, MODULES, formatEuro, BASE_MONTHLY } from '../lib/catalog';
import type { FeatureCode } from '../lib/types';
import { Backdrop } from '../components/fx/Backdrop';
import { Football3D } from '../components/fx/Football3D';
import { HeroPhonePreview } from '../components/HeroPhonePreview';
import { roleHome, useAuth } from '../auth/AuthProvider';
import { Reveal, WordReveal, trackSpotlight } from '../components/MarketingMotion';
import { demoTeams, standings, teamById } from '../components/heroDemoData';

const moduleIcons: Partial<Record<FeatureCode, ReactNode>> = {
  statistics: <QueryStatsRoundedIcon />, staff: <BadgeRoundedIcon />, awards: <WorkspacePremiumRoundedIcon />,
  sponsors: <HandshakeRoundedIcon />, articles: <ArticleRoundedIcon />, market: <SyncAltRoundedIcon />, gallery: <CollectionsRoundedIcon />,
};

function Bento({ className = '', title, text, children, delay = 0 }: { className?: string; title: string; text: string; children?: ReactNode; delay?: number }) {
  return <Reveal as="article" delay={delay} className={'bento glass ' + className}>
    <div className="bento__inner spotlight" onPointerMove={event => trackSpotlight(event as never)}>
      <div className="bento__visual" aria-hidden="true">{children}</div>
      <div className="bento__copy"><h3>{title}</h3><p>{text}</p></div>
    </div>
  </Reveal>;
}

function MiniStandings() {
  return <div className="mini-table">
    {standings.slice(0, 5).map((row, index) => {
      const team = teamById(row.id);
      return <motion.div key={row.id} className="mini-table__row"
        initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
        transition={{ delay: .15 + index * .07, duration: .6, ease: [.16, 1, .3, 1] }}>
        <span className="mini-table__pos display-num">{index + 1}</span>
        <span className="crest" style={{ '--team': team.color } as CSSProperties}>{team.short.slice(0, 2)}</span>
        <span className="mini-table__name">{team.name}</span>
        <span className="mini-table__gd">{row.gd > 0 ? '+' : ''}{row.gd}</span>
        <span className="mini-table__pts display-num">{row.points}</span>
      </motion.div>;
    })}
  </div>;
}

function MiniMatch() {
  const home = demoTeams[0], away = demoTeams[4];
  return <div className="mini-match">
    <div className="mini-match__meta"><span className="dot dot--live" />Giornata 4 · Terminata</div>
    <div className="mini-match__row">
      <span className="crest crest--lg" style={{ '--team': home.color } as CSSProperties}>{home.short.slice(0, 2)}</span>
      <span className="mini-match__score display-num">2<i>:</i>0</span>
      <span className="crest crest--lg" style={{ '--team': away.color } as CSSProperties}>{away.short.slice(0, 2)}</span>
    </div>
    <div className="mini-match__names"><span>{home.name}</span><span>{away.name}</span></div>
  </div>;
}

function MiniScorers() {
  const rows = [['F. Greco', 6], ['V. Masi', 5], ['G. Lorusso', 4], ['R. Esposito', 3]] as const;
  return <div className="mini-bars">
    {rows.map(([name, goals], index) => <div key={name} className="mini-bars__row">
      <span>{name}</span>
      <motion.i initial={{ scaleX: 0 }} whileInView={{ scaleX: goals / 6 }} viewport={{ once: true }}
        transition={{ delay: .2 + index * .08, duration: .9, ease: [.16, 1, .3, 1] }} />
      <b className="display-num">{goals}</b>
    </div>)}
  </div>;
}

function MiniSite() {
  return <div className="mini-site">
    <div className="mini-site__bar"><i /><i /><i /><span>/t/il-tuo-torneo</span></div>
    <div className="mini-site__hero"><b>Street Cup</b><small>Stagione 2026/27</small></div>
    <div className="mini-site__tabs"><span className="is-on">Partite</span><span>Classifica</span><span>Squadre</span></div>
  </div>;
}

function MiniRoster() {
  const team = demoTeams[1];
  return <div className="mini-roster">
    {team.players.map((player, index) => <motion.div key={player.number} className="mini-roster__card"
      initial={{ opacity: 0, y: 16, rotate: -4 + index * 2.5 }} whileInView={{ opacity: 1, y: 0, rotate: -4 + index * 2.5 }}
      viewport={{ once: true }} transition={{ delay: .1 + index * .08, duration: .6, ease: [.16, 1, .3, 1] }}
      style={{ '--team': team.color } as CSSProperties}>
      <b className="display-num">{player.number}</b><span>{player.name}</span><small>{player.role}</small>
    </motion.div>)}
  </div>;
}

/* ── How it works: sticky 3D pitch, the ball travels as you scroll ─────────── */
const steps = [
  { title: 'Configura', text: 'Scegli durata e moduli. Il riepilogo dei costi si aggiorna mentre selezioni, senza voci nascoste.' },
  { title: 'Personalizza', text: 'Dai un nome al torneo, scegli l’indirizzo pubblico e i colori. Lo spazio nasce in bozza, visibile solo a te.' },
  { title: 'Gioca', text: 'Inserisci squadre, rose e partite dalla console. Risultati e classifiche si aggiornano sul sito del torneo.' },
];

function Step({ index, progress, title, text }: { index: number; progress: MotionValue<number>; title: string; text: string }) {
  const start = index / steps.length, end = (index + 1) / steps.length;
  const opacity = useTransform(progress, [start - .12, start + .04, end - .04, end + .1], [.28, 1, 1, .28]);
  const x = useTransform(progress, [start - .12, start + .04], [12, 0]);
  return <motion.li className="step" style={{ opacity, x }}>
    <span className="step__num display-num">0{index + 1}</span>
    <div><h3>{title}</h3><p>{text}</p></div>
  </motion.li>;
}

function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: .4 });
  const ballX = useTransform(progress, [0, .33, .66, 1], ['-30%', '8%', '28%', '36%']);
  const ballY = useTransform(progress, [0, .33, .5, .66, 1], ['40%', '-6%', '-34%', '-6%', '-28%']);
  const ballScale = useTransform(progress, [0, .5, 1], [.9, 1.12, .82]);
  const pitchRotate = useTransform(progress, [0, 1], [58, 48]);
  const pitchSpin = useTransform(progress, [0, 1], [-14, 8]);
  const bar = useTransform(progress, [0, 1], [0, 1]);
  return <section ref={ref} className="how" id="come-funziona" aria-labelledby="how-title">
    <div className="how__sticky">
      <div className="container how__grid">
        <div className="how__copy">
          <h2 id="how-title" className="section-title">Dall’idea al campo. <span className="serif-accent">Tre passaggi.</span></h2>
          <ol className="steps">
            <motion.span className="steps__bar" style={{ scaleY: reduce ? 1 : bar }} aria-hidden="true" />
            {steps.map((step, index) => <Step key={step.title} index={index} progress={reduce ? scrollYProgress : progress} {...step} />)}
          </ol>
        </div>
        <div className="how__stage" aria-hidden="true">
          <motion.div className="pitch3d" style={reduce ? undefined : { rotateX: pitchRotate, rotateZ: pitchSpin }}>
            <svg viewBox="0 0 680 440" className="pitch3d__lines">
              <rect x="10" y="10" width="660" height="420" rx="4" />
              <line x1="340" y1="10" x2="340" y2="430" />
              <circle cx="340" cy="220" r="58" />
              <circle cx="340" cy="220" r="3" className="fill" />
              <rect x="10" y="120" width="90" height="200" /><rect x="10" y="170" width="34" height="100" />
              <rect x="580" y="120" width="90" height="200" /><rect x="636" y="170" width="34" height="100" />
              <path d="M100 180 A 48 48 0 0 1 100 260" /><path d="M580 180 A 48 48 0 0 0 580 260" />
            </svg>
            <div className="pitch3d__stripes" />
            <span className="pitch3d__spot pitch3d__spot--a" /><span className="pitch3d__spot pitch3d__spot--b" /><span className="pitch3d__spot pitch3d__spot--c" />
          </motion.div>
          <motion.div className="how__ball" style={reduce ? undefined : { x: ballX, y: ballY, scale: ballScale }}>
            <Football3D size={150} />
          </motion.div>
        </div>
      </div>
    </div>
  </section>;
}

export function Landing() {
  const reduce = useReducedMotion();
  const { session, role } = useAuth();
  const signedIn = Boolean(session);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const copyOpacity = useTransform(scrollYProgress, [0, .7], [1, 0]);
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const extrasFrom = Math.min(...EXTRA.map(module => module.monthly));
  return <>
    <section className="hero" ref={heroRef} aria-labelledby="hero-title">
      <Backdrop variant="hero" />
      <div className="container hero__grid">
        <motion.div className="hero__copy" style={reduce ? undefined : { y: copyY, opacity: copyOpacity }}>
          <h1 id="hero-title" className="hero__title">
            <WordReveal>Ogni torneo merita</WordReveal>{' '}
            <WordReveal delay={.2} className="serif-accent" wordClassName="serif-accent serif-accent--glow">un grande</WordReveal>{' '}
            <WordReveal delay={.3}>palcoscenico.</WordReveal>
          </h1>
          <motion.p className="lead hero__lead" initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .55, duration: .8, ease: [.16, 1, .3, 1] }}>
            Competizioni, squadre, partite e classifiche in un unico spazio. Organizza il tuo torneo dalla console e fallo seguire a tutti dal suo sito pubblico.
          </motion.p>
          <motion.div className="hero__actions" initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .7, duration: .8, ease: [.16, 1, .3, 1] }}>
            {signedIn
              ? <RouterLink to={roleHome(role ?? 'user')} className="btn btn--primary btn--lg">{role === 'admin' ? 'Apri la dashboard' : 'Vai ai tuoi tornei'}<ArrowForwardRoundedIcon /></RouterLink>
              : <RouterLink to="/configura" className="btn btn--primary btn--lg">Crea il tuo torneo<ArrowForwardRoundedIcon /></RouterLink>}
            {signedIn ? <RouterLink to="/configura" className="btn btn--ghost btn--lg glass">Nuovo torneo</RouterLink> : <a href="#funzionalita" className="btn btn--ghost btn--lg glass" onClick={event => { event.preventDefault(); document.getElementById('funzionalita')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }}>Scopri la piattaforma</a>}
          </motion.div>
          <motion.ul className="hero__facts" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .9, duration: .8 }}>
            <li><CheckRoundedIcon />Funzioni base incluse</li>
            <li><CheckRoundedIcon />Moduli solo se ti servono</li>
            <li><CheckRoundedIcon />Nessun addebito automatico</li>
          </motion.ul>
        </motion.div>
        <motion.div className="hero__device" style={reduce ? undefined : { y: phoneY }}>
          <HeroPhonePreview />
        </motion.div>
      </div>
      <a className="hero__scroll" href="#funzionalita" aria-label="Scorri alle funzionalità" onClick={event => { event.preventDefault(); document.getElementById('funzionalita')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }}>
        <SouthRoundedIcon />
      </a>
    </section>

    <section className="section features" id="funzionalita" aria-labelledby="features-title">
      <div className="container">
        <Reveal className="section-head">
          <h2 id="features-title" className="section-title">Dal primo sorteggio <span className="serif-accent">all’ultimo fischio.</span></h2>
          <p className="lead">Tutto ciò che serve a chi organizza, in un’interfaccia semplice anche per chi il torneo lo segue dagli spalti.</p>
        </Reveal>
        <div className="bento-grid">
          <Bento className="bento--standings" title="Classifiche che si aggiornano da sole" text="Pubblichi il risultato, ItalFUT ricalcola punti, differenza reti e posizioni per ogni competizione.">
            <MiniStandings />
          </Bento>
          <Bento className="bento--match" delay={.06} title="Calendario e risultati" text="Giornate, campi, orari e punteggi. Ogni partita ha la sua pagina con la cronaca degli eventi.">
            <MiniMatch />
          </Bento>
          <Bento className="bento--site" delay={.12} title="Un sito per ogni torneo" text="Indirizzo dedicato, nome e colori del tuo torneo. Pronto da condividere con squadre e tifosi.">
            <MiniSite />
          </Bento>
          <Bento className="bento--roster" delay={.06} title="Rose e schede giocatore" text="Squadre, numeri di maglia e ruoli. Tutele specifiche per i dati degli atleti minorenni.">
            <MiniRoster />
          </Bento>
          <Bento className="bento--stats" delay={.12} title="Marcatori e statistiche" text="Con il modulo statistiche: gol, assist, cartellini e MVP calcolati dagli eventi delle partite.">
            <MiniScorers />
          </Bento>
        </div>
      </div>
    </section>

    <HowItWorks />

    <section className="section modules" id="moduli" aria-labelledby="modules-title">
      <div className="container modules__grid">
        <Reveal className="modules__intro">
          <h2 id="modules-title" className="section-title">La tua competizione. <span className="serif-accent">Le tue regole.</span></h2>
          <p className="lead">Parti dalla base con {CORE.length} funzioni incluse a {formatEuro(BASE_MONTHLY)} al mese. Aggiungi i moduli che ti servono, da {formatEuro(extrasFrom)} al mese ciascuno.</p>
          <ul className="modules__core">
            {MODULES.filter(module => module.core).map(module => <li key={module.code}><CheckRoundedIcon />{module.name}</li>)}
          </ul>
          <RouterLink to="/configura" className="btn btn--primary">Configura i moduli<ArrowForwardRoundedIcon /></RouterLink>
          <p className="modules__note">Prezzi indicativi mensili. Oggi nessun pagamento viene richiesto: i moduli extra si attivano solo dopo una conferma esplicita.</p>
        </Reveal>
        <ul className="modules__list">
          {EXTRA.map((module, index) => <Reveal as="li" key={module.code} delay={index * .04} className="module-tile glass">
            <div className="module-tile__inner spotlight" onPointerMove={event => trackSpotlight(event as never)}>
              <span className="module-tile__icon" aria-hidden="true">{moduleIcons[module.code]}</span>
              <div><h3>{module.name}</h3><p>{module.description}</p></div>
              <span className="module-tile__price"><b>{formatEuro(module.monthly)}</b>/mese</span>
            </div>
          </Reveal>)}
        </ul>
      </div>
    </section>

    <section className="cta" aria-labelledby="cta-title">
      <div className="container">
        <div className="cta__card">
          <Backdrop variant="cta" />
          <div className="cta__content">
            <h2 id="cta-title" className="section-title">Il prossimo torneo <span className="serif-accent serif-accent--glow">inizia qui.</span></h2>
            <p className="lead">Configura la piattaforma in pochi minuti. Il tuo spazio resta in bozza finché non decidi di pubblicarlo.</p>
            <div className="hero__actions">
              <RouterLink to="/configura" className="btn btn--primary btn--lg">Configura ItalFUT<ArrowForwardRoundedIcon /></RouterLink>
              <RouterLink to="/registrati" className="btn btn--ghost btn--lg glass">Crea un account</RouterLink>
            </div>
          </div>
          <div className="cta__ball"><Football3D size={260} label="Pallone da calcio 3D: trascinalo per farlo ruotare" /></div>
        </div>
      </div>
    </section>
  </>;
}
