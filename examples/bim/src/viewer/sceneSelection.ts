/**
 * The one decision about what an object is painted with.
 *
 * Split out of `sceneView.ts` to keep that file within the project's line
 * limit. Selection wins over hover, hover over the picked legend class, and
 * both win over the heatmap, so pointing at one object still says which one.
 */

import type { Material, Mesh } from 'three';

import { SHELL, type Palette } from 'src/viewer/appearance';
import type { Glow } from 'src/viewer/glow';
import { heatColourOf } from 'src/viewer/sceneHeat';
import type { ViewState } from 'src/viewer/sceneView.types';
import type { Zones } from 'src/core/zones';

/** Selection wins over hover, and hover over the picked legend class. */
function overrideFor(
  state: ViewState,
  palette: Palette,
  globalId: string,
  mesh: Mesh,
): Material | Material[] | undefined {
  if (globalId === state.selected) return palette.selected;
  // A heatmap with a colour following the cursor is unreadable, so this
  // only applies while hover highlighting is on.
  if (state.hoverHighlight && globalId === state.hovered) {
    return palette.hovered;
  }
  if (
    state.highlightedClass &&
    mesh.userData.ifcClass === state.highlightedClass
  ) {
    return palette.highlighted;
  }
  return undefined;
}

export function paintFor(
  state: ViewState,
  palette: Palette,
  zones: Zones | null,
  zoneFor: (globalId: string) => string | undefined,
  globalId: string,
  mesh: Mesh,
): Material | Material[] | undefined {
  const override = overrideFor(state, palette, globalId, mesh);
  if (override) return override;

  const heat = heatColourOf(zones, zoneFor, palette, globalId);
  const base = heat ?? palette.baseOf(globalId);
  const ifcClass = mesh.userData.ifcClass as string | undefined;
  if (state.transparent && ifcClass && SHELL.has(ifcClass)) {
    return palette.ghostOf(base);
  }
  return base;
}

/** Paint every mesh; the one place `mesh.material` is assigned. */
export function paintAll(
  meshes: Map<string, Mesh>,
  state: ViewState,
  palette: Palette,
  zones: Zones | null,
  zoneFor: (globalId: string) => string | undefined,
): void {
  for (const [globalId, mesh] of meshes) {
    const material = paintFor(state, palette, zones, zoneFor, globalId, mesh);
    if (material) mesh.material = material;
  }
}

/** Halo the selected object, or hide it: never around one the floor filter has hidden. */
export function syncGlow(
  glow: Glow | null,
  meshes: Map<string, Mesh>,
  selectedId: string | null,
): void {
  if (!glow) return;
  const selected = selectedId === null ? undefined : meshes.get(selectedId);
  if (selected?.visible) glow.show(selected);
  else glow.hide();
}

export default paintFor;
