// [ParticleEngine] particle-render.glsl
// Vertex + fragment shader pair for instanced particle rendering.
// Canonical on-disk copy of PARTICLE_VERTEX_SHADER / PARTICLE_FRAGMENT_SHADER
// in gpu.ts. Split into // -- VERTEX -- and // -- FRAGMENT -- sections here
// for GLSL-tooling convenience; gpu.ts keeps them as separate template
// strings for direct THREE.ShaderMaterial consumption.

// -- VERTEX --
attribute vec3 instancePosition;
attribute vec3 instanceColor;
attribute float instanceOpacity;
attribute float instanceScale;
attribute float instanceRotation;
attribute float instanceTextureIndex;

varying vec3 vColor;
varying float vOpacity;
varying vec2 vUv;
varying float vTextureIndex;
varying float vDepth;

void main() {
  vColor = instanceColor;
  vOpacity = instanceOpacity;
  vUv = uv;
  vTextureIndex = instanceTextureIndex;

  float c = cos(instanceRotation);
  float s = sin(instanceRotation);
  mat2 rot = mat2(c, -s, s, c);
  vec2 rotated = rot * position.xy * instanceScale;

  vec4 mvPosition = modelViewMatrix * vec4(instancePosition, 1.0);
  mvPosition.xy += rotated;
  vDepth = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
}

// -- FRAGMENT --
precision highp float;

varying vec3 vColor;
varying float vOpacity;
varying vec2 vUv;
varying float vTextureIndex;
varying float vDepth;

uniform sampler2D uAtlas;
uniform float uAtlasColumns;
uniform float uAtlasRows;
uniform float uHDRIntensity;
uniform bool uSoftParticles;
uniform float uSoftDistance;
uniform sampler2D uDepthTexture;
uniform vec2 uResolution;

void main() {
  vec2 uv = vUv;
  float col = mod(vTextureIndex, uAtlasColumns);
  float row = floor(vTextureIndex / uAtlasColumns);
  vec2 atlasUv = (uv + vec2(col, row)) / vec2(uAtlasColumns, uAtlasRows);
  vec4 tex = texture2D(uAtlas, atlasUv);

  float alpha = tex.a * vOpacity;

  if (uSoftParticles) {
    vec2 screenUv = gl_FragCoord.xy / uResolution;
    float sceneDepth = texture2D(uDepthTexture, screenUv).r;
    float fade = clamp((sceneDepth - vDepth) / uSoftDistance, 0.0, 1.0);
    alpha *= fade;
  }

  vec3 outColor = tex.rgb * vColor * uHDRIntensity;
  gl_FragColor = vec4(outColor, alpha);
}
