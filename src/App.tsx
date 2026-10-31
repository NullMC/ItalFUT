import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import type { ReactNode } from 'react';
import { useAuth } from './auth/AuthProvider';
import { Landing } from './pages/Landing';
import { Configurator } from './pages/Configurator';
import { Access } from './pages/Access';
import { ConsoleHome, TenantConsole } from './pages/Console';
import { Tournament } from './pages/Tournament';
import { SiteLayout } from './components/SiteLayout';

function Private({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="center-screen"><CircularProgress /></div>;
  if (!session) return <Navigate to="/accesso" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

export function App() {
  return <Routes>
    <Route element={<SiteLayout />}>
      <Route path="/" element={<Landing />} />
      <Route path="/configura" element={<Configurator />} />
      <Route path="/accesso" element={<Access />} />
      <Route path="/registrati" element={<Access register />} />
      <Route path="/console" element={<Private><ConsoleHome /></Private>} />
      <Route path="/console/:slug" element={<Private><TenantConsole /></Private>} />
      <Route path="/console/:slug/:section" element={<Private><TenantConsole /></Private>} />
    </Route>
    <Route path="/t/:slug/*" element={<Tournament />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
