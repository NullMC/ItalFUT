/*
 * Adapted from 21st.dev Animated Tabs by educalvolpz:
 * https://21st.dev/@educalvolpz/components/animated-tabs
 * Uses Motion shared-layout indicator; tailored to ItalFUT's MUI + Tailwind stack.
 */
import { useCallback, useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export type AnimatedTab = { id: string; label: string; icon?: ReactNode };

type AnimatedTabsProps = {
  tabs: AnimatedTab[];
  activeTab?: string;
  defaultTab?: string;
  onChange?: (id: string) => void;
  variant?: 'underline' | 'pill';
  className?: string;
  layoutId?: string;
  ariaLabel?: string;
  panelId?: string;
};

export function AnimatedTabs({
  tabs, activeTab: controlled, defaultTab, onChange, variant = 'underline',
  className = '', layoutId: requestedId, ariaLabel = 'Seleziona una vista', panelId,
}: AnimatedTabsProps) {
  const fallbackId = useId().replace(/:/g, '');
  const layoutId = requestedId ?? `itf-tabs-${fallbackId}`;
  const reduceMotion = useReducedMotion();
  const [internalActive, setInternalActive] = useState(defaultTab ?? tabs[0]?.id ?? '');
  const active = controlled ?? internalActive;

  const select = useCallback((id: string) => {
    if (controlled === undefined) setInternalActive(id);
    onChange?.(id);
  }, [controlled, onChange]);

  const handleKeys = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!tabs.length) return;
    let next = index;
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % tabs.length; break;
      case 'ArrowLeft': next = (index - 1 + tabs.length) % tabs.length; break;
      case 'Home': next = 0; break;
      case 'End': next = tabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    const target = tabs[next];
    if (!target) return;
    select(target.id);
    const nodes = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    nodes?.[next]?.focus();
  };

  return <div
    className={`itf-tabs itf-tabs--${variant} ${className}`}
    role="tablist"
    aria-label={ariaLabel}
  >
    {tabs.map((tab, index) => {
      const selected = active === tab.id;
      return <button
        type="button"
        role="tab"
        id={`${layoutId}-${tab.id}`}
        aria-selected={selected}
        aria-controls={panelId}
        tabIndex={selected ? 0 : -1}
        className="itf-tab"
        key={tab.id}
        onClick={() => select(tab.id)}
        onKeyDown={event => handleKeys(event, index)}
      >
        {selected && <motion.span
          className="itf-tab__indicator"
          aria-hidden="true"
          layoutId={layoutId}
          layout
          initial={false}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', duration: 0.27, bounce: 0.06 }}
        />}
        {tab.icon && <span className="itf-tab__icon" aria-hidden="true">{tab.icon}</span>}
        <span className="itf-tab__label">{tab.label}</span>
      </button>;
    })}
  </div>;
}
