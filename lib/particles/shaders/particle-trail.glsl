// [ParticleEngine] particle-trail.glsl
// Ribbon-trail rendering for fast-moving particles (sparks, magic, waterfall
// presets). Canonical copy of PARTICLE_TRAIL_VERTEX_SHADER /
// PARTICLE_TRAIL_FRAGMENT_SHADER in gpu.ts.

// -- VERTEX --
attribute vec3 previousPosition;
attribute float trailAlpha;
varying float vAlpha;

void main() {
  vAlpha = trailAlpha;
  vec3 pos = mix(previousPosition, position, 0.5);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

// -- FRAGMENT --
precision highp float;
varying float vAlpha;
uniform vec3 uColor;

void main() {
  gl_FragColor = vec4(uColor, vAlpha);
}
