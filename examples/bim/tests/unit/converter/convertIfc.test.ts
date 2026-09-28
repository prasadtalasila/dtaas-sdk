/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { convertIfc, type ConvertedObject } from 'src/converter';

const FIXTURES = join(__dirname, '../../fixtures');

function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(FIXTURES, name)));
}

function extent(objects: ConvertedObject[]): [number, number, number] {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const object of objects) {
    for (let i = 0; i < object.positions.length; i += 3) {
      for (let a = 0; a < 3; a += 1) {
        const v = object.positions[i + a];
        if (v < lo[a]) lo[a] = v;
        if (v > hi[a]) hi[a] = v;
      }
    }
  }
  return [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
}

describe('a wall the geometry kernel leaves in its own units', () => {
  const bytes = fixture('wall_kernel_keeps_units.ifc');

  test('comes out three metres long, not three thousand', async () => {
    // The unit trap. This file declares millimetres, and a converter that
    // hands the numbers on unchanged produces a three kilometre wall.
    const { objects } = await convertIfc(bytes);
    const [x, y, z] = extent(objects);

    expect(Math.max(x, y, z)).toBeLessThan(10);
    expect(Math.max(x, y, z)).toBeGreaterThan(2);
  });
});

describe('a column authored in inches', () => {
  const bytes = fixture('column_in_inches.ifc');

  test('comes out about three metres tall', async () => {
    // Not every file is metric. Ten feet is 3.048 metres.
    const { objects } = await convertIfc(bytes);

    expect(Math.max(...extent(objects))).toBeGreaterThan(3);
    expect(Math.max(...extent(objects))).toBeLessThan(3.2);
  });
});

describe('which way is up', () => {
  const bytes = fixture('column_in_inches.ifc');

  test('a column stands along Y, because glTF is Y up', async () => {
    // The orientation trap, and the reason this test exists. web-ifc's flat
    // transformation already returns a Y-up world, so a converter that turns
    // it again for the Z-up to Y-up change lays the model on its side. Every
    // other test here still passes, because a rotation changes no distance.
    // Asking which axis a tall object is tall along is what catches it: with
    // the extra turn this column measures 0.20 by 0.20 by 3.05 instead.
    const { objects } = await convertIfc(bytes);
    const [x, y, z] = extent(objects);

    expect(y > x && y > z).toBeTruthy();
  });
});

describe('a basin, one object at the origin', () => {
  const bytes = fixture('basin_at_the_origin.ifc');

  test('comes out about sixty centimetres across', async () => {
    const { objects } = await convertIfc(bytes);

    expect(Math.max(...extent(objects))).toBeLessThan(1);
    expect(Math.max(...extent(objects))).toBeGreaterThan(0.3);
  });

  test('every object it returns carries a GlobalId', async () => {
    // Binding is the whole purpose, so an object without one is useless and
    // is counted as failed instead of returned.
    const { objects } = await convertIfc(bytes);

    for (const object of objects) {
      expect(object.globalId).toMatch(/^[0-9A-Za-z_$]{22}$/);
    }
  });

  test('reports the schema the file declares', async () => {
    expect((await convertIfc(bytes)).schema).toMatch(/^IFC/);
  });

  test('names the IFC class of each object', async () => {
    const { objects } = await convertIfc(bytes);

    for (const object of objects) expect(object.ifcClass).toMatch(/^Ifc/);
  });

  test('gives indices that address the vertices it returns', async () => {
    // An index past the end draws nothing and reports nothing, so it is
    // worth one assertion.
    const { objects } = await convertIfc(bytes);

    for (const object of objects) {
      const vertices = object.positions.length / 3;
      expect(object.normals.length).toBe(object.positions.length);
      for (const index of object.indices) expect(index).toBeLessThan(vertices);
    }
  });
});
