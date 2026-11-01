import { createTheme } from '@mui/material/styles';

const display = '"Barlow Condensed", "Arial Narrow", sans-serif';
const interfaceFont = '"DM Sans", sans-serif';

export type AppearanceMode = 'light' | 'dark';

export function createItalFutTheme(mode: AppearanceMode) {
  const dark = mode === 'dark';
  return createTheme({
  palette: {
    mode,
    primary: { main: dark ? '#8ce0bb' : '#0f7058', dark: dark ? '#53ba8d' : '#104c3e', light: dark ? '#a7ebc9' : '#36866e', contrastText: dark ? '#10251d' : '#ffffff' },
    secondary: { main: '#c6e978', dark: '#add65c', contrastText: '#102820' },
    background: { default: dark ? '#0e1717' : '#f4efe4', paper: dark ? '#192623' : '#fffdfa' },
    text: { primary: dark ? '#ecf5ef' : '#193329', secondary: dark ? '#bed0c6' : '#536359' },
    divider: dark ? '#344840' : '#d2cbbb',
    success: { main: '#23694b' },
  },
  typography: {
    fontFamily: interfaceFont,
    h1: { fontFamily: display, fontWeight: 800, lineHeight: .95, letterSpacing: '-0.015em' },
    h2: { fontFamily: display, fontWeight: 750, lineHeight: 1.02, letterSpacing: '-0.015em' },
    h3: { fontFamily: display, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.012em' },
    h4: { fontFamily: interfaceFont, fontWeight: 750, lineHeight: 1.2, letterSpacing: '-0.025em' },
    h5: { fontFamily: interfaceFont, fontWeight: 700, lineHeight: 1.27, letterSpacing: '-0.018em' },
    button: { fontFamily: interfaceFont, textTransform: 'none', fontWeight: 750, letterSpacing: '-0.01em' },
    body1: { fontSize: '1rem', lineHeight: 1.65 },
    body2: { fontSize: '.875rem', lineHeight: 1.6 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 43, borderRadius: 10, padding: '10px 18px', transition: 'background-color .18s ease, border-color .18s ease, color .18s ease' },
        sizeLarge: { minHeight: 52, padding: '12px 23px', fontSize: '0.96rem' },
        outlined: { borderWidth: 1.25 },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTextField: { defaultProps: { size: 'medium', fullWidth: true } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10, backgroundColor: dark ? '#192623' : '#fffdfa' } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 650, borderRadius: 7 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 18 } } },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 9 } } },
    MuiLink: { styleOverrides: { root: { textUnderlineOffset: '3px' } } },
  },
  });
}

// Default export retained for compatibility with existing theme-aware utilities.
export const theme = createItalFutTheme('light');
