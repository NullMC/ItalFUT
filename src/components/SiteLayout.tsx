import { Suspense, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Outlet, Link as RouterLink, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { CircularProgress, Drawer, IconButton } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useAuth } from '../auth/AuthProvider';
import { ThemeToggle } from './ThemeToggle';
import { useCookiePreferences } from './CookieNotice';
import { businessLine, madeBy } from '../config/legal';

/** Credit to the company behind ItalFUT. */
export function MadeBy({ className = '' }: { className?: string }) {
  return <a className={'made-by ' + className} href={madeBy.url} target="_blank" rel="noopener">
    made with <svg viewBox="0 0 24 24" width="14" height="14" aria-label="amore" role="img"><path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.2C1 8.6 3 5 6.6 5c2 0 3.4 1.1 4.2 2.3h2.4C14 6.1 15.4 5 17.4 5 21 5 23 8.6 21.6 11.8 19.5 16.4 12 21 12 21z"/></svg> by <b>{madeBy.label}</b>
  </a>;
}

/** The wordmark is the logo: no pictogram, just the name. */
export function Brand({ className = '', to = '/' }: { className?: string; to?: string }) {
  return <RouterLink to={to} aria-label="ItalFUT — vai alla home" className={'brand ' + className}>
    <span className="brand__ital">ital</span><span className="brand__fut">FUT</span>
  </RouterLink>;
}

const marketingLinks = [
  { label: 'Funzionalità', href: '/#funzionalita', id: 'funzionalita' },
  { label: 'Come funziona', href: '/#come-funziona', id: 'come-funziona' },
  { label: 'Moduli', href: '/#moduli', id: 'moduli' },
  { label: 'Prezzi', href: '/configura', id: 'configura' },
];

function MenuIcon({ open }: { open: boolean }) {
  return <span className={'menu-icon' + (open ? ' is-open' : '')} aria-hidden="true"><i /><i /></span>;
}

export function SiteLayout() {
  const { session } = useAuth();
  const { openPreferences } = useCookiePreferences();
  const reduce = useReducedMotion();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const appRoute = /^\/(console|account)/.test(location.pathname);
  const home = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!home) { setActive(location.pathname === '/configura' ? 'configura' : null); return; }
    const sections = marketingLinks.map(link => document.getElementById(link.id)).filter((el): el is HTMLElement => Boolean(el));
    const observer = new IntersectionObserver(entries => {
      const seen = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (seen) setActive(seen.target.id);
    }, { rootMargin: '-35% 0px -55% 0px', threshold: [0, .2, .5] });
    sections.forEach(section => observer.observe(section));
    const onTop = () => { if (window.scrollY < 200) setActive(null); };
    window.addEventListener('scroll', onTop, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener('scroll', onTop); };
  }, [home, location.pathname]);

  // Hash links work from any route and respect reduced motion.
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }), 60);
    return () => window.clearTimeout(timer);
  }, [location.hash, location.pathname, reduce]);

  const go = (href: string) => {
    setOpen(false);
    if (href.startsWith('/#')) {
      const id = href.slice(2);
      if (home) {
        document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
        history.replaceState(null, '', href);
      } else navigate(href);
    } else navigate(href);
  };

  const accountHref = session ? '/console' : '/accesso';
  return <div className={'site' + (appRoute ? ' site--app' : '')}>
    <a href="#main-content" className="skip-link">Vai al contenuto</a>
    <header className={'nav-wrap' + (scrolled ? ' is-scrolled' : '') + (appRoute ? ' nav-wrap--app' : '')}>
      <div className="nav glass">
        <Brand />
        {!appRoute && <nav className="nav__links" aria-label="Navigazione principale">
          {marketingLinks.map(link => <a key={link.id} href={link.href}
            className={'nav__link' + (active === link.id ? ' is-active' : '')}
            aria-current={active === link.id ? (link.id === 'configura' ? 'page' : 'location') : undefined}
            onClick={event => { event.preventDefault(); go(link.href); }}>
            {active === link.id && <motion.span layoutId="nav-pill" className="nav__pill"
              transition={reduce ? { duration: 0 } : { type: 'spring', bounce: .18, duration: .5 }} />}
            <span>{link.label}</span>
          </a>)}
        </nav>}
        {appRoute && <nav className="nav__links nav__links--app" aria-label="Area organizzatori">
          <NavLink to="/console" end className={({ isActive }) => 'nav__link' + (isActive ? ' is-active' : '')}>I tuoi tornei</NavLink>
          <NavLink to="/account" className={({ isActive }) => 'nav__link' + (isActive ? ' is-active' : '')}>Account e dati</NavLink>
        </nav>}
        <div className="nav__actions">
          <ThemeToggle />
          <RouterLink to={accountHref} className="nav__login">{session ? 'Console' : 'Accedi'}</RouterLink>
          {!appRoute && <RouterLink to="/configura" className="btn btn--primary btn--sm nav__cta">Crea un torneo<ArrowForwardRoundedIcon /></RouterLink>}
          <IconButton className="nav__menu" aria-label={open ? 'Chiudi menu' : 'Apri menu'} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(value => !value)}>
            <MenuIcon open={open} />
          </IconButton>
        </div>
      </div>
    </header>

    <main id="main-content" className="main" tabIndex={-1}>
      <Suspense fallback={<div className="center-screen" role="status"><CircularProgress aria-label="Caricamento" /></div>}><Outlet /></Suspense>
    </main>

    {appRoute ? <footer className="app-footer">
      <div className="container app-footer__inner">
        <span>© {new Date().getFullYear()} ItalFUT · <MadeBy /></span>
        <nav aria-label="Documenti legali">
          <RouterLink to="/privacy-policy">Privacy</RouterLink>
          <RouterLink to="/terms-of-service">Termini</RouterLink>
          <RouterLink to="/cookie-policy">Cookie</RouterLink>
          <button type="button" onClick={openPreferences}>Preferenze cookie</button>
          <RouterLink to="/business">Operatore</RouterLink>
        </nav>
      </div>
    </footer> : <footer className="footer">
      <div className="footer__glow" aria-hidden="true" />
      <div className="container footer__grid">
        <div className="footer__intro">
          <Brand />
          <p>La piattaforma per organizzare tornei di calcio e farli seguire a squadre, giocatori e tifosi.</p>
          <RouterLink to="/configura" className="btn btn--primary">Configura il tuo torneo<ArrowForwardRoundedIcon /></RouterLink>
        </div>
        <nav className="footer__col" aria-labelledby="footer-product">
          <h2 id="footer-product">Prodotto</h2>
          {marketingLinks.map(link => <a key={link.id} href={link.href} onClick={event => { event.preventDefault(); go(link.href); }}>{link.label}</a>)}
        </nav>
        <nav className="footer__col" aria-labelledby="footer-org">
          <h2 id="footer-org">Organizzatori</h2>
          <RouterLink to={accountHref}>{session ? 'Console' : 'Accedi'}</RouterLink>
          {!session && <RouterLink to="/registrati">Crea un account</RouterLink>}
          {session && <RouterLink to="/account">Account e dati</RouterLink>}
        </nav>
        <nav className="footer__col" aria-labelledby="footer-legal">
          <h2 id="footer-legal">Legale</h2>
          <RouterLink to="/privacy-policy">Privacy policy</RouterLink>
          <RouterLink to="/terms-of-service">Termini di servizio</RouterLink>
          <RouterLink to="/refund-policy">Rimborsi e recesso</RouterLink>
          <RouterLink to="/cookie-policy">Cookie policy</RouterLink>
          <button type="button" onClick={openPreferences}>Preferenze cookie</button>
          <RouterLink to="/business">Informazioni sull’operatore</RouterLink>
        </nav>
      </div>
      <div className="container footer__bottom">
        <span>© {new Date().getFullYear()} ItalFUT{businessLine ? ' · ' + businessLine : ''}</span>
        <MadeBy />
      </div>
      <div className="footer__wordmark" aria-hidden="true"><span>ital</span>FUT</div>
    </footer>}

    <Drawer anchor="top" open={open} onClose={() => setOpen(false)} id="mobile-menu"
      slotProps={{ paper: { className: 'mobile-menu glass' } }}>
      <div className="mobile-menu__head"><Brand /><IconButton aria-label="Chiudi menu" onClick={() => setOpen(false)}><MenuIcon open /></IconButton></div>
      <nav className="mobile-menu__links" aria-label="Menu">
        {(appRoute ? [{ label: 'I tuoi tornei', href: '/console', id: 'c' }, { label: 'Account e dati', href: '/account', id: 'a' }] : marketingLinks).map((link, index) =>
          <motion.a key={link.id} href={link.href} onClick={event => { event.preventDefault(); go(link.href); }}
            initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: .04 + index * .05, duration: .45, ease: [.16, 1, .3, 1] }}>{link.label}</motion.a>)}
      </nav>
      <div className="mobile-menu__actions">
        <RouterLink to={accountHref} className="btn btn--ghost glass" onClick={() => setOpen(false)}>{session ? 'Console' : 'Accedi'}</RouterLink>
        <RouterLink to="/configura" className="btn btn--primary" onClick={() => setOpen(false)}>Crea un torneo<ArrowForwardRoundedIcon /></RouterLink>
      </div>
      <div className="mobile-menu__legal">
        <RouterLink to="/privacy-policy" onClick={() => setOpen(false)}>Privacy</RouterLink>
        <RouterLink to="/terms-of-service" onClick={() => setOpen(false)}>Termini</RouterLink>
        <RouterLink to="/cookie-policy" onClick={() => setOpen(false)}>Cookie</RouterLink>
        <ThemeToggle />
      </div>
    </Drawer>
  </div>;
}
