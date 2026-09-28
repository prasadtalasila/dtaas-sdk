/**
 * What a legend or inspector panel asks of a loaded model: class counts and
 * colours, an object's measured size, and how many bindings are live right
 * now.
 *
 * Split out of `sceneView.ts` to keep that file within the project's line
 * limit: none of this changes what is on screen, unlike the selection,
 * visibility and heat rules beside it.
 */

import { Box3, Vector3, type Mesh } from 'three';

import { displayOf, objectOf, type Binding } from 'src/core/binding';
import { isLive, type FeedState, type Reading } from 'src/core/readings';
import type { Palette } from 'src/viewer/appearance';

/** How many objects of each class the model holds. */
export function countByClass(meshes: Map<string, Mesh>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const mesh of meshes.values()) {
    const ifcClass = mesh.userData.ifcClass as string | undefined;
    if (ifcClass) counts.set(ifcClass, (counts.get(ifcClass) ?? 0) + 1);
  }
  return counts;
}

/**
 * The colour the model gives each class of object, for a legend to state.
 *
 * Read from the materials the model arrived with instead of from a table
 * here, because an architect assigned those colours and a legend that
 * invented its own would describe a different building.
 */
export function colourByClass(
  meshes: Map<string, Mesh>,
  palette: Palette,
): Map<string, string> {
  const seen = new Map<string, string>();
  for (const [globalId, mesh] of meshes) {
    const ifcClass = mesh.userData.ifcClass as string | undefined;
    if (ifcClass && !seen.has(ifcClass)) {
      const material = palette.baseOf(globalId);
      const colour = (Array.isArray(material) ? material[0] : material) as
        { color?: { getHexString: () => string } } | undefined;
      if (colour?.color) seen.set(ifcClass, `#${colour.color.getHexString()}`);
    }
  }
  return new Map([...seen].sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * How large an object is, in metres, along each world axis. The box is axis
 * aligned, so a wall running at forty five degrees reports the box around
 * it instead of its length.
 */
export function sizeOfObject(
  meshes: Map<string, Mesh>,
  globalId: string,
): { x: number; y: number; z: number } | undefined {
  const mesh = meshes.get(globalId);
  if (!mesh) return undefined;
  const box = new Box3().setFromObject(mesh);
  if (box.isEmpty()) return undefined;
  const size = box.getSize(new Vector3());
  return { x: size.x, y: size.y, z: size.z };
}

/** Which sensors are currently worth colouring by, for a legend to state. */
export function liveCountOf(
  bindings: Binding[],
  readings: Map<string, Reading>,
  feed: FeedState,
  staleAfter: number,
  now: number,
): number {
  return bindings.filter((binding) => {
    const globalId = objectOf(binding);
    return (
      globalId !== undefined &&
      isLive(readings.get(globalId), feed, staleAfter, now) &&
      displayOf(binding).ramp !== undefined
    );
  }).length;
}
