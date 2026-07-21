// [ParticleEngine] particle-soft.glsl
// Soft-particle depth-fade fragment shader. This is the same fragment
// program as particle-render.glsl's FRAGMENT section but isolated here so
// non-soft-particle render paths can swap it out for a cheaper variant
// without touching the main render shader file.

precision highp float;

varying vec3 vColor;
varying float vOpacity;
varying vec2 vUv;
varying float vDepth;

uniform sampler2D uAtlas;
uniform float uSoftDistance;
uniform sampler2D uDepthTexture;
uniform vec2 uResolution;

void main() {
  vec4 tex = texture2D(uAtlas, vUv);
  vec2 screenUv = gl_FragCoord.xy / uResolution;
  float sceneDepth = texture2D(uDepthTexture, screenUv).r;
  float fade = clamp((sceneDepth - vDepth) / uSoftDistance, 0.0, 1.0);
  float alpha = tex.a * vOpacity * fade;
  gl_FragColor = vec4(tex.rgb * vColor, alpha);
}
