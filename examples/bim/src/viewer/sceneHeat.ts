/**
 * Colouring an object by its zone's mean reading, and rasterising the floor
 * the Per Sensor scope walks.
 *
 * Split out of `sceneView.ts` to keep that file within the project's line
 * limit: both are the heatmap's own arithmetic, kept apart from the
 * selection and visibility rules beside them.
 */

import { Box3, Vector3, type Mesh, type MeshStandardMaterial } from 'three';

import { objectOf, type Binding } from 'src/core/binding';
import { bandOf, type Band } from 'src/core/storeys';
import type { Zones } from 'src/core/zones';
import type { Palette } from 'src/viewer/appearance';
import { buildField, sourceAt, type Field } from 'src/viewer/field';

/**
 * The heatmap's colour for one object, or undefined to leave it in its own
 * colour: the heatmap is off, no sensor covers the object's zone, or the
 * readings have gone stale. A heatmap of stale values is a confident wrong
 * answer.
 */
export function heatColourOf(
  zones: Zones | null,
  zoneFor: (globalId: string) => string | undefined,
  palette: Palette,
  globalId: string,
): MeshStandardMaterial | undefined {
  if (!zones) return undefined;
  const zone = zoneFor(globalId);
  if (zone === undefined) return undefined;
  const mean = zones.meanByZone.get(zone);
  if (mean === undefined) return undefined;
  return palette.heatOf(mean, zones.low, zones.high);
}

/** Which sensor's walk reaches an object, by its position on the flooded plan. */
export function sensorZoneFor(
  meshes: Map<string, Mesh>,
  field: Field | null,
  fieldSources: string[],
  globalId: string,
): string | undefined {
  if (field === null) return undefined;
  const mesh = meshes.get(globalId);
  if (!mesh) return undefined;
  const at = new Box3().setFromObject(mesh).getCenter(new Vector3());
  const index = sourceAt(field, at.x, at.z);
  return index < 0 ? undefined : fieldSources[index];
}

/** The sensor positions worth flooding from: those on the chosen floor, when one is chosen. A sensor on the ground floor says nothing about the floor above it. */
function sourcesOn(
  meshes: Map<string, Mesh>,
  bindings: Binding[],
  band: Band | undefined,
): { sources: Vector3[]; fieldSources: string[] } {
  const box = new Box3();
  const sources: Vector3[] = [];
  const fieldSources: string[] = [];
  for (const binding of bindings) {
    const globalId = objectOf(binding);
    const mesh = globalId === undefined ? undefined : meshes.get(globalId);
    if (mesh && globalId !== undefined) {
      const at = box.setFromObject(mesh).getCenter(new Vector3());
      const onFloor = !band || (at.y > band.from && at.y < band.to);
      if (onFloor) {
        sources.push(at);
        fieldSources.push(globalId);
      }
    }
  }
  return { sources, fieldSources };
}

/**
 * Rasterise the chosen floor and flood it from the sensors on it.
 *
 * The cut runs 1.2 m above the floor of the storey in force, and the cut is
 * what decides which objects are walls, so this has to be rebuilt for the
 * storey being drawn and not just for the bindings.
 */
export function fieldFor(
  meshes: Map<string, Mesh>,
  bindings: Binding[],
  bands: Band[],
  storey: string | null,
): { field: Field | null; fieldSources: string[] } {
  if (bindings.length === 0) return { field: null, fieldSources: [] };

  const band = storey ? bandOf(bands, storey) : undefined;
  const floor = band ?? bands[0];
  const { sources, fieldSources } = sourcesOn(meshes, bindings, band);

  return {
    field: buildField(meshes.values(), sources, floor ? floor.from : 0),
    fieldSources,
  };
}
