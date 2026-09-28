/**
 * The scene a model is drawn in: the lamps, the camera, and putting the model
 * in shot. Nothing here needs a WebGL context, so all of it runs in a test.
 */

import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  Vector3,
  type Object3D,
} from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// The same near-white the viewer this was taken from uses. A lighter one
// washes into the pale surfaces of a model and the silhouette disappears.
const BACKGROUND = 0xe9edef;
// At 2 each the two lamps clipped every pale surface to white, so a window
// frame, a plastered wall and a ceiling all came out the same flat white.
const AMBIENT_LIGHT = 0.75;
const SUN_LIGHT = 0.9;

// 45 degrees. A wider lens bends the walls of a room outwards and a building
// stops looking square.
const FIELD_OF_VIEW = 45;

// The limits of the depth range, in metres: a floor for the near plane and a
// ceiling for the far one. See `frame` for why that matters.
export const NEAR_PLANE = 0.1;
export const FAR_PLANE = 5000;

export type LookFrom = 'top' | 'front' | 'side' | 'corner';

/** Where the camera sits for each named view, as a direction from the centre. */
const LOOK_FROM: Record<LookFrom, [number, number, number]> = {
  top: [0, 1, 0.0001],
  front: [0, 0, 1],
  side: [1, 0, 0],
  corner: [1, 0.6, 1],
};

export function createScene(): { scene: Scene; camera: PerspectiveCamera } {
  const scene = new Scene();
  scene.background = new Color(BACKGROUND);
  scene.add(new AmbientLight(0xffffff, AMBIENT_LIGHT));
  const sun = new DirectionalLight(0xffffff, SUN_LIGHT);
  // Above, to one side and in front, so the three faces of a box are lit
  // differently and an edge is visible without an outline.
  sun.position.set(5, 10, 7);
  scene.add(sun);
  const camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, NEAR_PLANE, FAR_PLANE);
  return { scene, camera };
}

/**
 * Put the whole model in shot, and return its radius.
 *
 * The distance is the radius of the bounding sphere over the sine of half the
 * field of view, which frames the model whatever its size; the metre is
 * clearance so the near face is not against the lens.
 *
 * Both depth planes follow the model. Depth precision falls as far over near
 * grows, and an IFC model has coplanar faces wherever a slab meets a wall, so
 * a five kilometre range on a hundred metre building made them flicker
 * against each other on zoom.
 */
export function frame(
  camera: PerspectiveCamera,
  controls: OrbitControls,
  model: Object3D,
  from: LookFrom = 'corner',
): number {
  const box = new Box3().setFromObject(model);
  if (box.isEmpty()) return 1;

  const centre = box.getCenter(new Vector3());
  const radius = box.getSize(new Vector3()).length() / 2;
  const distance = radius / Math.sin((camera.fov * Math.PI) / 360) + 1;

  const direction = new Vector3(...LOOK_FROM[from]).normalize();
  camera.position.copy(centre).add(direction.multiplyScalar(distance));
  camera.near = Math.max(distance / 1000, NEAR_PLANE);
  camera.far = Math.min(distance * 10, FAR_PLANE);
  camera.updateProjectionMatrix();
  controls.target.copy(centre);
  controls.update();
  return radius;
}

/** Give back every geometry and material in the scene. */
export function disposeScene(scene: Scene): void {
  scene.traverse((object) => {
    const mesh = object as {
      geometry?: { dispose: () => void };
      material?: unknown;
    };
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    for (const material of materials) {
      (material as { dispose?: () => void } | undefined)?.dispose?.();
    }
  });
}
