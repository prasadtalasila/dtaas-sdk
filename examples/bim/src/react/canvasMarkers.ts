/**
 * The markers the manifest's sensors put on the model, and what the canvas
 * says about them.
 */

import {
  Box3,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  type Object3D,
} from 'three';
import { idOf, resolveBindings, type Binding } from 'src/core';
import { objectsOf } from 'src/react/scene';

// A marker is a fraction of the model, so it is the same size on a substation
// and on a sixty metre building.
const MARKER_SHARE_OF_MODEL = 0.006;

/**
 * The colour of a sensor that has not reported.
 *
 * Deliberately off the ramp: a marker at the cold end of a temperature ramp
 * read as four degrees while the card beside it said no message had arrived.
 * Nothing recolours a marker yet; the readings repaint the objects.
 */
const NO_READING_COLOUR = 0x9aa3ad;

export interface Placement {
  placed: number;
  /** Bindings naming an object this geometry does not have. */
  missing: unknown[];
}

/**
 * One marker, drawn over the geometry it sits on: a sensor inside a wall is
 * otherwise invisible from outside, which defeats the purpose of a marker.
 */
function markerFor(shape: SphereGeometry, binding: Binding): Mesh {
  const material = new MeshBasicMaterial({
    color: NO_READING_COLOUR,
    depthTest: false,
  });
  const marker = new Mesh(shape, material);
  marker.renderOrder = 2;
  marker.name = `marker:${idOf(binding)}`;
  return marker;
}

/**
 * Put a marker on every binding the geometry can account for.
 *
 * Bindings that resolve to nothing are returned, not dropped: a manifest
 * pointing at an object the model lacks is the ordinary result of a
 * re-export, and a view that silently draws four markers where the manifest
 * asked for six is worse than one that says which two are missing.
 */
export function addMarkers(
  model: Object3D,
  bindings: Binding[],
  radius: number,
): Placement {
  const { resolved, unresolved } = resolveBindings(bindings, objectsOf(model));
  const size = Math.max(radius * MARKER_SHARE_OF_MODEL, 0.05);
  const shape = new SphereGeometry(size, 16, 12);
  for (const { binding, object } of resolved) {
    const marker = markerFor(shape, binding);
    new Box3().setFromObject(object.node).getCenter(marker.position);
    model.add(marker);
  }
  return { placed: resolved.length, missing: unresolved };
}

/** "1 sensor", "2 sensors". Written out because "1 sensors" reads as a bug. */
function plural(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}

/** What to say about the markers, or undefined for a model with no sensors. */
export function sensorReport(
  total: number,
  { placed, missing }: Placement,
  proposed: boolean,
): string | undefined {
  if (total === 0) return undefined;
  const kind = proposed ? 'proposed sensor' : 'sensor';
  if (missing.length === 0) {
    return `${placed} ${plural(kind, placed)} placed on the model.`;
  }
  return (
    `${placed} of ${total} ${plural(kind, total)} placed. ` +
    `${missing.length} name an object this geometry does not have.`
  );
}
