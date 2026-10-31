import { useState } from 'react';
import { Outlet, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Container, Drawer, IconButton, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import { useAuth } from '../auth/AuthProvider';

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return <RouterLink to="/" aria-label="ItalFUT, torna alla home" className={'brand ' + (inverted ? 'brand-light' : '')}>
    <span className="brand-emblem"><SportsSoccerRoundedIcon sx={{ fontSize: 20 }} /></span>
    <span>ital<span className="brand-strong">FUT</span><span className="brand-dot">.</span></span>
  </RouterLink>;
}

export function SiteLayout() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const home = location.pathname === '/';
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
    <header className={'topbar ' + (home ? 'topbar-home' : '')}>
      <Container maxWidth="xl" className="topbar-inner">
        <Brand />
        <nav className="desktop-links" aria-label="Navigazione principale">
          {links.map(link => <button key={link.label} onClick={() => go(link.href)}>{link.label}</button>)}
        </nav>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button onClick={() => navigate(session ? '/console' : '/accesso')} variant="text" color="inherit" className="desktop-login">
            {session ? 'Console' : 'Accedi'}
          </Button>
          <Button onClick={() => navigate('/configura')} variant="contained" color="primary" className="desktop-cta" endIcon={<ArrowForwardRoundedIcon />}>Crea un torneo</Button>
          <IconButton className="mobile-menu" aria-label="Apri menu" aria-expanded={open} onClick={() => setOpen(true)}><MenuRoundedIcon /></IconButton>
        </Stack>
      </Container>
    </header>
    <main id="main-content" className="main-area"><Outlet /></main>
    <footer className="site-footer">
      <Container maxWidth="xl" className="footer-grid">
        <div><Brand inverted /><Typography variant="body2" sx={{ mt: 1.5, color: '#c8d7cc', maxWidth: 320 }}>Il tuo torneo, tutto in campo.</Typography></div>
        <div className="footer-links"><RouterLink to="/configura">Configura un torneo</RouterLink><RouterLink to={session ? '/console' : '/accesso'}>Area organizzatori</RouterLink></div>
        <Typography variant="caption" sx={{ color: '#c8d7cc' }}>© {new Date().getFullYear()} ItalFUT · Versione in sviluppo</Typography>
      </Container>
    </footer>
    <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
      <Box sx={{ width: 300, p: 3 }}><Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}><Brand /><IconButton aria-label="Chiudi menu" onClick={() => setOpen(false)}><CloseRoundedIcon /></IconButton></Stack>
        <Stack spacing={1}>{links.map(link => <Button key={link.label} fullWidth sx={{ justifyContent: 'flex-start' }} onClick={() => go(link.href)}>{link.label}</Button>)}
          <Button onClick={() => go(session ? '/console' : '/accesso')}>{session ? 'Console' : 'Accedi'}</Button>
          <Button variant="contained" onClick={() => go('/configura')}>Crea un torneo</Button>
        </Stack>
      </Box>
    </Drawer>
  </div>;
}
