import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#153e35', contrastText: '#fff' },
    secondary: { main: '#bde966', contrastText: '#071c1a' },
    background: { default: '#f7f8f5', paper: '#ffffff' },
    text: { primary: '#102520', secondary: '#64756d' },
    divider: '#e4e9e3',
  },
  typography: {
    fontFamily: '"DM Sans", sans-serif',
    h1: { fontFamily: '"Manrope", sans-serif', fontWeight: 800, letterSpacing: '-0.035em' },
    h2: { fontFamily: '"Manrope", sans-serif', fontWeight: 800, letterSpacing: '-0.03em' },
    h3: { fontFamily: '"Manrope", sans-serif', fontWeight: 800, letterSpacing: '-0.025em' },
    h4: { fontFamily: '"Manrope", sans-serif', fontWeight: 800, letterSpacing: '-0.02em' },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 11, padding: '10px 19px' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
  },
});
