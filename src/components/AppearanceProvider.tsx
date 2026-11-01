import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { createItalFutTheme, type AppearanceMode } from '../theme';

type Origin = { x: number; y: number };
type ThemeContextValue = { mode: AppearanceMode; toggleTheme: (origin?: Origin) => void; setMode: (next: AppearanceMode) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'italfut-appearance';
const THEME_COLOR: Record<AppearanceMode, string> = { dark: '#050a08', light: '#f3f2ec' };

function preferredAppearance(): AppearanceMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppearanceMode>(preferredAppearance);
  const muiTheme = useMemo(() => createItalFutTheme(mode), [mode]);

  // Circular reveal from the toggle (View Transitions API). Falls back to an
  // instant switch when unsupported or when the user prefers reduced motion.
  const toggleTheme = useCallback((origin?: Origin) => {
    const next: AppearanceMode = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    const doc = document as ViewTransitionDocument;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!doc.startViewTransition || reduce || !origin) { setMode(next); return; }
    const radius = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
    const transition = doc.startViewTransition(() => { flushSync(() => setMode(next)); });
    void transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`] },
        { duration: 520, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' },
      );
    }).catch(() => { /* transition skipped */ });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = THEME_COLOR[mode];
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* storage unavailable */ }
  }, [mode]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && (event.newValue === 'light' || event.newValue === 'dark')) setMode(event.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({ mode, setMode, toggleTheme }), [mode, toggleTheme]);
  return <ThemeContext.Provider value={value}><MuiThemeProvider theme={muiTheme}><CssBaseline enableColorScheme />{children}</MuiThemeProvider></ThemeContext.Provider>;
}

export function useAppearance() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppearance must be used inside AppearanceProvider');
  return ctx;
}
