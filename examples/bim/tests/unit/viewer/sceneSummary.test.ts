/**
 * Direct tests for `colourByClass` and `sizeOfObject`, which nothing else
 * exercises for a multi-material mesh or for geometry with no measurable
 * extent.
 */

import {
  BoxGeometry,
  BufferGeometry,
  Mesh,
  MeshStandardMaterial,
  type Material,
} from 'three';
import { colourByClass, sizeOfObject } from 'src/viewer/sceneSummary';
import type { Palette } from 'src/viewer/appearance';

function classedMesh(ifcClass: string): Mesh {
  const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
  mesh.userData.ifcClass = ifcClass;
  return mesh;
}

function paletteFrom(base: Map<string, Material | Material[]>): Palette {
  return {
    baseOf: (globalId: string) => base.get(globalId),
  } as unknown as Palette;
}

test('a multi-material mesh is coloured by its first material', () => {
  const wall = classedMesh('IfcWall');
  const meshes = new Map([['w1', wall]]);
  const base = new Map<string, Material | Material[]>([
    ['w1', [new MeshStandardMaterial({ color: 0xff0000 })]],
  ]);

  expect(colourByClass(meshes, paletteFrom(base)).get('IfcWall')).toBe(
    '#ff0000',
  );
});

test('a class with no material recorded for it is left out of the legend', () => {
  const slab = classedMesh('IfcSlab');
  const meshes = new Map([['s1', slab]]);
  const base = new Map<string, Material | Material[]>([['s1', []]]);

  expect(colourByClass(meshes, paletteFrom(base)).has('IfcSlab')).toBe(false);
});

test('geometry with no measurable extent has no size', () => {
  const empty = new Mesh(new BufferGeometry());
  const meshes = new Map([['w1', empty]]);

  expect(sizeOfObject(meshes, 'w1')).toBeUndefined();
});
