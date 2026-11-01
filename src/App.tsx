import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { useAuth } from './auth/AuthProvider';
import { Landing } from './pages/Landing';
import { SiteLayout } from './components/SiteLayout';
import { CookieSettingsProvider } from './components/CookieNotice';

// Route-level code splitting keeps the landing bundle small.
const Configurator = lazy(() => import('./pages/Configurator').then(m => ({ default: m.Configurator })));
const Access = lazy(() => import('./pages/Access').then(m => ({ default: m.Access })));
const ConsoleHome = lazy(() => import('./pages/Console').then(m => ({ default: m.ConsoleHome })));
const TenantConsole = lazy(() => import('./pages/Console').then(m => ({ default: m.TenantConsole })));
const Tournament = lazy(() => import('./pages/Tournament').then(m => ({ default: m.Tournament })));
const LegalPage = lazy(() => import('./pages/Legal').then(m => ({ default: m.LegalPage })));
const AccountSettings = lazy(() => import('./pages/AccountSettings').then(m => ({ default: m.AccountSettings })));

const Loading = () => <div className="center-screen" role="status" aria-live="polite"><CircularProgress aria-label="Caricamento" /></div>;

function Private({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/accesso" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

const titles: [RegExp, string][] = [
  [/^\/$/, 'ItalFUT — Il tuo torneo, tutto in campo'],
  [/^\/configura/, 'Configura il torneo · ItalFUT'],
  [/^\/accesso/, 'Accedi · ItalFUT'],
  [/^\/registrati/, 'Crea un account · ItalFUT'],
  [/^\/reimposta-password/, 'Reimposta password · ItalFUT'],
  [/^\/console/, 'Console · ItalFUT'],
  [/^\/account/, 'Account e dati · ItalFUT'],
  [/^\/privacy-policy/, 'Privacy policy · ItalFUT'],
  [/^\/terms-of-service/, 'Termini di servizio · ItalFUT'],
  [/^\/refund-policy/, 'Rimborsi e recesso · ItalFUT'],
  [/^\/cookie-policy/, 'Cookie policy · ItalFUT'],
  [/^\/business/, 'Informazioni sull’operatore · ItalFUT'],
];

/** Restores scroll on navigation and keeps document titles meaningful for assistive tech. */
function RouteEffects() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    const match = titles.find(([pattern]) => pattern.test(pathname));
    if (match) document.title = match[1];
  }, [pathname, hash]);
  return null;
}

export function App() {
  return <CookieSettingsProvider>
    <RouteEffects />
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/configura" element={<Configurator />} />
          <Route path="/accesso" element={<Access />} />
          <Route path="/registrati" element={<Access register />} />
          <Route path="/reimposta-password" element={<Access reset />} />
          <Route path="/privacy-policy" element={<LegalPage page="privacy" />} />
          <Route path="/terms-of-service" element={<LegalPage page="terms" />} />
          <Route path="/refund-policy" element={<LegalPage page="refund" />} />
          <Route path="/cookie-policy" element={<LegalPage page="cookies" />} />
          <Route path="/business" element={<LegalPage page="business" />} />
          <Route path="/account" element={<Private><AccountSettings /></Private>} />
          <Route path="/console" element={<Private><ConsoleHome /></Private>} />
          <Route path="/console/:slug" element={<Private><TenantConsole /></Private>} />
          <Route path="/console/:slug/:section" element={<Private><TenantConsole /></Private>} />
        </Route>
        <Route path="/t/:slug/*" element={<Tournament />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </CookieSettingsProvider>;
}
