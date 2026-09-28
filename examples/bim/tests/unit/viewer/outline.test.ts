/**
 * Tests for the edge outlines.
 *
 * They exist because a building is a field of grey boxes that touch, and
 * the line is what separates them. What can go wrong is cheap to check: one
 * line per object, one material for all of them, and nothing added that a
 * click could hit.
 */

import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { addOutlines } from 'src/viewer';

/** What the test reads off an outline without pulling in three's `LineSegments` type. */
interface OutlineChild {
  material: unknown;
  isMesh?: boolean;
  isLineSegments?: boolean;
}

function model(count = 3): { group: Group; meshes: Mesh[] } {
  const group = new Group();
  const meshes: Mesh[] = [];
  for (let i = 0; i < count; i += 1) {
    const mesh = new Mesh(new BoxGeometry(1, 2, 1), new MeshStandardMaterial());
    mesh.userData.globalId = `g${i}`;
    group.add(mesh);
    meshes.push(mesh);
  }
  return { group, meshes };
}

describe('addOutlines', () => {
  test('gives every object exactly one outline', () => {
    const { meshes } = model();
    addOutlines(meshes);

    for (const mesh of meshes) {
      expect(mesh.children.length).toBe(1);
      expect(mesh.children[0].name).toBe('outline');
    }
  });

  test('shares one material across all of them', () => {
    // A material is a compiled shader. One per object on a ten thousand
    // object building is the difference between a viewer and a slideshow.
    const { meshes } = model(5);
    addOutlines(meshes);

    const materials = new Set(
      meshes.map(
        (mesh) => (mesh.children[0] as unknown as OutlineChild).material,
      ),
    );
    expect(materials.size).toBe(1);
  });

  test('adds lines and not meshes, so a click cannot land on one', () => {
    // The raycast runs over the meshes non-recursively, and this is the
    // other half of that: what is added is not a mesh in the first place.
    const { meshes } = model(1);
    addOutlines(meshes);

    const outline = meshes[0].children[0] as unknown as OutlineChild;
    expect(outline.isMesh).toBe(undefined);
    expect(outline.isLineSegments).toBe(true);
  });

  test('hides with the object it belongs to', () => {
    // A floor filter hides a wall by setting visible on the mesh. The
    // outline has to go with it, or a hidden floor leaves its wireframe
    // behind.
    const { meshes } = model(1);
    addOutlines(meshes);
    meshes[0].visible = false;

    expect(meshes[0].children[0].parent!.visible).toBe(false);
  });

  test('skips an object with no geometry instead of throwing', () => {
    const empty = new Mesh();
    // @ts-expect-error exercising the missing-geometry path deliberately
    empty.geometry = undefined;

    expect(() => addOutlines([empty])).not.toThrow();
    expect(empty.children.length).toBe(0);
  });
});
