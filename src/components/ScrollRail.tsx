import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react';

/**
 * Scroll container that never cuts its content with a hard edge.
 * - Keeps breathing room on the cross axis, so focus rings, borders and shadows of the
 *   items are not clipped (overflow-x:auto always clips the other axis too).
 * - Fades only the sides that actually hide content (data-start / data-end), so the user
 *   sees there is more to scroll instead of a chip sliced in half.
 * - Brings the active item (aria-current, aria-selected, .is-active, .active) into view
 *   without moving the page.
 */
type Props = {
  as?: ElementType; axis?: 'x' | 'y'; className?: string; children: ReactNode;
  /** Changes when the active item changes (e.g. the pathname), to re-center it. */
  activeKey?: unknown; style?: CSSProperties; label?: string; role?: string; tabIndex?: number;
};
const ACTIVE = '[aria-current="page"], [aria-current="true"], [aria-selected="true"], .is-active, .active';

export function ScrollRail({ as: Tag = 'div', axis = 'x', className = '', children, activeKey, style, label, role, tabIndex }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const start = axis === 'x' ? el.scrollLeft : el.scrollTop;
        const size = axis === 'x' ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
        el.dataset.start = String(start > 2);
        el.dataset.end = String(size - start > 2);
      });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    [...el.children].forEach(child => observer.observe(child));
    return () => { cancelAnimationFrame(frame); el.removeEventListener('scroll', update); observer.disconnect(); };
  }, [axis, children]);

  useLayoutEffect(() => {
    const el = ref.current;
    const active = el?.querySelector<HTMLElement>(ACTIVE);
    if (!el || !active) return;
    const box = el.getBoundingClientRect(), item = active.getBoundingClientRect();
    if (axis === 'x') {
      if (item.left < box.left + 24 || item.right > box.right - 24)
        el.scrollLeft += item.left - box.left - (box.width - item.width) / 2;
    } else if (item.top < box.top + 24 || item.bottom > box.bottom - 24) {
      el.scrollTop += item.top - box.top - (box.height - item.height) / 2;
    }
  }, [activeKey, axis]);

  return <Tag ref={ref} className={'rail ' + className} data-axis={axis} style={style} aria-label={label} role={role} tabIndex={tabIndex}>{children}</Tag>;
}
