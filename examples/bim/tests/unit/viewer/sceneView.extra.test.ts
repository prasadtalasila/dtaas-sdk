/**
 * A few `SceneView` answers `sceneView.test.ts` never asks: a model with no
 * property tree at all, a field cell asked about before or without an owner,
 * and a binding with no GlobalId reaching `buildField`.
 */

import { Group } from 'three';
import { SceneView } from 'src/viewer';
import type { Binding } from 'src/core';

test('an object has no facts when the model carries no property tree', () => {
  const view = new SceneView(new Group());
  expect(view.factsOf('anything')).toBeUndefined();
});

test('zoneAtCell says nothing before any field has been built', () => {
  const view = new SceneView(new Group());
  expect(view.zoneAtCell(0)).toBeUndefined();
});

test('zoneAtCell names the sensor owning a cell, and nothing for one none reaches', () => {
  const view = new SceneView(new Group());
  view.field = {
    owner: Int16Array.from([-1, 0]),
    nx: 2,
    nz: 1,
    cell: 1,
    minX: 0,
    minZ: 0,
    floorY: 0,
  };
  (view as unknown as { fieldSources: string[] }).fieldSources = ['s1'];

  expect(view.zoneAtCell(0)).toBeUndefined();
  expect(view.zoneAtCell(1)).toBe('s1');
});

test('buildField accepts a binding with no GlobalId', () => {
  const view = new SceneView(new Group());
  const nodeBinding: Binding = {
    selector: { nodeName: 'Pump-2' },
    label: 'Pump-2',
    source: { live: { transport: 'mqtt', topic: 't/pump2' } },
    display: { unit: 'C', ramp: [0, 40] },
  };

  expect(() => view.buildField([nodeBinding])).not.toThrow();
});
