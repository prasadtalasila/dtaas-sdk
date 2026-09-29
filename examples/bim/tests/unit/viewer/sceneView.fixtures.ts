/**
 * Shared fixtures for the `SceneView` tests: boxes carrying an identity, a
 * two-floor building, and a peek at the Per Sensor field's sources.
 */

import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { SceneView } from 'src/viewer';

/** `fieldSources` is a private implementation detail of `SceneView`; the upstream test reads it straight off the instance, which only TypeScript's compile-time privacy forbids. */
export function fieldSourcesOf(view: SceneView): string[] {
  return (view as unknown as { fieldSources: string[] }).fieldSources;
}

/** A box of the given size, at the given height, carrying an identity. */
export function object(
  globalId: string,
  ifcClass: string,
  y: number,
  height = 3,
): Mesh {
  const mesh = new Mesh(
    new BoxGeometry(1, height, 1),
    new MeshStandardMaterial(),
  );
  mesh.position.set(0, y + height / 2, 0);
  mesh.userData.globalId = globalId;
  mesh.userData.ifcClass = ifcClass;
  mesh.updateMatrixWorld(true);
  return mesh;
}

/** Two floors: a wall and a slab on each. */
export function building(): SceneView {
  const model = new Group();
  for (const mesh of [
    object('w1', 'IfcWall', 0),
    object('s1', 'IfcSlab', 3, 0.3),
    object('w2', 'IfcWall', 3.3),
    object('s2', 'IfcSlab', 6.3, 0.3),
  ])
    model.add(mesh);
  model.updateMatrixWorld(true);

  const tree = {
    storeys: [{ name: 'L1' }, { name: 'L2' }],
    rooms: [{ name: 'R1' }],
    objects: {
      w1: { ifcClass: 'IfcWall', storey: 'L1', room: 'R1' },
      s1: { ifcClass: 'IfcSlab', storey: 'L1' },
      w2: { ifcClass: 'IfcWall', storey: 'L2' },
      s2: { ifcClass: 'IfcSlab', storey: 'L2' },
    },
  };
  return new SceneView(model, tree);
}
