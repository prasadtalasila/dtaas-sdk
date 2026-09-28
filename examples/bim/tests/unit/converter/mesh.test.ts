/**
 * Direct tests for `toObject`: the objects a real IFC file never produces,
 * because `convertIfc.test.ts` only ever feeds it valid models. A fake
 * `IfcAPI` stands in, since these answers depend only on what it reports.
 */

import type { FlatMesh, IfcAPI } from 'web-ifc';
import { toObject } from 'src/converter/mesh';

interface FakeLine {
  GlobalId?: { value?: string };
  Name?: { value?: string };
}

function fakeApi(getLine: () => FakeLine | null): IfcAPI {
  return {
    GetLine: getLine,
    GetLineType: () => 1,
    GetNameFromTypeCode: () => 'IfcWall',
  } as unknown as IfcAPI;
}

const noGeometry = {
  expressID: 1,
  geometries: { size: () => 0 },
} as unknown as FlatMesh;

test('a mesh whose line cannot be read has no identity to bind to', () => {
  const api = fakeApi(() => null);
  expect(toObject(api, 0, noGeometry)).toBeNull();
});

test('a mesh with no GlobalId is not returned, since nothing can bind to it', () => {
  const api = fakeApi(() => ({}));
  expect(toObject(api, 0, noGeometry)).toBeNull();
});

test('a mesh with a GlobalId but no geometry pieces is not returned', () => {
  const api = fakeApi(() => ({ GlobalId: { value: '0'.repeat(22) } }));
  expect(toObject(api, 0, noGeometry)).toBeNull();
});
