// [ParticleEngine] particle-update.glsl
// Fragment shader used by GPUParticleSimulator to advance particle
// position/velocity state stored in float render targets (ping-pong).
// This is the canonical on-disk copy of the string mirrored in gpu.ts.

precision highp float;

varying vec2 vUv;

uniform sampler2D uPosition;
uniform sampler2D uVelocity;
uniform float uDt;
uniform vec3 uGravity;
uniform float uDrag;
uniform vec3 uWindDirection;
uniform float uWindStrength;
uniform float uTurbulence;
uniform float uTime;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  vec4 posData = texture2D(uPosition, vUv);
  vec4 velData = texture2D(uVelocity, vUv);

  vec3 pos = posData.xyz;
  vec3 vel = velData.xyz;
  float age = posData.w;

  vec3 turbulence = vec3(
    hash(pos + uTime) - 0.5,
    hash(pos.yzx + uTime) - 0.5,
    hash(pos.zxy + uTime) - 0.5
  ) * uTurbulence;

  vec3 acceleration = uGravity + uWindDirection * uWindStrength + turbulence - vel * uDrag;

  vel += acceleration * uDt;
  pos += vel * uDt;
  age += uDt;

  gl_FragColor = vec4(pos, age);
}
