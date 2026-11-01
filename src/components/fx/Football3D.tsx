/*
 * Real-time 3D football: analytic ray–sphere intersection with a truncated-icosahedron
 * panel pattern (12 pentagons + 20 hexagons via spherical Voronoi), stitched seams,
 * puffy panel shading, studio lighting and a lime rim light. Zero dependencies.
 * Drag to spin it; it also reacts to scroll velocity. Pauses offscreen; static
 * frame for reduced motion.
 */
import { useEffect, useRef } from 'react';
import { useAppearance } from '../AppearanceProvider';

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FRAG = `
precision highp float;
uniform vec2 u_res; uniform vec3 u_rot; uniform float u_dark;
const float PHI=1.61803398875; const float IP=0.61803398875;
mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
mat3 rz(float a){float c=cos(a),s=sin(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}
void cell(vec3 c,float pent,vec3 n,inout float b,inout float s,inout float ip){
  float d=dot(n,normalize(c))-pent*0.012;
  if(d>b){s=b;b=d;ip=pent;}else if(d>s){s=d;}
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*u_res)/(.5*min(u_res.x,u_res.y));
  float r2=dot(uv,uv);
  float edge=fwidth(r2)*1.5+0.004;
  float a=1.-smoothstep(.88-edge,.88+edge,r2);
  if(a<=0.){gl_FragColor=vec4(0.);return;}
  vec2 q=uv/.938;
  float z=sqrt(max(0.,1.-dot(q,q)));
  vec3 n=normalize(vec3(q,z));
  vec3 o=rz(u_rot.z)*rx(u_rot.x)*ry(u_rot.y)*n;
  float b=-2.,s=-2.,ip=0.;
  for(int i=0;i<4;i++){
    float s1=(i==0||i==1)?1.:-1.; float s2=(i==0||i==2)?1.:-1.;
    cell(vec3(0.,s1,s2*PHI),1.,o,b,s,ip); cell(vec3(s1,s2*PHI,0.),1.,o,b,s,ip); cell(vec3(s1*PHI,0.,s2),1.,o,b,s,ip);
    cell(vec3(s1*IP,0.,s2*PHI),0.,o,b,s,ip); cell(vec3(0.,s1*PHI,s2*IP),0.,o,b,s,ip); cell(vec3(s1*PHI,s2*IP,0.),0.,o,b,s,ip);
    cell(vec3(s1,s2,1.),0.,o,b,s,ip); cell(vec3(s1,s2,-1.),0.,o,b,s,ip);
  }
  float gap=b-s;
  float seam=1.-smoothstep(.006,.02,gap);
  float puff=smoothstep(0.,.09,gap);
  vec3 white=vec3(.95,.96,.93); vec3 black=vec3(.05,.07,.06);
  vec3 base=mix(white,black,ip);
  base=mix(base,vec3(.18,.2,.19),seam*.85);
  vec3 L=normalize(vec3(-.45,.62,.66)); vec3 V=vec3(0.,0.,1.); vec3 H=normalize(L+V);
  vec3 nn=n;
  float dif=max(dot(nn,L),0.);
  float spec=pow(max(dot(nn,H),0.),70.)*(1.-ip*.4)*(.4+.6*puff);
  float fres=pow(1.-max(dot(nn,V),0.),3.);
  vec3 col=base*(.16+.9*dif)*(.82+.18*puff);
  col+=vec3(1.,.98,.9)*spec*.9;
  vec3 rim=mix(vec3(.08,.42,.29),vec3(.78,.95,.42),u_dark);
  col+=rim*fres*(.55+.35*u_dark);
  gl_FragColor=vec4(col*a,a);
}`;

export function Football3D({ size = 220, className = '', label }: { size?: number; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { mode } = useAppearance();
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
    if (!gl) { canvas.classList.add('is-fallback'); return; }
    gl.getExtension('OES_standard_derivatives');
    const src = '#extension GL_OES_standard_derivatives : enable\n' + FRAG;
    const sh = (t: number, s: string) => { const x = gl.createShader(t)!; gl.shaderSource(x, s); gl.compileShader(x); return gl.getShaderParameter(x, gl.COMPILE_STATUS) ? x : null; };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, src);
    if (!vs || !fs) { canvas.classList.add('is-fallback'); return; }
    const prog = gl.createProgram()!; gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.classList.add('is-fallback'); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, 'u_res'), uRot = gl.getUniformLocation(prog, 'u_rot'), uDark = gl.getUniformLocation(prog, 'u_dark');
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rot = { x: .45, y: .6, z: .25 };
    const vel = { x: 0, y: .35 };
    let dragging = false; let last = { x: 0, y: 0 }; let visible = false; let raf = 0; let prev = 0;
    let lastScroll = window.scrollY;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const draw = () => {
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform3f(uRot, rot.x, rot.y, rot.z);
      gl.uniform1f(uDark, document.documentElement.dataset.theme === 'dark' ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const frame = (t: number) => {
      const dt = Math.min(.05, (t - (prev || t)) / 1000); prev = t;
      const sy = window.scrollY; const dv = (sy - lastScroll) * .0025; lastScroll = sy;
      if (!dragging) { vel.y += (.35 - vel.y) * dt * 1.2; vel.x += (0 - vel.x) * dt * 1.5; vel.x += dv; }
      rot.y += vel.y * dt; rot.x += vel.x * dt;
      draw(); raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && visible && !reduce && !document.hidden) { prev = 0; raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { resize(); draw(); start(); } else stop(); });
    io.observe(canvas);
    const onDown = (e: PointerEvent) => { dragging = true; last = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - last.x, dy = e.clientY - last.y; last = { x: e.clientX, y: e.clientY };
      rot.y += dx * .012; rot.x += dy * .012; vel.y = dx * .6; vel.x = dy * .6;
      if (reduce) draw();
    };
    const onUp = () => { dragging = false; };
    const onVis = () => (document.hidden ? stop() : start());
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
    document.addEventListener('visibilitychange', onVis);
    const ro = new ResizeObserver(() => { resize(); draw(); }); ro.observe(canvas);
    resize(); draw();
    return () => {
      stop(); io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      gl.deleteBuffer(buf); gl.deleteProgram(prog);
    };
  }, [mode]);
  return <div className={'football3d ' + className} style={{ ['--ball' as string]: size + 'px' }}>
    <canvas ref={ref} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />
    <span className="football3d__shadow" aria-hidden="true" />
  </div>;
}
