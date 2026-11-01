/*
 * Animated WebGL backgrounds built on @paper-design/shaders-react — the engine
 * behind the 21st.dev "Shader Hero", "Mesh drift" and "Aurora" background components.
 * Paper pauses rendering offscreen and in hidden tabs; we also freeze motion for
 * prefers-reduced-motion and Save-Data.
 */
import { GodRays, MeshGradient } from '@paper-design/shaders-react';
import { useAppearance } from '../AppearanceProvider';

export type ShaderVariant = 'hero' | 'auth' | 'cta' | 'band';

const palettes = {
  dark: {
    hero: ['#020504', '#05130d', '#0a2a1c', '#0e402b', '#3d7a2c'],
    auth: ['#020504', '#071d14', '#0e4430', '#1f7a50', '#8fc556'],
    cta: ['#030806', '#072018', '#0d402b', '#4f8f33', '#04100a'],
    band: ['#050a08', '#0a1d15', '#0f3a28', '#155238'],
  },
  light: {
    hero: ['#f3f2ec', '#dff0dc', '#bfe6c6', '#e9f7c8', '#a9dbb9'],
    auth: ['#eef3e8', '#cfe9d3', '#9fd5b2', '#e6f6c4', '#f7f6f0'],
    cta: ['#e9f3e4', '#bfe3c8', '#7ec79c', '#dff5b0', '#f3f2ec'],
    band: ['#f3f2ec', '#e5efe1', '#d6eadb', '#eef5e4'],
  },
} as const;

function lowPower() {
  if (typeof window === 'undefined') return true;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  return reduce || saveData;
}

export default function ShaderLayers({ variant }: { variant: ShaderVariant }) {
  const { mode } = useAppearance();
  const still = lowPower();
  const colors = [...palettes[mode][variant]];
  const dark = mode === 'dark';
  const mobile = typeof window !== 'undefined' && window.innerWidth < 720;
  const maxPixelCount = mobile ? 900_000 : 2_400_000;
  return <>
    <MeshGradient
      className="shader-layer"
      colors={colors}
      distortion={variant === 'band' ? .5 : .85}
      swirl={variant === 'cta' ? .35 : .12}
      grainMixer={0}
      grainOverlay={dark ? .08 : .04}
      speed={still ? 0 : variant === 'band' ? .12 : .22}
      frame={still ? 12000 : undefined}
      scale={variant === 'hero' ? 1.15 : 1}
      rotation={variant === 'hero' ? 210 : 0}
      maxPixelCount={maxPixelCount}
      minPixelRatio={1}
    />
    {(variant === 'hero' || variant === 'auth') && dark && <GodRays
      className="shader-layer shader-layer--rays"
      colorBack="#00000000"
      colorBloom="#c6f36a"
      colors={['#fff7d64d', '#c6f36a33', '#3ddc971f', '#ffffff10']}
      offsetX={variant === 'hero' ? .55 : -.2}
      offsetY={-1.05}
      density={.28}
      spotty={.25}
      midSize={.18}
      midIntensity={.2}
      intensity={.4}
      bloom={.2}
      speed={still ? 0 : .35}
      frame={still ? 8000 : undefined}
      maxPixelCount={mobile ? 500_000 : 1_400_000}
      minPixelRatio={1}
    />}
  </>;
}
