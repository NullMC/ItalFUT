precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;
uniform float u_variant;
uniform float u_dark;

#define PI 3.14159265359

float noise2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float bloom(vec2 point, vec2 center, float spread) {
  vec2 d = (point - center) / spread;
  return exp(-dot(d, d) * 1.8);
}

vec3 pitchAurora(vec2 p, float time, float aspect) {
  vec3 base = vec3(0.008, 0.034, 0.031);
  if (u_variant > 0.5 && u_variant < 1.5) base = vec3(0.014, 0.075, 0.059);
  if (u_variant > 1.5) base = vec3(0.011, 0.045, 0.042);

  float drift = time * 0.24;
  float pointerX = (u_pointer.x - 0.5) * 0.20;
  float pointerY = (u_pointer.y - 0.5) * 0.12;

  float field1 = sin(p.x * 2.3 + drift + sin(p.y * 3.2 - drift) * 0.58);
  float field2 = sin(p.x * 3.4 - drift * 1.16 + sin(p.y * 2.5 + drift * .57));
  float strand1 = p.y - (0.13 * field1 + 0.14 * sin(p.x * 1.13 + drift));
  float strand2 = p.y - (-0.29 + 0.11 * field2);

  float silk = exp(-abs(strand1) * 6.7) * 0.27;
  float vein = exp(-abs(strand1 - 0.10 * field2) * 18.5) * 0.09;
  float lower = exp(-abs(strand2) * 5.6) * 0.14;
  float spotlight = bloom(p, vec2(0.36 + pointerX, 0.17 + pointerY), 0.57) * 0.23;
  float spotlight2 = bloom(p, vec2(-0.43 - pointerX * .3, -0.25), 0.64) * 0.14;
  float flood = bloom(p, vec2(aspect * 0.36, 0.56), .24) * .16;
  vec3 result = base;
  result += vec3(0.02, 0.26, 0.18) * silk;
  result += vec3(0.31, 0.78, 0.40) * vein;
  result += vec3(0.05, 0.32, 0.27) * lower;
  result += vec3(0.13, 0.46, 0.28) * spotlight;
  result += vec3(0.09, 0.22, 0.19) * spotlight2;
  result += vec3(0.25, 0.65, 0.42) * flood;
  float pitchLine = smoothstep(.997, 1.0, cos(p.x * 9.5 - p.y * 1.4)) * .013;
  result += vec3(.18, .39, .27) * pitchLine;

  float grain = noise2(floor(p * u_resolution.y * .40) + floor(time * 8.0)) - .5;
  result += grain * .014;
  return result;
}

vec3 rotateBall(vec3 v, float t) {
  float a = t * 0.38 + .75;
  float b = -0.30 + .16 * sin(t * .31);
  v.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * v.xz;
  v.yz = mat2(cos(b), -sin(b), sin(b), cos(b)) * v.yz;
  return v;
}

float leatherPanel(vec3 n) {
  vec3 vertex = vec3(0.0, 1.0, 0.0);
  float nearest = -1.0;
  // Geodesic-inspired pentagonal panels distributed across the sphere.
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float h = 1.0 - 2.0 * (fi + .5) / 12.0;
    float a = 2.3999632297 * fi;
    float ring = sqrt(max(.0, 1.0 - h * h));
    vec3 target = vec3(cos(a) * ring, h, sin(a) * ring);
    float value = dot(n, target);
    if (value > nearest) { nearest = value; vertex = target; }
  }
  vec3 tangent = normalize(cross(vertex, vec3(.013, 1., .027)));
  vec3 bitangent = cross(vertex, tangent);
  vec2 local = vec2(dot(n, tangent), dot(n, bitangent));
  float angle = atan(local.y, local.x);
  float stepAngle = 2.0 * PI / 5.0;
  float sector = mod(angle + stepAngle * .5, stepAngle) - stepAngle * .5;
  float edge = .266 * cos(PI / 5.0) / max(.35, cos(sector));
  float radial = length(local);
  float inside = 1.0 - smoothstep(edge - .012, edge + .012, radial);
  float seam = (1.0 - smoothstep(.008, .022, abs(radial - edge))) * .22;
  return clamp(inside + seam, 0.0, 1.0);
}

vec3 drawFootball(vec2 p, float time, vec3 background, float aspect) {
  float compact = 1.0 - smoothstep(.83, 1.16, aspect);
  vec2 center = mix(vec2(.45, -.045), vec2(.145, -.29), compact);
  float radius = mix(.325, .175, compact);
  if (u_variant > 1.5) {
    center = vec2(.20, .19);
    radius = .27;
  }
  center += vec2(.006 * sin(time * .51), .011 * sin(time * .72));
  float r = length(p - center);
  float halo = exp(-pow(r / (radius * 1.65), 2.0) * 2.0);
  vec3 color = background + vec3(.14, .44, .26) * halo * .23;
  if (r >= radius) return color;

  vec2 xy = (p - center) / radius;
  float zz = sqrt(max(0.0, 1.0 - dot(xy, xy)));
  vec3 normal = normalize(vec3(xy, zz));
  vec3 rotatingNormal = rotateBall(normal, time);
  float pattern = leatherPanel(rotatingNormal);
  vec3 lightDirection = normalize(vec3(-.40, .77, .89));
  float diffuse = max(0.0, dot(normal, lightDirection));
  float highlight = pow(max(0., dot(reflect(-lightDirection, normal), vec3(0., 0., 1.))), 37.0);
  float rim = pow(1.0 - zz, 2.8);

  vec3 whiteLeather = vec3(.88, .94, .84);
  vec3 blackLeather = vec3(.021, .073, .047);
  vec3 material = mix(whiteLeather, blackLeather, pattern);
  vec3 shading = material * (.23 + diffuse * .89);
  shading += vec3(1., 1., .84) * highlight * .55;
  shading += vec3(.25, .71, .43) * rim * .22;
  shading *= (1.0 - rim * .19);
  float edge = smoothstep(radius - .002, radius, r);
  return mix(shading, color, edge);
}

void main() {
  vec2 p = (gl_FragCoord.xy - .5 * u_resolution) / u_resolution.y;
  float aspect = u_resolution.x / u_resolution.y;
  float t = u_time;
  vec3 background = pitchAurora(p, t, aspect);
  if (u_variant < .5 || u_variant > 1.5) {
    background = drawFootball(p, t, background, aspect);
  }
  float vignette = 1.0 - .18 * smoothstep(.12, 1.24, length(p));
  vec3 finalColor = clamp(background * vignette, 0.0, 1.0);
  gl_FragColor = vec4(finalColor, 1.0);
}
