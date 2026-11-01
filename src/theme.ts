import { createTheme } from '@mui/material/styles';

export type AppearanceMode = 'light' | 'dark';

export const fonts = {
  sans: '"Geist Variable", "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  serif: '"Instrument Serif", ui-serif, Georgia, serif',
  display: '"Big Shoulders Display Variable", "Big Shoulders Display", "Arial Narrow", sans-serif',
};

/**
 * MUI theme mirrors the CSS tokens in src/styles/tokens.css so native
 * components (inputs, dialogs, menus) match the custom surfaces in both modes.
 */
export function createItalFutTheme(mode: AppearanceMode) {
  const dark = mode === 'dark';
  const ink = dark ? '#eef4ef' : '#0c1712';
  const paper = dark ? '#0f1915' : '#ffffff';
  return createTheme({
    palette: {
      mode,
      primary: { main: dark ? '#c6f36a' : '#0f6b4a', dark: dark ? '#a9d94c' : '#0a5238', light: dark ? '#d9f99a' : '#2f8a66', contrastText: dark ? '#0b1a06' : '#ffffff' },
      secondary: { main: '#c6f36a', dark: '#a9d94c', contrastText: '#0b1a06' },
      error: { main: dark ? '#ff8a7a' : '#b42318' },
      warning: { main: dark ? '#f5c463' : '#a15c07' },
      success: { main: dark ? '#5fe0a3' : '#0f7a4f' },
      info: { main: dark ? '#7cc4ff' : '#175cd3' },
      background: { default: dark ? '#050a08' : '#f3f2ec', paper },
      text: { primary: ink, secondary: dark ? '#b3c3b9' : '#45534b' },
      divider: dark ? 'rgba(255,255,255,0.1)' : 'rgba(12,23,18,0.11)',
    },
    typography: {
      fontFamily: fonts.sans,
      h1: { fontWeight: 620, letterSpacing: '-0.045em', lineHeight: 0.98 },
      h2: { fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1.02 },
      h3: { fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.08 },
      h4: { fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.15 },
      h5: { fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.25 },
      h6: { fontWeight: 600, letterSpacing: '-0.015em' },
      button: { textTransform: 'none', fontWeight: 560, letterSpacing: '-0.01em' },
      body1: { fontSize: '1rem', lineHeight: 1.6 },
      body2: { fontSize: '.9rem', lineHeight: 1.55 },
    },
    shape: { borderRadius: 14 },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            minHeight: 44, borderRadius: 999, padding: '10px 20px',
            transition: 'transform .18s cubic-bezier(.2,.8,.2,1), background-color .18s ease, border-color .18s ease, color .18s ease, box-shadow .18s ease',
            '&:active': { transform: 'scale(.98)' },
          },
          sizeLarge: { minHeight: 52, padding: '13px 26px', fontSize: '1rem' },
          sizeSmall: { minHeight: 36, padding: '6px 14px' },
          containedPrimary: dark
            ? { boxShadow: '0 0 0 1px rgba(255,255,255,.18) inset, 0 10px 30px -10px rgba(198,243,106,.55)' }
            : { backgroundColor: '#0c1712', color: '#f6f6f1', '&:hover': { backgroundColor: '#1d2b24' } },
          outlined: { borderColor: dark ? 'rgba(255,255,255,.2)' : 'rgba(12,23,18,.2)' },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiTextField: { defaultProps: { fullWidth: true } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            backgroundColor: dark ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.75)',
            transition: 'box-shadow .18s ease, background-color .18s ease',
            '&.Mui-focused': { boxShadow: dark ? '0 0 0 4px rgba(198,243,106,.14)' : '0 0 0 4px rgba(15,107,74,.12)' },
          },
          notchedOutline: { borderColor: dark ? 'rgba(255,255,255,.14)' : 'rgba(12,23,18,.16)' },
        },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 560, borderRadius: 999 } } },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 24,
            border: dark ? '1px solid rgba(255,255,255,.1)' : '1px solid rgba(12,23,18,.08)',
            background: dark ? 'rgba(14,24,20,.92)' : 'rgba(255,255,255,.94)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            boxShadow: '0 40px 120px -30px rgba(0,0,0,.55)',
          },
        },
      },
      MuiBackdrop: { styleOverrides: { root: { backgroundColor: 'rgba(3,8,6,.55)', backdropFilter: 'blur(6px)' } } },
      MuiDialogTitle: { styleOverrides: { root: { fontWeight: 620, letterSpacing: '-0.02em' } } },
      MuiIconButton: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 14, alignItems: 'center' } } },
      MuiTooltip: { styleOverrides: { tooltip: { borderRadius: 10, fontSize: '.78rem', fontWeight: 500, backgroundColor: dark ? '#e9f0ea' : '#0c1712', color: dark ? '#0c1712' : '#f3f2ec' } } },
      MuiMenu: { styleOverrides: { paper: { borderRadius: 16 } } },
      MuiLink: { styleOverrides: { root: { textUnderlineOffset: '3px' } } },
    },
  });
}
