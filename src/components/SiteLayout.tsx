import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Outlet, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Container, Drawer, IconButton, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useAuth } from '../auth/AuthProvider';
import { ThemeToggle } from './ThemeToggle';
import { useCookiePreferences } from './CookieNotice';
import { legalConfig, legalNeedsReview } from '../config/legal';

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return <RouterLink to="/" aria-label="ItalFUT, torna alla home" className={'brand ' + (inverted ? 'brand-light' : '')}>
    <span>ital<span className="brand-strong">FUT</span><span className="brand-dot">.</span></span>
  </RouterLink>;
}

export function SiteLayout() {
  const { session } = useAuth();
  const { openPreferences } = useCookiePreferences();
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const home = location.pathname === '/';
  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveNav(location.pathname === '/configura' ? '/configura' : null);
      return;
    }
    const ids = ['funzionalita', 'come-funziona'];
    const observer = new IntersectionObserver(entries => {
      const seen = entries.find(entry => entry.isIntersecting);
      if (seen) setActiveNav('/#' + seen.target.id);
    }, { rootMargin: '-22% 0px -64% 0px' });
    ids.forEach(id => { const element = document.getElementById(id); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [location.pathname]);
  const links = [
    { label: 'Funzionalità', href: '/#funzionalita' },
    { label: 'Come funziona', href: '/#come-funziona' },
    { label: 'Prezzi e moduli', href: '/configura' },
  ];
  const go = (href: string) => {
    setOpen(false);
    if (href.includes('#')) {
      const id = href.split('#')[1];
      if (location.pathname === '/') document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      else { navigate('/'); window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 70); }
    } else navigate(href);
  };
  return <div className="app-root min-h-screen">
    <a href="#main-content" className="skip-link">Vai al contenuto</a>
    <header className={'topbar topbar-glass ' + (home ? 'topbar-home' : '')}>
      <Container maxWidth="xl" className="topbar-inner">
        <Brand />
        <nav className="desktop-links" aria-label="Navigazione principale">
          {links.map(link => <button key={link.label} type="button"
            className={'desktop-nav-link' + (activeNav === link.href ? ' is-active' : '')}
            aria-current={activeNav === link.href ? 'page' : undefined}
            onClick={() => { setActiveNav(link.href); go(link.href); }}>
            {link.label}
            {activeNav === link.href && <motion.span layoutId="itf-nav-track" className="desktop-nav-track"
              transition={reducedMotion ? { duration: 0 } : { type: 'spring', duration: .28, bounce: 0 }} aria-hidden="true" />}
          </button>)}
        </nav>
        <Stack direction="row" spacing={1} alignItems="center"><ThemeToggle />
          <Button onClick={() => navigate(session ? '/console' : '/accesso')} variant="text" color="inherit" className="desktop-login">
            {session ? 'Console' : 'Accedi'}
          </Button>
          <Button onClick={() => navigate('/configura')} variant="contained" color="primary" className="desktop-cta" endIcon={<ArrowForwardRoundedIcon />}>Crea un torneo</Button>
          <IconButton className="mobile-menu" aria-label="Apri menu" aria-expanded={open} onClick={() => setOpen(true)}><MenuRoundedIcon /></IconButton>
        </Stack>
      </Container>
    </header>
    <main id="main-content" className="main-area"><Outlet /></main>
    <footer className="site-footer site-footer-cinematic">
      <Container maxWidth="xl" className="footer-grid">
        <div><Brand inverted /><Typography variant="body2" sx={{ mt: 1.5, color: '#c8d7cc', maxWidth: 320 }}>Il tuo torneo, tutto in campo.</Typography></div>
        <nav className="footer-links" aria-label="Collegamenti footer">
          <RouterLink to="/configura">Configura un torneo</RouterLink>
          <RouterLink to={session ? '/console' : '/accesso'}>Area organizzatori</RouterLink>
          {session && <RouterLink to="/account">Account e dati</RouterLink>}
          <RouterLink to="/privacy-policy">Privacy policy</RouterLink>
          <RouterLink to="/terms-of-service">Termini di servizio</RouterLink>
          <RouterLink to="/refund-policy">Rimborsi e recesso</RouterLink>
          <RouterLink to="/cookie-policy">Cookie policy</RouterLink>
          <RouterLink to="/business">Informazioni operatore</RouterLink>
          <button className="footer-privacy-button" type="button" onClick={openPreferences}>Preferenze cookie</button>
        </nav>
        <div className="footer-business">
          <Typography variant="caption" sx={{ color: '#c8d7cc' }}>© {new Date().getFullYear()} ItalFUT · {legalNeedsReview ? 'Informazioni legali in revisione' : legalConfig.operatorName}</Typography>
          {legalConfig.vatNumber && <Typography variant="caption" sx={{ color: '#c8d7cc' }}>P. IVA {legalConfig.vatNumber}</Typography>}
          {legalConfig.registeredOffice && <Typography variant="caption" sx={{ color: '#c8d7cc' }}>{legalConfig.registeredOffice}</Typography>}
        </div>
        <div className="footer-wordmark" aria-hidden="true">ITALFUT</div>
      </Container>
    </footer>
    <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
      <Box className="itf-mobile-drawer" sx={{ width: { xs: 'min(88vw, 360px)', sm: 340 }, p: 3 }}><Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}><Brand /><IconButton aria-label="Chiudi menu" onClick={() => setOpen(false)}><CloseRoundedIcon /></IconButton></Stack>
        <Stack spacing={1}>{links.map(link => <Button key={link.label} fullWidth sx={{ justifyContent: 'flex-start' }} onClick={() => go(link.href)}>{link.label}</Button>)}
          <Button onClick={() => go(session ? '/console' : '/accesso')}>{session ? 'Console' : 'Accedi'}</Button>
          <Button variant="contained" onClick={() => go('/configura')}>Crea un torneo</Button>
          {session && <Button component={RouterLink} to="/account" onClick={() => setOpen(false)}>Account e dati</Button>
          <Button component={RouterLink} to="/privacy-policy" onClick={() => setOpen(false)}>Privacy e documenti</Button>
        </Stack>
      </Box>
    </Drawer>
  </div>;
}
