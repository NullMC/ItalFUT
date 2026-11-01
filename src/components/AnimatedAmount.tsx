import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { formatEuro } from '../lib/catalog';

export function AnimatedAmount({ amount }: { amount: number }) {
  const reduceMotion = useReducedMotion();
  return <span className="animated-amount" aria-live="polite" aria-atomic="true">
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={amount}
        initial={reduceMotion ? false : { opacity: 0.55, y: 7 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0.2, y: -7 }}
        transition={{ duration: reduceMotion ? 0 : 0.17, ease: 'easeOut' }}
        className="animated-amount__value"
      >{formatEuro(amount)}</motion.span>
    </AnimatePresence>
  </span>;
}
