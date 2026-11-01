import { useEffect, useRef, useState } from 'react';
import { useAppearance } from './AppearanceProvider';
import fragmentSource from './shaders/touchline.frag?raw';

type ShaderVariant = 'ribbons' | 'auth';

const vertexSource =
  'attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }';

const variants: Record<ShaderVariant, number> = { ribbons: 1, auth: 2 };

/**
 * Custom zero-dependency WebGL shader, informed by 21st.dev Aurora Shader - Green,
 * Silk Aurora and Horizon Hero. The 3D football has been replaced by an\n * interactive CSS 3D iPhone showcase; this shader draws only ambient light.
 *
 * Performance: bounded resolution and framerate, intersection/visibility pauses, no WebGL
 * requirement for content, static reduced-motion/data-saver mode and CSS fallback.
 */
export function CinematicShader({
  variant = 'ribbons', className = '',
}: {
  variant?: ShaderVariant;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [contextRevision, setContextRevision] = useState(0);
  const { mode } = useAppearance();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false,
      powerPreference: 'low-power', preserveDrawingBuffer: false,
    });
    if (!gl) return;

    const compile = (kind: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(kind);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('ItalFUT: WebGL shader not supported.', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      return;
    }

    const program = gl.createProgram();
    if (!program) { gl.deleteShader(vertex); gl.deleteShader(fragment); return; }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('ItalFUT: WebGL program failed.', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }

    const buffer = gl.createBuffer();
    if (!buffer) { gl.deleteProgram(program); return; }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);

    const resolution = gl.getUniformLocation(program, 'u_resolution');
    const pointer = gl.getUniformLocation(program, 'u_pointer');
    const time = gl.getUniformLocation(program, 'u_time');
    const shaderVariant = gl.getUniformLocation(program, 'u_variant');
    const dark = gl.getUniformLocation(program, 'u_dark');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator as Navigator & { connection?: { saveData?: boolean } };
    const saveData = Boolean(connection.connection?.saveData);
    let reduceMotion = motionQuery.matches || saveData;
    let visible = false;
    let active = false;
    let frameId = 0;
    let lastFrame = -1000;
    let isLost = false;
    const frameInterval = window.innerWidth <= 700 ? 1000 / 24 : 1000 / 30;
    const mouse = { x: .58, y: .5 };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      // Limit fragment work especially on mobile and high-DPI screens.
      const maxWidth = variant === 'ribbons' ? 1050 : 750;
      const scale = Math.min(dpr, maxWidth / bounds.width);
      const width = Math.max(1, Math.round(bounds.width * scale));
      const height = Math.max(1, Math.round(bounds.height * scale));
      if (width !== canvas.width || height !== canvas.height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const draw = (seconds: number) => {
      if (isLost) return;
      gl.useProgram(program);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform2f(pointer, mouse.x, mouse.y);
      gl.uniform1f(time, seconds);
      gl.uniform1f(shaderVariant, variants[variant]);
      gl.uniform1f(dark, mode === 'dark' ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const stop = () => {
      active = false;
      window.cancelAnimationFrame(frameId);
    };
    const tick = (now: number) => {
      if (!active) return;
      if (now - lastFrame >= frameInterval) { draw(now * .001); lastFrame = now; }
      frameId = window.requestAnimationFrame(tick);
    };
    const start = () => {
      if (!visible || document.hidden || isLost) return;
      if (reduceMotion) { stop(); draw(1.8); return; }
      if (!active) { active = true; frameId = window.requestAnimationFrame(tick); }
    };
    const observe = new IntersectionObserver(entries => {
      visible = Boolean(entries[0]?.isIntersecting);
      if (visible) start(); else stop();
    }, { rootMargin: '80px' });
    observe.observe(canvas);

    const onMouse = (event: PointerEvent) => {
      if (!visible || reduceMotion) return;
      mouse.x = event.clientX / Math.max(1, window.innerWidth);
      mouse.y = 1 - event.clientY / Math.max(1, window.innerHeight);
    };
    const onMotion = () => {
      reduceMotion = motionQuery.matches || saveData;
      stop();
      start();
    };
    const onVisibility = () => { if (document.hidden) stop(); else start(); };
    const onContextLost = (event: Event) => { event.preventDefault(); isLost = true; stop(); };
    const onContextRestored = () => setContextRevision(revision => revision + 1);
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => { resize(); if (reduceMotion && visible) draw(1.8); })
      : null;
    resizeObserver?.observe(canvas);
    window.addEventListener('pointermove', onMouse, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    motionQuery.addEventListener('change', onMotion);
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);
    resize();
    draw(1.8);

    return () => {
      stop(); observe.disconnect(); resizeObserver?.disconnect();
      window.removeEventListener('pointermove', onMouse);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      motionQuery.removeEventListener('change', onMotion);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      if (!isLost) { gl.deleteBuffer(buffer); gl.deleteProgram(program); }
    };
  }, [variant, mode, contextRevision]);

  return <canvas
    ref={canvasRef}
    className={'itf-cinematic-canvas ' + className}
    aria-hidden="true"
    role="presentation"
    tabIndex={-1}
  />;
}
