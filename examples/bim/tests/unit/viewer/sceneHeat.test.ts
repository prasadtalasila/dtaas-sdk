/**
 * Direct tests for the heatmap's own arithmetic: colouring one object from a
 * zone's mean, walking the flooded plan, and rasterising it in the first
 * place. `sceneView.ts` exercises the success paths already; this covers the
 * "nothing to colour by" and "nothing to walk from" answers it never reaches.
 */

import { BoxGeometry, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { buildField } from 'src/viewer/field';
import { fieldFor, heatColourOf, sensorZoneFor } from 'src/viewer/sceneHeat';
import type { Binding } from 'src/core';
import type { Zones } from 'src/core/zones';
import type { Palette } from 'src/viewer/appearance';

function mesh(globalId: string, x = 0, z = 0): Mesh {
  const box = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
  box.position.set(x, 0.5, z);
  box.userData.globalId = globalId;
  box.updateMatrixWorld(true);
  return box;
}

const ZONES: Zones = {
  meanByZone: new Map([['L1', 20]]),
  low: 0,
  high: 40,
  counted: 1,
};
const palette = { heatOf: jest.fn(() => 'coloured') } as unknown as Palette;

describe('heatColourOf', () => {
  test('the heatmap being off leaves every object in its own colour', () => {
    expect(heatColourOf(null, () => 'L1', palette, 'w1')).toBeUndefined();
  });

  test('an object in no zone is left in its own colour', () => {
    expect(heatColourOf(ZONES, () => undefined, palette, 'w1')).toBeUndefined();
  });

  test('a zone with no reading is left in its own colour', () => {
    expect(heatColourOf(ZONES, () => 'nowhere', palette, 'w1')).toBeUndefined();
  });

  test('a zone with a reading is coloured from it', () => {
    expect(heatColourOf(ZONES, () => 'L1', palette, 'w1')).toBe('coloured');
  });
});

describe('sensorZoneFor', () => {
  test('with no field walked yet, an object is in no zone', () => {
    const meshes = new Map([['w1', mesh('w1')]]);
    expect(sensorZoneFor(meshes, null, [], 'w1')).toBeUndefined();
  });

  test('an object with no mesh is in no zone', () => {
    const meshes = new Map([['w1', mesh('w1')]]);
    const field = buildField(meshes.values(), [new Vector3(0, 0.5, 0)], 0);
    expect(sensorZoneFor(meshes, field, ['w1'], 'gone')).toBeUndefined();
  });

  test('an object outside where the field reaches is in no zone', () => {
    // The field is built for a model holding just the sensor's own wall, so
    // its grid never extends to where a far-off object sits.
    const near = new Map([['w1', mesh('w1')]]);
    const field = buildField(near.values(), [new Vector3(0, 0.5, 0)], 0);
    const far = new Map([
      ['w1', mesh('w1')],
      ['gone', mesh('gone', 1000, 1000)],
    ]);

    expect(sensorZoneFor(far, field, ['w1'], 'gone')).toBeUndefined();
  });
});

describe('fieldFor', () => {
  test('with no bindings, there is nothing to flood', () => {
    expect(fieldFor(new Map(), [], [], null)).toEqual({
      field: null,
      fieldSources: [],
    });
  });

  test('a binding with no GlobalId contributes no source, even with a mesh present', () => {
    const meshes = new Map([['w1', mesh('w1')]]);
    const nodeBinding: Binding = {
      selector: { nodeName: 'Pump-2' },
      label: 'Pump-2',
      source: { live: { transport: 'mqtt', topic: 't/pump2' } },
      display: { unit: 'C', ramp: [0, 1] },
    };

    const { fieldSources } = fieldFor(meshes, [nodeBinding], [], null);

    expect(fieldSources).toEqual([]);
  });
});
