import { Suspense, useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { useAuth } from './auth/AuthProvider';
import { Landing } from './pages/Landing';
import { SiteLayout } from './components/SiteLayout';
import { CookieSettingsProvider } from './components/CookieNotice';
import { ErrorBoundary, lazyPage } from './components/ErrorBoundary';
import { ErrorRoute, NotFound } from './pages/ErrorPage';
import { applySeo, ROUTES } from './lib/seo';

// Route-level code splitting keeps the landing bundle small.
const Configurator = lazyPage(() => import('./pages/Configurator').then(m => ({ default: m.Configurator })));
const Access = lazyPage(() => import('./pages/Access').then(m => ({ default: m.Access })));
const ConsoleHome = lazyPage(() => import('./pages/Console').then(m => ({ default: m.ConsoleHome })));
const TenantConsole = lazyPage(() => import('./pages/Console').then(m => ({ default: m.TenantConsole })));
const Tournament = lazyPage(() => import('./pages/Tournament').then(m => ({ default: m.Tournament })));
const LegalPage = lazyPage(() => import('./pages/Legal').then(m => ({ default: m.LegalPage })));
const Contact = lazyPage(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const AdminDashboard = lazyPage(() => import('./admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const PaymentResult = lazyPage(() => import('./pages/PaymentResult').then(m => ({ default: m.PaymentResult })));
const AccountSettings = lazyPage(() => import('./pages/AccountSettings').then(m => ({ default: m.AccountSettings })));

const Loading = () => <div className="center-screen" role="status" aria-live="polite"><CircularProgress aria-label="Caricamento" /></div>;

function Private({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/accesso" state={{ from: location.pathname, reason: 'auth' }} replace />;
  return <>{children}</>;
}

/** Restores scroll on navigation; title, description, canonical and robots per route. */
function RouteEffects() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    // Tournament sites (/t/…) set their own tags once the tournament is loaded.
    if (pathname.startsWith('/t/')) return;
    const match = ROUTES.find(([pattern]) => pattern.test(pathname));
    applySeo(match ? { ...match[1], path: pathname } : { title: 'Pagina non trovata · ItalFUT', noindex: true });
  }, [pathname, hash]);
  return null;
}

export function App() {
  const { pathname } = useLocation();
  return <CookieSettingsProvider>
    <RouteEffects />
    <ErrorBoundary resetKey={pathname}>
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/configura" element={<Configurator />} />
          <Route path="/accesso" element={<Access />} />
          <Route path="/registrati" element={<Access register />} />
          <Route path="/contatti" element={<Contact />} />
          <Route path="/privacy-policy" element={<LegalPage page="privacy" />} />
          <Route path="/terms-of-service" element={<LegalPage page="terms" />} />
          <Route path="/refund-policy" element={<LegalPage page="refund" />} />
          <Route path="/cookie-policy" element={<LegalPage page="cookies" />} />
          <Route path="/business" element={<LegalPage page="business" />} />
          <Route path="/account" element={<Private><AccountSettings /></Private>} />
          <Route path="/pagamento/esito" element={<Private><PaymentResult /></Private>} />
          <Route path="/console" element={<Private><ConsoleHome /></Private>} />
          <Route path="/console/:slug" element={<Private><TenantConsole /></Private>} />
          <Route path="/console/:slug/:section" element={<Private><TenantConsole /></Private>} />
          <Route path="/admin" element={<Private><AdminDashboard /></Private>} />
          <Route path="/admin/:table" element={<Private><AdminDashboard /></Private>} />
          <Route path="/errore/:code" element={<ErrorRoute />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/t/:slug/*" element={<Tournament />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  </CookieSettingsProvider>;
}
