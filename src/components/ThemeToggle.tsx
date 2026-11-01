/*
 * Animated sun/moon switch, adapted from the 21st.dev "Theme Switch" pattern
 * (zweiundeins) with a View Transitions circular reveal.
 */
import { useAppearance } from './AppearanceProvider';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { mode, toggleTheme } = useAppearance();
  const dark = mode === 'dark';
  return <button
    type="button"
    className={'theme-toggle glass ' + className}
    onClick={event => {
      const box = event.currentTarget.getBoundingClientRect();
      toggleTheme({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
    }}
    aria-label={dark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
    title={dark ? 'Tema chiaro' : 'Tema scuro'}
  >
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className={'theme-toggle__icon' + (dark ? ' is-dark' : '')}>
      <mask id="theme-toggle-moon">
        <rect x="0" y="0" width="24" height="24" fill="white" />
        <circle className="theme-toggle__cut" cx="17" cy="7" r="6" fill="black" />
      </mask>
      <circle className="theme-toggle__core" cx="12" cy="12" r="5" fill="currentColor" mask="url(#theme-toggle-moon)" />
      <g className="theme-toggle__rays" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="1.5" x2="12" y2="3.5" /><line x1="12" y1="20.5" x2="12" y2="22.5" />
        <line x1="1.5" y1="12" x2="3.5" y2="12" /><line x1="20.5" y1="12" x2="22.5" y2="12" />
        <line x1="4.6" y1="4.6" x2="6" y2="6" /><line x1="18" y1="18" x2="19.4" y2="19.4" />
        <line x1="4.6" y1="19.4" x2="6" y2="18" /><line x1="18" y1="6" x2="19.4" y2="4.6" />
      </g>
    </svg>
  </button>;
}
