/**
 * A halo around the object a person just clicked.
 *
 * The selection used to be the object repainted translucent yellow, which
 * works on a wall and fails on an 85 mm thermostat: yellow speck lost in a
 * floor of furniture. So the selection also gets a halo: the object's own
 * geometry, drawn a little larger, inside out, and added to the light
 * already there. The same failure is written up in `appearance.ts` for the
 * legend highlight.
 *
 * One mesh and one material for the whole session. The geometry is borrowed
 * from whichever object is selected and never copied, so selecting is a
 * matrix and a pointer.
 */

import {
  AdditiveBlending,
  BackSide,
  Box3,
  BufferGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Vector3,
} from 'three';

import { SELECTED_COLOUR } from 'src/viewer/appearance';

/**
 * How far the halo stands off the object, in metres.
 *
 * A margin in world units instead of a scale factor, because a factor that
 * makes a thermostat visible turns a wall into a second wall.
 */
export const GLOW_MARGIN_M = 0.06;

/** Bright enough to find, dim enough that the object stays the thing being looked at. */
const GLOW_OPACITY = 0.55;

/** An object smaller than this in every direction is treated as a point, to avoid dividing by zero. */
const MIN_SIZE_M = 0.001;

export interface Glow {
  /** Put the halo around this object. */
  show(mesh: Mesh): void;
  hide(): void;
  dispose(): void;
}

/** What `showGlow`, `hideGlow` and `disposeGlow` share, so each stays a plain function instead of a closure. */
interface GlowState {
  halo: Mesh;
  material: MeshBasicMaterial;
  empty: BufferGeometry;
  box: Box3;
  size: Vector3;
  centre: Vector3;
  scale: Matrix4;
  toCentre: Matrix4;
  fromCentre: Matrix4;
}

/** Grow the halo about the geometry's own centre, matching the shape of whatever was picked. */
function showGlow(state: GlowState, mesh: Mesh): void {
  const { halo, box, size, centre, scale, toCentre, fromCentre } = state;
  mesh.updateWorldMatrix(true, false);
  box.setFromObject(mesh).getSize(size);

  // One factor for all three axes: a factor per axis would be tighter, but
  // only while the object is axis aligned, and an IFC model is not.
  const largest = Math.max(size.x, size.y, size.z, MIN_SIZE_M);
  const factor = (largest + 2 * GLOW_MARGIN_M) / largest;

  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  mesh.geometry.boundingBox?.getCenter(centre);

  halo.geometry = mesh.geometry;
  halo.matrix
    .copy(mesh.matrixWorld)
    .multiply(fromCentre.makeTranslation(centre.x, centre.y, centre.z))
    .multiply(scale.makeScale(factor, factor, factor))
    .multiply(toCentre.makeTranslation(-centre.x, -centre.y, -centre.z));
  halo.visible = true;
}

function hideGlow(state: GlowState): void {
  state.halo.visible = false;
  // The geometry belongs to the model, so it is let go instead of disposed:
  // disposing it here would delete the object's own mesh.
  state.halo.geometry = state.empty;
}

function disposeGlow(state: GlowState, scene: Object3D): void {
  scene.remove(state.halo);
  state.halo.geometry = state.empty;
  state.empty.dispose();
  state.material.dispose();
}

/**
 * Additive blending, so the halo brightens what is behind it instead of
 * hiding it, and no depth write, so it never occludes the object it points
 * at. The back side is drawn because the halo is a shell around the object:
 * its front faces are behind the object and would be wasted.
 */
function haloMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: SELECTED_COLOUR,
    transparent: true,
    opacity: GLOW_OPACITY,
    blending: AdditiveBlending,
    depthWrite: false,
    side: BackSide,
  });
}

/** Add the halo mesh to the scene, hidden until something is selected. */
function glowStateFor(scene: Object3D): GlowState {
  const material = haloMaterial();
  const empty = new BufferGeometry();
  const halo = new Mesh(empty, material);
  halo.visible = false;
  halo.matrixAutoUpdate = false;
  // Drawn after the model, so the blend has the building underneath it.
  halo.renderOrder = 1;
  scene.add(halo);

  return {
    halo,
    material,
    empty,
    box: new Box3(),
    size: new Vector3(),
    centre: new Vector3(),
    scale: new Matrix4(),
    toCentre: new Matrix4(),
    fromCentre: new Matrix4(),
  };
}

/** Add the halo to a scene, hidden until something is selected. */
export function createGlow(scene: Object3D): Glow {
  const state = glowStateFor(scene);
  return {
    show: (mesh) => showGlow(state, mesh),
    hide: () => hideGlow(state),
    dispose: () => disposeGlow(state, scene),
  };
}
