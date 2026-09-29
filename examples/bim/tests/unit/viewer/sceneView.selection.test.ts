/**
 * Tests for how `SceneView` answers questions about one object or one class:
 * its measured size, a highlighted IFC class, and the selection halo.
 */

import type { Mesh } from 'three';
import { building } from './sceneView.fixtures';

describe('sizeOf', () => {
  test('measures the object from its geometry, in metres', () => {
    // The tree does not carry a size, so this comes from the mesh. Y is
    // the height, because the scene is Y up.
    const size = building().sizeOf('w1')!;

    expect(size.x).toBe(1);
    expect(size.y).toBe(3);
    expect(size.z).toBe(1);
  });

  test('says nothing about an object that is not in the model', () => {
    // A manifest can name an object the geometry does not have, and a size
    // of zero would read as a real measurement of a flat thing.
    expect(building().sizeOf('not-here')).toBe(undefined);
  });
});

describe('highlightedClass', () => {
  test('lights every object of the class and nothing else', () => {
    // The question in front of a grey building is "where are the
    // columns", and a legend that only names colours does not answer it.
    const view = building();
    view.state.highlightedClass = 'IfcWall';
    view.refreshMaterials();

    const material = (id: string) => view.meshes.get(id)!.material;
    expect(material('w1')).toBe(material('w2'));
    expect(material('w1')).not.toBe(material('s1'));
  });

  test('the selection still wins, so pointing at one object says which', () => {
    const view = building();
    view.state.highlightedClass = 'IfcWall';
    view.state.selected = 'w1';
    view.refreshMaterials();

    expect(view.meshes.get('w1')!.material).not.toBe(
      view.meshes.get('w2')!.material,
    );
  });

  test('clearing it puts every object back in its own colour', () => {
    const view = building();
    const before = view.meshes.get('w1')!.material;
    view.state.highlightedClass = 'IfcWall';
    view.refreshMaterials();
    view.state.highlightedClass = null;
    view.refreshMaterials();

    expect(view.meshes.get('w1')!.material).toBe(before);
  });
});

describe('the selection halo', () => {
  /** A halo that records what it was asked to do, so no canvas is needed. */
  function recorder() {
    const calls: Array<string | null> = [];
    return {
      calls,
      show: (mesh: Mesh) => calls.push(mesh.userData.globalId),
      hide: () => calls.push(null),
      dispose: () => {},
    };
  }

  test('goes around the selected object', () => {
    const view = building();
    const glow = recorder();
    view.attachGlow(glow);

    view.state.selected = 'w1';
    view.refreshMaterials();

    expect(glow.calls[glow.calls.length - 1]).toBe('w1');
  });

  test('comes off when the selection is cleared', () => {
    const view = building();
    const glow = recorder();
    view.attachGlow(glow);

    view.state.selected = 'w1';
    view.refreshMaterials();
    view.state.selected = null;
    view.refreshMaterials();

    expect(glow.calls[glow.calls.length - 1]).toBe(null);
  });

  test('comes off when the floor filter hides what is selected', () => {
    // A halo around a hidden object is a glow around nothing, on a floor
    // the object is not on.
    const view = building();
    const glow = recorder();
    view.attachGlow(glow);

    view.state.selected = 'w1';
    view.state.storey = 'L2';
    view.refreshVisibility();
    view.refreshMaterials();

    expect(glow.calls[glow.calls.length - 1]).toBe(null);
  });

  test('a view with no halo paints exactly as before', () => {
    const view = building();
    view.state.selected = 'w1';

    expect(() => view.refreshMaterials()).not.toThrow();
  });
});
