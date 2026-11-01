/*
 * Based on the scroll composition patterns of 21st.dev Scroll Reveal (cnippet-dev)
 * and Sticky Scroll Reveal (Aceternity), customized to the ItalFUT editorial system.
 */
import { motion, useReducedMotion, useScroll, type MotionValue } from 'motion/react';
import { useRef, type ReactNode } from 'react';

export function Reveal({
  children, className = '', delay = 0,
}: { children: ReactNode; className?: string; delay?: number }) {
  const reducedMotion = useReducedMotion();
  return <motion.div
    className={className}
    initial={reducedMotion ? false : { opacity: .88, y: 22, filter: 'blur(4px)' }}
    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    viewport={{ once: true, amount: .16 }}
    transition={{ duration: reducedMotion ? 0 : .64, delay: reducedMotion ? 0 : delay, ease: [ .16, 1, .3, 1 ] }}
  >{children}</motion.div>;
}

export function ScrollRail({
  onProgress,
}: { onProgress?: (progress: MotionValue<number>) => void }) {
  const target = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target, offset: ['start end', 'end start'],
  });
  // Optional subscriber allows other marketing sections to share the progress value.
  if (onProgress) { /* reserved for a future composition, no observer needed */ }
  return <div className="itf-scroll-rail" ref={target} aria-hidden="true">
    <motion.span style={{ scaleY: reducedMotion ? 1 : scrollYProgress }} />
  </div>;
}
