/**
 * Where the floors are, measured from the geometry, and which objects a
 * chosen floor and the lid toggle leave visible.
 *
 * Split out of `sceneView.ts` to keep that file within the project's line
 * limit: this is one coherent piece of behaviour, the band a mesh falls in.
 */

import { Box3, type Group, type Mesh, type Object3D } from 'three';

import { bandsFrom, type Band } from 'src/core/storeys';
import type { Palette } from 'src/viewer/appearance';
import type { PropertyTree } from 'src/viewer/sceneView.types';

/** Roofs, slabs and ceilings: the lid that stops a floor being seen into. */
const LIDS = new Set(['IfcSlab', 'IfcRoof', 'IfcCovering']);

/** How far above a storey's floor a lid has to be before it counts as the lid of that floor instead of its floor. A slab's thickness puts its base slightly above the level it defines. */
const LID_MARGIN_M = 0.5;

/** Every mesh in the model that carries a GlobalId, and the lowest point of each, for `bandsOf`. */
export function collectMeshes(
  model: Group,
  palette: Palette,
): { meshes: Map<string, Mesh>; base: Map<string, number> } {
  const meshes = new Map<string, Mesh>();
  const base = new Map<string, number>();
  const box = new Box3();
  model.traverse((node: Object3D) => {
    const mesh = node as Mesh & { isMesh?: boolean };
    if (!mesh.isMesh) return;
    const globalId = mesh.userData.globalId as string | undefined;
    if (!globalId) return;
    meshes.set(globalId, mesh);
    palette.remember(globalId, mesh);
    box.setFromObject(mesh);
    if (Number.isFinite(box.min.y)) base.set(globalId, box.min.y);
  });
  return { meshes, base };
}

/** The bands a model's storeys measure out, from the base height recorded for each object. */
export function bandsOf(
  tree: PropertyTree,
  bases: Map<string, number>,
): Band[] {
  return bandsFrom(
    (tree.storeys ?? []).map((storey) => storey.name),
    [...bases].flatMap(([globalId, base]) => {
      const storey = tree.objects?.[globalId]?.storey;
      return storey ? [{ storey, base }] : [];
    }),
  );
}

/** Whether a lid above the chosen band should come off. Only the lid above comes off: hiding every slab takes the floor a person stands on with it. */
function lidHidden(mesh: Mesh, box: Box3, band: Band | undefined): boolean {
  const ifcClass = mesh.userData.ifcClass as string | undefined;
  if (!ifcClass || !LIDS.has(ifcClass)) return false;
  if (!band) return true;
  box.setFromObject(mesh);
  return box.min.y > band.from + LID_MARGIN_M;
}

/**
 * The one place `visible` is written.
 *
 * Three things hide an object and they have to agree: the chosen floor, the
 * lid toggle, and anything hidden by hand. Each writing separately meant the
 * floor filter could bring back a slab the lid toggle had just removed.
 */
export function visibilityOf(
  meshes: Map<string, Mesh>,
  band: Band | undefined,
  slabsHidden: boolean,
  hiddenByHand: string[],
): void {
  const box = new Box3();

  for (const [globalId, mesh] of meshes) {
    let visible = true;

    if (band) {
      box.setFromObject(mesh);
      visible = box.max.y > band.from && box.min.y < band.to;
    }

    if (visible && slabsHidden && lidHidden(mesh, box, band)) visible = false;
    if (visible && hiddenByHand.includes(globalId)) visible = false;
    mesh.visible = visible;
  }
}
