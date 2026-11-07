/*
 * Scroll and entrance choreography. Patterns adapted from 21st.dev
 * "Text Effect / Blur In" (word stagger), "Scroll Reveal" and "Spotlight Card".
 * All variants collapse to static content with prefers-reduced-motion.
 */
import { motion, useReducedMotion } from 'motion/react';
import { Children, type CSSProperties, type ElementType, type PointerEvent, type ReactNode } from 'react';

const ease = [.16, 1, .3, 1] as const;

export function Reveal({ children, className = '', delay = 0, y = 26, as = 'div' }: {
  children: ReactNode; className?: string; delay?: number; y?: number; as?: 'div' | 'li' | 'section' | 'article';
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return <Tag
    className={className}
    initial={reduce ? false : { opacity: 0, y, filter: 'blur(6px)' }}
    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    // Trigger on the element's top edge, not on a share of its height: tall cards on
    // phones would otherwise stay faded while already on screen.
    viewport={{ once: true, amount: 'some', margin: '0px 0px -10% 0px' }}
    transition={{ duration: .7, delay, ease }}
  >{children}</Tag>;
}

/** Splits plain-text children into words that rise in with a blur, one after another. */
export function WordReveal({ children, as: Tag = 'span', className = '', wordClassName = '', delay = 0, stagger = .055, onView = false }: {
  children: ReactNode; as?: ElementType; className?: string; wordClassName?: string; delay?: number; stagger?: number; onView?: boolean;
}) {
  const reduce = useReducedMotion();
  let index = 0;
  const parts = Children.toArray(children).flatMap((child, childIndex) => {
    if (typeof child !== 'string') {
      const i = index++;
      return [<motion.span key={'n' + childIndex} className={"word " + wordClassName} style={{ '--i': i } as CSSProperties}
        initial={reduce ? false : { opacity: 0, y: '0.45em', filter: 'blur(10px)' }}
        {...(onView ? { whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' }, viewport: { once: true } } : { animate: { opacity: 1, y: 0, filter: 'blur(0px)' } })}
        transition={{ duration: .9, delay: delay + i * stagger, ease }}>{child}</motion.span>];
    }
    return child.split(/(\s+)/).filter(Boolean).map((word, wordIndex) => {
      if (/^\s+$/.test(word)) return word;
      const i = index++;
      return <motion.span key={childIndex + '-' + wordIndex} className={"word " + wordClassName}
        initial={reduce ? false : { opacity: 0, y: '0.45em', filter: 'blur(10px)' }}
        {...(onView ? { whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' }, viewport: { once: true } } : { animate: { opacity: 1, y: 0, filter: 'blur(0px)' } })}
        transition={{ duration: .9, delay: delay + i * stagger, ease }}>{word}</motion.span>;
    });
  });
  return <Tag className={className}>{parts}</Tag>;
}

/** Pointer-tracking light for `.spotlight` surfaces. */
export function trackSpotlight(event: PointerEvent<HTMLElement>) {
  const el = event.currentTarget;
  const box = el.getBoundingClientRect();
  el.style.setProperty('--mx', event.clientX - box.left + 'px');
  el.style.setProperty('--my', event.clientY - box.top + 'px');
}
