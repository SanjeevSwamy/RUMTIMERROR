import * as THREE from 'three';
import { builders } from './index.js';

/** Thumbnail cache: { [thumbId]: dataURL } */
export const Oe = {};

/**
 * Render a 128×128 thumbnail for every unique lesson.thumb.
 * Fills and returns `Oe`.
 * @param {{ thumb: string }[]} lessons
 * @returns {Promise<typeof Oe>}
 */
export async function renderThumbnails(lessons) {
  const thumbs = [...new Set(lessons.map((l) => l.thumb))];

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(128, 128);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
  } catch {
    return Oe;
  }

  // Orthographic camera for clean, crisp isometric miniature thumbnails
  const camera = new THREE.OrthographicCamera(-40, 40, 40, -40, 1, 500);
  camera.position.set(60, 80, 70);
  camera.lookAt(0, 0, 0);

  for (const thumb of thumbs) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6eddd);

    // Warm ambient + crisp key light
    scene.add(new THREE.AmbientLight(0xfff5e6, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(60, 100, 80);
    scene.add(sun);

    // Build the part
    try {
      const buildFn = builders[thumb] ?? builders.board;
      const part = buildFn();
      if (part) scene.add(part);
    } catch (e) {
      console.warn('Failed to build thumb for', thumb, e);
    }

    renderer.render(scene, camera);
    Oe[thumb] = renderer.domElement.toDataURL('image/webp', 0.85);

    // Dispose scene objects
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
  }

  renderer.dispose();
  return Oe;
}
