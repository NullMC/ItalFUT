import { createTheme } from '@mui/material/styles';

const display = '"Barlow Condensed", "Arial Narrow", sans-serif';
const interfaceFont = '"DM Sans", sans-serif';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#173d32', dark: '#102b24', light: '#42695b', contrastText: '#ffffff' },
    secondary: { main: '#c6e978', dark: '#add65c', contrastText: '#102820' },
    background: { default: '#f5f6f1', paper: '#ffffff' },
    text: { primary: '#142b24', secondary: '#52665d' },
    divider: '#dfe5dc',
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
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10, backgroundColor: '#ffffff' } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 650, borderRadius: 7 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 18 } } },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 9 } } },
    MuiLink: { styleOverrides: { root: { textUnderlineOffset: '3px' } } },
  },
});
