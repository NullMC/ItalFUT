precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;
uniform float u_variant;
uniform float u_dark;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float glow(vec2 uv, vec2 center, vec2 radius) {
  vec2 p = (uv - center) / radius;
  return exp(-dot(p, p) * 2.0);
}

// Lightweight cinematic aurora and floodlights. The device is a DOM-based CSS 3D
// iPhone with real interactive screen content; no sphere/football is rendered.
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  float t = u_time * 0.23;
  float shiftX = (u_pointer.x - 0.5) * 0.16;
  float shiftY = (u_pointer.y - 0.5) * 0.12;

  vec3 base = vec3(0.006, 0.031, 0.025);
  if (u_variant > 1.5) base = vec3(0.008, 0.038, 0.031);
  float darkBias = mix(1.05, 0.94, u_dark);

  // Two asymmetric ribbons create pitch-green motion without a bright
  // object obscuring the phone screen or heading.
  float ribbon1 = p.y - (0.17 * sin(p.x * 2.15 + t) +
    0.11 * sin(p.x * 0.85 - t * 0.76) - 0.03);
  float ribbon2 = p.y - (0.15 * sin(p.x * 2.9 - t * 1.17) - 0.29);
  float silk = exp(-abs(ribbon1) * 6.7);
  float rim = exp(-abs(ribbon1 - 0.09 * sin(p.x * 2.6 - t)) * 16.0);
  float lower = exp(-abs(ribbon2) * 5.2);

  float leftLight = glow(p, vec2(-aspect * .32 + shiftX, .16 + shiftY),
                         vec2(.48, .55));
  float rightLight = glow(p, vec2(aspect * .32 - shiftX * .4, .24),
                          vec2(.36, .57));
  float footGlow = glow(p, vec2(.22, -.52), vec2(.82, .44));
  float lightLine = pow(max(0.0, 0.5 + 0.5 * sin(p.x * 7.0 + t * .55)), 6.0) * .016;

  vec3 c = base;
  c += vec3(.018, .18, .11) * silk * .23;
  c += vec3(.14, .42, .20) * rim * .10;
  c += vec3(.013, .15, .12) * lower * .16;
  c += vec3(.09, .23, .14) * leftLight * .21;
  c += vec3(.18, .38, .21) * rightLight * .22;
  c += vec3(.06, .18, .11) * footGlow * .22;
  c += vec3(.05, .12, .075) * lightLine;

  float grain = hash21(floor(p * (u_resolution.y * .18)) + floor(u_time * 6.0)) - .5;
  c += grain * .008;
  float vignette = 1.0 - .24 * smoothstep(.12, 1.1, length(p));
  gl_FragColor = vec4(clamp(c * vignette * darkBias, 0.0, 1.0), 1.0);
}
