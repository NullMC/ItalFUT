/*
 * Adapted interaction concept: 21st.dev Theme Switch by zweiundeins
 * https://21st.dev/@zweiundeins/components/theme-switch
 * MUI control + persistent AppearanceProvider, avoids injecting a second UI framework.
 */
import { IconButton, Tooltip } from '@mui/material';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import { useAppearance } from './AppearanceProvider';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { mode, toggleTheme } = useAppearance();
  const next = mode === 'dark' ? 'chiaro' : 'scuro';
  return <Tooltip title={`Passa al tema ${next}`}>
    <IconButton
      type="button"
      color="inherit"
      onClick={toggleTheme}
      className={`itf-theme-toggle liquid-glass ${className}`}
      aria-label={`Attiva tema ${next}`}
      aria-pressed={mode === 'dark'}
      sx={{ width: 42, height: 42 }}
    >
      {mode === 'dark' ? <LightModeRoundedIcon fontSize="small" /> : <DarkModeRoundedIcon fontSize="small" />}
    </IconButton>
  </Tooltip>;
}
