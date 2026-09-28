/**
 * The field drawn as a sheet over the floor.
 *
 * A colour on a wall says "somewhere around here". A sheet over the space
 * says where it is warm and where it is cool, and it reads at a glance
 * because the eye follows an area instead of reading thirty surfaces. The
 * building keeps its own colours underneath, so the model stays the thing
 * being looked at.
 *
 * One canvas the size of the grid, one texel per cell. Cells inside a wall
 * and cells no sensor reaches are left transparent, so the sheet stops at
 * the walls instead of covering them.
 */

import {
  CanvasTexture,
  Color,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  type Scene,
} from 'three';

import { rampColour } from 'src/core/ramp';
import type { Zones } from 'src/core/zones';
import type { Field } from 'src/viewer/field';
import type { SceneView } from 'src/viewer/sceneView';

/** How much of the floor the sheet hides. Enough to read, not enough to obscure. */
const OPACITY = 0.5;

/** How far above the floor it sits, so it does not fight the slab for the same pixels. */
const ABOVE_FLOOR_M = 0.02;

export interface FieldSheet {
  /** Draw it, or hide it when the view has nothing to show. */
  draw: (view: SceneView) => void;
  dispose: () => void;
}

/** What `drawSheet`, `ensureMesh` and `paintCells` share, so each stays a plain function instead of a closure. */
interface SheetState {
  mesh: Mesh | null;
  canvas: HTMLCanvasElement | null;
  colour: Color;
}

function clearSheet(scene: Scene, state: SheetState): void {
  if (!state.mesh) return;
  scene.remove(state.mesh);
  state.mesh.geometry.dispose();
  const material = state.mesh.material as MeshBasicMaterial;
  material.map?.dispose();
  material.dispose();
  state.mesh = null;
  state.canvas = null;
}

/** The plane a sheet is painted onto, sized to the grid and sitting just above the floor's own slab. */
function buildSheetMesh(canvas: HTMLCanvasElement, field: Field): Mesh {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const mesh = new Mesh(
    new PlaneGeometry(field.nx * field.cell, field.nz * field.cell),
    new MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: OPACITY,
      // Exempt from the storey clipping so it is not cut in half at its own
      // level.
      depthWrite: false,
      clippingPlanes: [],
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 1;
  return mesh;
}

/** Rebuilt when the grid changes shape, which is when the model changes. */
function ensureMesh(
  scene: Scene,
  state: SheetState,
  field: Field,
): Mesh | null {
  if (state.mesh && state.canvas && state.canvas.width === field.nx)
    return state.mesh;
  clearSheet(scene, state);
  const canvas = globalThis.document?.createElement('canvas') ?? null;
  if (canvas === null) return null;
  canvas.width = field.nx;
  canvas.height = field.nz;
  const mesh = buildSheetMesh(canvas, field);
  scene.add(mesh);
  state.mesh = mesh;
  state.canvas = canvas;
  return mesh;
}

/** Write one cell's colour into the image, leaving it transparent where no sensor's zone mean is known. */
function writeTexel(
  image: ImageData,
  state: SheetState,
  view: SceneView,
  zones: Zones,
  field: Field,
  i: number,
): void {
  const zone = view.zoneAtCell(i);
  const mean = zone === undefined ? undefined : zones.meanByZone.get(zone);
  if (mean === undefined) return;
  state.colour.setHex(rampColour(mean, zones.low, zones.high));
  // The canvas rows run the other way from the grid, which counts up in Z.
  const row = field.nz - 1 - Math.floor(i / field.nx);
  const at = (row * field.nx + (i % field.nx)) * 4;
  image.data[at] = Math.round(state.colour.r * 255);
  image.data[at + 1] = Math.round(state.colour.g * 255);
  image.data[at + 2] = Math.round(state.colour.b * 255);
  image.data[at + 3] = 255;
}

/** Paint one texel per cell, then sit the sheet over the plan it describes. */
function paintCells(
  view: SceneView,
  state: SheetState,
  mesh: Mesh,
  canvas: HTMLCanvasElement,
  field: Field,
  zones: Zones,
): void {
  const pen = canvas.getContext('2d');
  if (!pen) return;
  const image = pen.createImageData(field.nx, field.nz);
  for (let i = 0; i < field.owner.length; i += 1)
    writeTexel(image, state, view, zones, field, i);
  pen.putImageData(image, 0, 0);
  (mesh.material as MeshBasicMaterial).map!.needsUpdate = true;

  mesh.position.set(
    field.minX + (field.nx * field.cell) / 2,
    field.floorY + ABOVE_FLOOR_M,
    field.minZ + (field.nz * field.cell) / 2,
  );
  mesh.visible = true;
}

function drawSheet(scene: Scene, state: SheetState, view: SceneView): void {
  const { field, heatZones: zones } = view;
  if (view.state.heat !== 'sensor' || field === null || zones === null) {
    if (state.mesh) state.mesh.visible = false;
    return;
  }
  const mesh = ensureMesh(scene, state, field);
  if (!mesh || !state.canvas) return;
  paintCells(view, state, mesh, state.canvas, field, zones);
}

export function createFieldSheet(scene: Scene): FieldSheet {
  const state: SheetState = { mesh: null, canvas: null, colour: new Color() };
  return {
    draw: (view) => drawSheet(scene, state, view),
    dispose: () => clearSheet(scene, state),
  };
}
