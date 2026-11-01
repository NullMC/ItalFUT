import { lazy, Suspense, useEffect, useState } from 'react';
import type { ShaderVariant } from './ShaderLayers';

const ShaderLayers = lazy(() => import('./ShaderLayers'));

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch { return false; }
}

/* Deterministic light points ("punti luce") so layout never shifts between renders. */
const POINTS = [
  { x: '8%', y: '22%', s: 5, d: 11, delay: 0 }, { x: '18%', y: '68%', s: 4, d: 13, delay: 2.2 },
  { x: '29%', y: '12%', s: 3, d: 9, delay: 4.1 }, { x: '41%', y: '78%', s: 6, d: 12, delay: 1.3 },
  { x: '53%', y: '30%', s: 3, d: 10, delay: 5.4 }, { x: '64%', y: '58%', s: 5, d: 14, delay: 3.1 },
  { x: '72%', y: '16%', s: 4, d: 9.5, delay: .7 }, { x: '83%', y: '72%', s: 3, d: 12.5, delay: 6.2 },
  { x: '91%', y: '34%', s: 6, d: 15, delay: 2.8 }, { x: '36%', y: '46%', s: 2, d: 8, delay: 7.1 },
  { x: '77%', y: '44%', s: 2, d: 8.5, delay: 4.6 }, { x: '12%', y: '88%', s: 3, d: 11.5, delay: 3.7 },
];

export function GlowField({ count = POINTS.length }: { count?: number }) {
  return <div className="glow-field" aria-hidden="true">
    {POINTS.slice(0, count).map((p, i) => <i key={i} style={{
      ['--x' as string]: p.x, ['--y' as string]: p.y, ['--s' as string]: p.s + 'px',
      ['--d' as string]: p.d + 's', ['--delay' as string]: '-' + p.delay + 's',
      ['--dx' as string]: (i % 2 ? -1 : 1) * (10 + i * 2) + 'px', ['--dy' as string]: -(14 + (i % 4) * 8) + 'px',
    }} />)}
  </div>;
}

/**
 * Layered cinematic background: CSS gradient fallback → WebGL mesh gradient
 * (+ floodlight god rays) → glowing light points → film grain → edge fade.
 */
export function Backdrop({ variant, glow = true, className = '' }: { variant: ShaderVariant; glow?: boolean; className?: string }) {
  const [gl, setGl] = useState(false);
  useEffect(() => { setGl(webglAvailable()); }, []);
  return <div className={'backdrop backdrop--' + variant + ' ' + className} aria-hidden="true">
    <div className="backdrop__fallback" />
    {gl && <Suspense fallback={null}><ShaderLayers variant={variant} /></Suspense>}
    {glow && <GlowField />}
    <div className="grain" />
    <div className="backdrop__fade" />
  </div>;
}
