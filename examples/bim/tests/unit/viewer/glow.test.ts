/**
 * Tests for the selection halo.
 *
 * The two that matter are the ones a bug would be silent about: a halo that
 * grows by a scale factor swallows a wall, and a halo that disposes the
 * geometry it borrowed deletes the model.
 */

import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three';
import { createGlow, GLOW_MARGIN_M } from 'src/viewer';

/** A box of the given size at the origin, with its world matrix current. */
function object(size: number[]): Mesh {
  const mesh = new Mesh(
    new BoxGeometry(...(size as [number, number, number])),
    new MeshStandardMaterial(),
  );
  mesh.updateMatrixWorld(true);
  return mesh;
}

/** The one mesh the glow added to the scene. */
const haloOf = (scene: Object3D) =>
  scene.children[scene.children.length - 1] as Mesh;

describe('createGlow', () => {
  test('adds nothing visible until something is selected', () => {
    const scene = new Group();
    createGlow(scene);

    expect(haloOf(scene).visible).toBe(false);
  });

  test('a small sensor gains the margin on every side', () => {
    // 85 mm is the thermostat this was written for. A scale factor tuned
    // for a wall leaves it a speck, which is the bug being prevented.
    const scene = new Group();
    const glow = createGlow(scene);
    const sensor = object([0.085, 0.085, 0.025]);

    glow.show(sensor);
    const halo = haloOf(scene);
    const scale = new Vector3().setFromMatrixScale(halo.matrix);

    expect(halo.visible).toBe(true);
    // The geometry is stored as 32 bit floats, so the grown size lands
    // within a rounding error of the margin instead of exactly on it.
    expect(
      Math.abs(0.085 * scale.x - (0.085 + 2 * GLOW_MARGIN_M)) < 1e-6,
    ).toBeTruthy();
  });

  test('a wall does not become a second wall', () => {
    const scene = new Group();
    const glow = createGlow(scene);

    glow.show(object([6, 3, 0.3]));
    const scale = new Vector3().setFromMatrixScale(haloOf(scene).matrix);

    expect(scale.x < 1.1).toBeTruthy();
  });

  test('a degenerate object does not divide by zero', () => {
    const scene = new Group();
    const glow = createGlow(scene);

    glow.show(object([0, 0, 0]));
    const scale = new Vector3().setFromMatrixScale(haloOf(scene).matrix);

    expect(Number.isFinite(scale.x)).toBeTruthy();
  });

  test('hiding gives the borrowed geometry back instead of keeping it', () => {
    const scene = new Group();
    const glow = createGlow(scene);
    const sensor = object([0.085, 0.085, 0.025]);

    glow.show(sensor);
    glow.hide();

    expect(haloOf(scene).visible).toBe(false);
    expect(haloOf(scene).geometry).not.toBe(sensor.geometry);
  });

  test('disposing leaves the selected object its geometry', () => {
    // The halo never copies geometry, so disposing the wrong one here would
    // delete a mesh of the building.
    const scene = new Group();
    const glow = createGlow(scene);
    const sensor = object([0.085, 0.085, 0.025]);

    glow.show(sensor);
    glow.dispose();

    expect(sensor.geometry.getAttribute('position').count > 0).toBeTruthy();
    expect(scene.children.length).toBe(0);
  });
});
