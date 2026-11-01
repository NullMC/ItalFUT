import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GlobalStyles } from '@mui/material';
import { StyledEngineProvider } from '@mui/material/styles';
import '@fontsource-variable/geist/wght';
import '@fontsource/instrument-serif/latin-400';
import '@fontsource/instrument-serif/latin-400-italic';
import '@fontsource-variable/big-shoulders-display/wght';
import { AuthProvider } from './auth/AuthProvider';
import { AppearanceProvider } from './components/AppearanceProvider';
import { App } from './App';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/landing.css';
import './styles/phone.css';
import './styles/pages.css';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StyledEngineProvider enableCssLayer>
      <GlobalStyles styles="@layer reset, mui;" />
      <AppearanceProvider>
        <AuthProvider>
          <BrowserRouter><App /></BrowserRouter>
        </AuthProvider>
      </AppearanceProvider>
    </StyledEngineProvider>
  </React.StrictMode>,
);
