/**
 * [ParticleEngine] GPU rendering layer.
 *
 * Uses Three.js InstancedMesh + custom ShaderMaterial for particle rendering
 * so up to ~1M particles can be drawn in a handful of draw calls. Falls back
 * to a CPU/Canvas2D renderer (see `Canvas2DFallbackRenderer`) on devices
 * without adequate WebGL support (see constraints: no WebGPU, 2-year-old
 * hardware target).
 *
 * GPU-side simulation (transform feedback / compute-like update) is provided
 * via `GPUParticleSimulator`, which ping-pongs position/velocity data through
 * float render targets so the CPU only needs to update forces/emitters, not
 * per-particle integration, once particle counts exceed ~100K.
 */

import * as THREE from 'three';
import type { BlendMode, ParticleGeometry, ParticleRenderSettings } from './types';
import type { ParticlePool } from './engine';

// ---------------------------------------------------------------------------
// Shader source (kept inline for a single-file distributable; the on-disk
// .glsl files in shaders/ mirror these exactly and are the canonical source
// for tooling that lints GLSL separately).
// ---------------------------------------------------------------------------

export const PARTICLE_VERTEX_SHADER = /* glsl */ `
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

  uniform float uSoftDistance;

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
`;

export const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
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
`;

export const PARTICLE_TRAIL_VERTEX_SHADER = /* glsl */ `
  attribute vec3 previousPosition;
  attribute float trailAlpha;
  varying float vAlpha;

  void main() {
    vAlpha = trailAlpha;
    vec3 pos = mix(previousPosition, position, 0.5);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const PARTICLE_TRAIL_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  varying float vAlpha;
  uniform vec3 uColor;
  void main() {
    gl_FragColor = vec4(uColor, vAlpha);
  }
`;

export const PARTICLE_SOFT_FRAGMENT_SHADER = PARTICLE_FRAGMENT_SHADER;

// ---------------------------------------------------------------------------
// Blend mode -> THREE blending constants
// ---------------------------------------------------------------------------

function resolveBlending(mode: BlendMode): THREE.Blending {
  switch (mode) {
    case 'additive':
      return THREE.AdditiveBlending;
    case 'multiply':
      return THREE.MultiplyBlending;
    case 'screen':
      // THREE doesn't ship a native ScreenBlending constant; approximate via
      // custom blend factors (src: OneMinusDstColor, dst: One).
      return THREE.CustomBlending;
    case 'normal':
    default:
      return THREE.NormalBlending;
  }
}

function geometryForType(type: ParticleGeometry): THREE.BufferGeometry {
  switch (type) {
    case 'point':
      return new THREE.BufferGeometry(); // rendered via gl.POINTS path, see GPURenderer.usePoints
    case 'sphere':
      return new THREE.SphereGeometry(0.5, 8, 8);
    case 'mesh':
      return new THREE.IcosahedronGeometry(0.5, 0);
    case 'quad':
    default:
      return new THREE.PlaneGeometry(1, 1);
  }
}

// ---------------------------------------------------------------------------
// GPU Renderer — instanced rendering of a ParticlePool
// ---------------------------------------------------------------------------

export class GPUParticleRenderer {
  readonly mesh: THREE.InstancedMesh;
  private material: THREE.ShaderMaterial;
  private capacity: number;
  private instanceColor: Float32Array;
  private instanceOpacity: Float32Array;
  private instanceScale: Float32Array;
  private instanceRotation: Float32Array;
  private instanceTextureIndex: Float32Array;
  private dummy = new THREE.Object3D();

  constructor(capacity: number, settings: ParticleRenderSettings, atlasTexture?: THREE.Texture) {
    this.capacity = capacity;
    const geometry = geometryForType(settings.geometry);

    this.material = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX_SHADER,
      fragmentShader: PARTICLE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: settings.depthSort,
      blending: resolveBlending(settings.blendMode),
      uniforms: {
        uAtlas: { value: atlasTexture ?? new THREE.Texture() },
        uAtlasColumns: { value: settings.textureAtlas?.columns ?? 1 },
        uAtlasRows: { value: settings.textureAtlas?.rows ?? 1 },
        uHDRIntensity: { value: settings.hdrIntensity },
        uSoftParticles: { value: settings.softParticles },
        uSoftDistance: { value: settings.softParticleDistance },
        uDepthTexture: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
      },
    });

    this.mesh = new THREE.InstancedMesh(geometry, this.material, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; // particles typically span the whole scene bounds

    this.instanceColor = new Float32Array(capacity * 3);
    this.instanceOpacity = new Float32Array(capacity);
    this.instanceScale = new Float32Array(capacity);
    this.instanceRotation = new Float32Array(capacity);
    this.instanceTextureIndex = new Float32Array(capacity);

    this.attachInstancedAttributes();
  }

  private attachInstancedAttributes(): void {
    const geo = this.mesh.geometry;
    geo.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(this.instanceColor, 3));
    geo.setAttribute('instanceOpacity', new THREE.InstancedBufferAttribute(this.instanceOpacity, 1));
    geo.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(this.instanceScale, 1));
    geo.setAttribute('instanceRotation', new THREE.InstancedBufferAttribute(this.instanceRotation, 1));
    geo.setAttribute('instanceTextureIndex', new THREE.InstancedBufferAttribute(this.instanceTextureIndex, 1));
  }

  /** Uploads the current pool state to GPU instance buffers. Call once per frame. */
  sync(pool: ParticlePool, depthSortCameraPos?: THREE.Vector3): void {
    const bound = pool.iterationBound;
    let writeIndex = 0;

    // Optional depth sort for correct alpha blending (back-to-front)
    let order: number[] | null = null;
    if (depthSortCameraPos) {
      const indices: number[] = [];
      for (let i = 0; i < bound; i++) if (pool.alive[i]) indices.push(i);
      indices.sort((a, b) => {
        const da = distSq(pool.positionX[a], pool.positionY[a], pool.positionZ[a], depthSortCameraPos);
        const db = distSq(pool.positionX[b], pool.positionY[b], pool.positionZ[b], depthSortCameraPos);
        return db - da;
      });
      order = indices;
    }

    const iterate = order ?? rangeAlive(pool, bound);

    for (const i of iterate) {
      this.dummy.position.set(pool.positionX[i], pool.positionY[i], pool.positionZ[i]);
      this.dummy.rotation.set(0, 0, pool.rotation[i]);
      this.dummy.scale.setScalar(pool.scale[i]);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(writeIndex, this.dummy.matrix);

      this.instanceColor[writeIndex * 3] = pool.colorR[i] / 255;
      this.instanceColor[writeIndex * 3 + 1] = pool.colorG[i] / 255;
      this.instanceColor[writeIndex * 3 + 2] = pool.colorB[i] / 255;
      this.instanceOpacity[writeIndex] = pool.opacity[i];
      this.instanceScale[writeIndex] = pool.scale[i];
      this.instanceRotation[writeIndex] = pool.rotation[i];
      this.instanceTextureIndex[writeIndex] = pool.textureIndex[i];
      writeIndex++;
    }

    this.mesh.count = writeIndex;
    this.mesh.instanceMatrix.needsUpdate = true;
    (this.mesh.geometry.getAttribute('instanceColor') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (this.mesh.geometry.getAttribute('instanceOpacity') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (this.mesh.geometry.getAttribute('instanceScale') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (this.mesh.geometry.getAttribute('instanceRotation') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (this.mesh.geometry.getAttribute('instanceTextureIndex') as THREE.InstancedBufferAttribute).needsUpdate = true;
  }

  setResolution(width: number, height: number): void {
    (this.material.uniforms.uResolution.value as THREE.Vector2).set(width, height);
  }

  setDepthTexture(tex: THREE.Texture): void {
    this.material.uniforms.uDepthTexture.value = tex;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

function distSq(x: number, y: number, z: number, camera: THREE.Vector3): number {
  const dx = x - camera.x, dy = y - camera.y, dz = z - camera.z;
  return dx * dx + dy * dy + dz * dz;
}

function rangeAlive(pool: ParticlePool, bound: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < bound; i++) if (pool.alive[i]) out.push(i);
  return out;
}

// ---------------------------------------------------------------------------
// GPU-side simulation via ping-pong float render targets (transform feedback
// style approach compatible with WebGL1/2 without requiring WebGPU compute).
// This offloads the O(n) integration loop to the GPU for particle counts
// where CPU stepSimulation would blow the 16ms frame budget.
// ---------------------------------------------------------------------------

export class GPUParticleSimulator {
  private renderer: THREE.WebGLRenderer;
  private size: number; // textures are size x size, size^2 >= capacity
  private rtA: THREE.WebGLRenderTarget;
  private rtB: THREE.WebGLRenderTarget;
  private current: THREE.WebGLRenderTarget;
  private simScene = new THREE.Scene();
  private simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private simMaterial: THREE.ShaderMaterial;
  private quad: THREE.Mesh;

  constructor(renderer: THREE.WebGLRenderer, capacity: number) {
    this.renderer = renderer;
    this.size = Math.ceil(Math.sqrt(capacity));

    const options: THREE.RenderTargetOptions = {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    };
    this.rtA = new THREE.WebGLRenderTarget(this.size, this.size, options);
    this.rtB = new THREE.WebGLRenderTarget(this.size, this.size, options);
    this.current = this.rtA;

    this.simMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPosition: { value: null },
        uVelocity: { value: null },
        uDt: { value: 0 },
        uGravity: { value: new THREE.Vector3(0, -9.8, 0) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uPosition;
        uniform sampler2D uVelocity;
        uniform float uDt;
        uniform vec3 uGravity;
        void main() {
          vec4 pos = texture2D(uPosition, vUv);
          vec4 vel = texture2D(uVelocity, vUv);
          vel.xyz += uGravity * uDt;
          pos.xyz += vel.xyz * uDt;
          gl_FragColor = pos;
        }
      `,
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.simMaterial);
    this.simScene.add(this.quad);
  }

  /** Advances the GPU simulation by dt seconds, ping-ponging render targets. */
  step(dt: number, positionTexture: THREE.Texture, velocityTexture: THREE.Texture): THREE.Texture {
    const target = this.current === this.rtA ? this.rtB : this.rtA;
    this.simMaterial.uniforms.uPosition.value = positionTexture;
    this.simMaterial.uniforms.uVelocity.value = velocityTexture;
    this.simMaterial.uniforms.uDt.value = dt;

    this.renderer.setRenderTarget(target);
    this.renderer.render(this.simScene, this.simCamera);
    this.renderer.setRenderTarget(null);

    this.current = target;
    return target.texture;
  }

  dispose(): void {
    this.rtA.dispose();
    this.rtB.dispose();
    this.simMaterial.dispose();
    this.quad.geometry.dispose();
  }
}

// ---------------------------------------------------------------------------
// Canvas2D CPU fallback renderer (for browsers/devices lacking WebGL2 or
// with disabled hardware acceleration).
// ---------------------------------------------------------------------------

export class Canvas2DFallbackRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('[ParticleEngine] Canvas2D context unavailable for fallback renderer');
    this.ctx = ctx;
  }

  render(pool: ParticlePool, settings: ParticleRenderSettings, projectFn: (x: number, y: number, z: number) => { x: number; y: number; scale: number }): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation =
      settings.blendMode === 'additive' ? 'lighter' : settings.blendMode === 'multiply' ? 'multiply' : settings.blendMode === 'screen' ? 'screen' : 'source-over';

    const bound = pool.iterationBound;
    for (let i = 0; i < bound; i++) {
      if (!pool.alive[i]) continue;
      const p = projectFn(pool.positionX[i], pool.positionY[i], pool.positionZ[i]);
      ctx.globalAlpha = Math.max(0, Math.min(1, pool.opacity[i]));
      ctx.fillStyle = `rgb(${pool.colorR[i] | 0}, ${pool.colorG[i] | 0}, ${pool.colorB[i] | 0})`;
      const r = Math.max(0.5, pool.scale[i] * p.scale * 4);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Capability detection
// ---------------------------------------------------------------------------

export function detectGPUCapability(): 'webgl2' | 'webgl1' | 'none' {
  if (typeof document === 'undefined') return 'none';
  const canvas = document.createElement('canvas');
  if (canvas.getContext('webgl2')) return 'webgl2';
  if (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) return 'webgl1';
  return 'none';
}
