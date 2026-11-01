import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GlobalStyles } from '@mui/material';
import { StyledEngineProvider } from '@mui/material/styles';
import { AuthProvider } from './auth/AuthProvider';
import { AppearanceProvider } from './components/AppearanceProvider';
import { App } from './App';
import './styles.css';
import './styles.refined.css';
import './styles.community.css';
import './styles.glass.css';
import './styles.cinematic.css';
import './styles.phone.css';
import './styles.compliance.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StyledEngineProvider enableCssLayer>
      <GlobalStyles styles="@layer theme, base, mui, components, utilities;" />
      <AppearanceProvider>
        <AuthProvider>
          <BrowserRouter><App /></BrowserRouter>
        </AuthProvider>
      </AppearanceProvider>
    </StyledEngineProvider>
  </React.StrictMode>,
);
