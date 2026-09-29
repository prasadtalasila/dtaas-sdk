/**
 * Tests for what a loaded model looks like and what is visible.
 *
 * three.js builds a scene graph without a canvas, so all of this runs in
 * Node. Only drawing needs WebGL, and nothing here draws.
 *
 * The two invariants under test were both bought with bugs: one place
 * decides the material, one place writes `visible`. When several wrote
 * either, the last to run won, and which ran last depended on the order
 * readings arrived.
 */

import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { SceneView } from 'src/viewer';
import { binding, NOW } from 'tests/fixtures/readings';
import { building, object } from './sceneView.fixtures';

test('finds every object that carries a GlobalId', () => {
  const view = building();

  expect([...view.meshes.keys()].sort()).toEqual(['s1', 's2', 'w1', 'w2']);
});

test('an object with no GlobalId is not tracked, since nothing can bind to it', () => {
  const model = new Group();
  model.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial()));
  model.updateMatrixWorld(true);

  expect(new SceneView(model).meshes.size).toBe(0);
});

test('the floors come from the measured geometry', () => {
  expect(building().storeys).toEqual(['L1', 'L2']);
});

test('a model with no storeys offers none instead of inventing one', () => {
  const model = new Group();
  model.add(object('a', 'IfcWall', 0));
  model.updateMatrixWorld(true);

  expect(new SceneView(model, { objects: { a: {} } }).storeys).toEqual([]);
});

test('everything is visible until a floor is chosen', () => {
  const view = building();
  view.refreshVisibility();

  expect([...view.meshes.values()].every((m) => m.visible)).toBe(true);
});

test('choosing a floor hides what is not on it', () => {
  const view = building();
  view.state.storey = 'L2';
  view.refreshVisibility();

  expect(view.meshes.get('w2')!.visible).toBe(true);
  expect(view.meshes.get('w1')!.visible).toBe(false);
});

test('the lid comes off but the floor stays', () => {
  // Hiding every slab takes the floor as well, which leaves the furniture
  // standing on nothing and is worse than the lid.
  const view = building();
  view.state.storey = 'L1';
  view.state.slabsHidden = true;
  view.refreshVisibility();

  expect(view.meshes.get('s1')!.visible).toBe(false);
  expect(view.meshes.get('w1')!.visible).toBe(true);
});

test('with no floor chosen the lid toggle is all or nothing', () => {
  const view = building();
  view.state.slabsHidden = true;
  view.refreshVisibility();

  expect(view.meshes.get('s1')!.visible).toBe(false);
  expect(view.meshes.get('s2')!.visible).toBe(false);
});

test('an object hidden by hand comes back in the order it went', () => {
  const view = building();
  view.hide('w1');
  view.hide('w2');
  expect(view.meshes.get('w2')!.visible).toBe(false);

  view.restoreLastHidden();
  expect(view.meshes.get('w2')!.visible).toBe(true);
  expect(view.meshes.get('w1')!.visible).toBe(false);
});

test('hiding the same object twice does not need two restores', () => {
  const view = building();
  view.hide('w1');
  view.hide('w1');
  view.restoreLastHidden();

  expect(view.meshes.get('w1')!.visible).toBe(true);
});

test('selection wins over hover, and hover over the heatmap', () => {
  const view = building();
  view.state.selected = 'w1';
  view.state.hovered = 'w1';
  view.refreshMaterials();
  const selected = view.meshes.get('w1')!.material;

  view.state.selected = null;
  view.refreshMaterials();

  expect(view.meshes.get('w1')!.material).not.toBe(selected);
});

test('hover changes nothing while hover highlighting is off', () => {
  // Reading a heatmap with a colour following the cursor is unreadable.
  const view = building();
  view.refreshMaterials();
  const before = view.meshes.get('w1')!.material;

  view.state.hoverHighlight = false;
  view.state.hovered = 'w1';
  view.refreshMaterials();

  expect(view.meshes.get('w1')!.material).toBe(before);
});

test('the heatmap colours by zone, and two objects in one zone share a material', () => {
  const view = building();
  view.state.heat = 'storey';
  view.applyReadings(
    [binding('w1')],
    new Map([['w1', { value: 10, receivedAt: NOW }]]),
    'live',
    30,
    NOW,
  );
  view.refreshMaterials();

  expect(view.meshes.get('w1')!.material).toBe(view.meshes.get('s1')!.material);
  expect(view.meshes.get('w2')!.material).not.toBe(
    view.meshes.get('w1')!.material,
  );
});

test('stale readings leave every object in its own colour', () => {
  // A heatmap of stale values is a confident wrong answer.
  const view = building();
  view.refreshMaterials();
  const own = view.meshes.get('w1')!.material;

  view.state.heat = 'storey';
  view.applyReadings(
    [binding('w1')],
    new Map([['w1', { value: 10, receivedAt: NOW - 600_000 }]]),
    'live',
    30,
    NOW,
  );
  view.refreshMaterials();

  expect(view.meshes.get('w1')!.material).toBe(own);
});

test('transparency reaches the shell and leaves everything else alone', () => {
  const view = building();
  view.refreshMaterials();
  const wall = view.meshes.get('w1')!.material;

  view.state.transparent = true;
  view.refreshMaterials();

  expect(view.meshes.get('w1')!.material).not.toBe(wall);
  const material = view.meshes.get('w1')!.material as unknown as {
    opacity: number;
  };
  expect(material.opacity < 1).toBe(true);
});

test('resetting puts a model back to how it opened', () => {
  const view = building();
  view.state.storey = 'L2';
  view.state.transparent = true;
  view.state.slabsHidden = true;
  view.hide('w1');
  view.reset();

  expect(view.state.storey).toBe(null);
  expect([...view.meshes.values()].every((m) => m.visible)).toBe(true);
});

test('a scope the readings do not divide is not offered', () => {
  // Two sensors on two storeys and in one room. Grouping by storey
  // separates them and grouping by room does not, so only one of the two
  // is offered.
  const view = building();
  const bind = (globalId: string) => binding(globalId, [0, 1], 'C');

  expect(view.scopesFor([bind('w1'), bind('w2')])).toEqual([
    'off',
    'storey',
    'building',
  ]);
  expect(view.scopesFor([bind('w1')])).toEqual(['off', 'building']);
});
