import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { createItalFutTheme, type AppearanceMode } from '../theme';

type ThemeContextValue = { mode: AppearanceMode; toggleTheme: () => void; setMode: (next: AppearanceMode) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'italfut-appearance';

function preferredAppearance(): AppearanceMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppearanceMode>(preferredAppearance);
  const muiTheme = useMemo(() => createItalFutTheme(mode), [mode]);
  const toggleTheme = useCallback(() => setMode(current => current === 'light' ? 'dark' : 'light'), []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = mode === 'dark' ? '#0e1717' : '#102b24';
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* privacy/storage restrictions */ }
  }, [mode]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && (event.newValue === 'light' || event.newValue === 'dark')) setMode(event.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({ mode, setMode, toggleTheme }), [mode, toggleTheme]);
  return <ThemeContext.Provider value={value}><MuiThemeProvider theme={muiTheme}><CssBaseline />{children}</MuiThemeProvider></ThemeContext.Provider>;
}

export function useAppearance() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppearance must be used inside AppearanceProvider');
  return ctx;
}
