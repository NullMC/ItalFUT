import { useState } from 'react';
import { Outlet, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Container, Drawer, IconButton, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import StadiumRoundedIcon from '@mui/icons-material/StadiumRounded';
import { useAuth } from '../auth/AuthProvider';

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return <RouterLink to="/" aria-label="ItalFUT, torna alla home" className={'brand ' + (inverted ? 'brand-light' : '')}>
    <span className="brand-emblem"><StadiumRoundedIcon sx={{ fontSize: 21 }} /></span>
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
    { label: 'Prezzi', href: '/configura' },
  ];
  const go = (href: string) => {
    setOpen(false);
    if (href.includes('#')) {
      navigate('/');
      window.setTimeout(() => document.getElementById(href.split('#')[1])?.scrollIntoView({ behavior: 'smooth' }), 50);
    } else navigate(href);
  };
  return <div className="app-root">
    <header className={'topbar ' + (home ? 'topbar-home' : '')}>
      <Container maxWidth="xl" className="topbar-inner">
        <Brand />
        <nav className="desktop-links" aria-label="Navigazione principale">
          {links.map(link => <button key={link.label} onClick={() => go(link.href)}>{link.label}</button>)}
        </nav>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button onClick={() => navigate(session ? '/console' : '/accesso')} variant="text" color="inherit" className="desktop-login">
            {session ? 'La tua console' : 'Accedi'}
          </Button>
          <Button onClick={() => navigate('/configura')} variant="contained" color="primary" className="desktop-cta" endIcon={<ArrowForwardRoundedIcon />}>Crea il tuo torneo</Button>
          <IconButton className="mobile-menu" aria-label="Apri menu" onClick={() => setOpen(true)}><MenuRoundedIcon /></IconButton>
        </Stack>
      </Container>
    </header>
    <main className="main-area"><Outlet /></main>
    <footer className="site-footer">
      <Container maxWidth="xl" className="footer-grid">
        <div><Brand inverted /><Typography variant="body2" sx={{ mt: 2, color: '#a1b3a9', maxWidth: 290 }}>Il calcio, organizzato meglio. Ogni torneo ha la sua identità.</Typography></div>
        <div className="footer-links"><RouterLink to="/configura">Configura il tuo spazio</RouterLink><RouterLink to={session ? '/console' : '/accesso'}>Area organizzatori</RouterLink><span>Pagamenti Stripe: prossimamente</span></div>
        <Typography variant="caption" sx={{ color: '#8da39a' }}>© {new Date().getFullYear()} ItalFUT · Progetto in sviluppo</Typography>
      </Container>
    </footer>
    <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
      <Box sx={{ width: 290, p: 3 }}><Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}><Brand /><IconButton aria-label="Chiudi menu" onClick={() => setOpen(false)}><CloseRoundedIcon /></IconButton></Stack>
        <Stack spacing={1}>{links.map(link => <Button key={link.label} fullWidth sx={{ justifyContent: 'flex-start' }} onClick={() => go(link.href)}>{link.label}</Button>)}
          <Button onClick={() => go(session ? '/console' : '/accesso')}>{session ? 'La tua console' : 'Accedi'}</Button>
          <Button variant="contained" onClick={() => go('/configura')}>Crea il tuo torneo</Button>
        </Stack>
      </Box>
    </Drawer>
  </div>;
}
