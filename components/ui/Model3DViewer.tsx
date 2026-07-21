// [Claude.A8] Asset Manager - Model3DViewer
// Minimal rotatable Three.js preview for GLTF/GLB models. Split into its own
// lazy-loaded chunk so three.js isn't pulled into the main asset-manager
// bundle unless a 3D asset is actually previewed.

'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export interface Model3DViewerProps {
  fileUrl: string;
}

export default function Model3DViewer({ fileUrl }: Model3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 480;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(2, 2, 2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(3, 5, 2);
    scene.add(dirLight);

    let modelRoot: THREE.Object3D | null = null;
    const loader = new GLTFLoader();
    loader.load(
      fileUrl,
      (gltf) => {
        modelRoot = gltf.scene;
        const box = new THREE.Box3().setFromObject(modelRoot);
        const size = box.getSize(new THREE.Vector3()).length() || 1;
        const center = box.getCenter(new THREE.Vector3());
        modelRoot.position.sub(center);
        const scale = 1.6 / size;
        modelRoot.scale.setScalar(scale);
        scene.add(modelRoot);
      },
      undefined,
      (err) => {
        // eslint-disable-next-line no-console
        console.error('[Claude.A8] Failed to load 3D preview', err);
      }
    );

    let frameId: number;
    let angle = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      angle += 0.006;
      if (modelRoot) modelRoot.rotation.y = angle;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = container.clientWidth || 480;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [fileUrl]);

  return <div ref={containerRef} className="h-[480px] w-[480px] max-h-full max-w-full" />;
}
