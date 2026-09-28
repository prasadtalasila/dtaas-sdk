/**
 * Which sensor reaches each point of a floor, as a grid.
 *
 * The other groupings a heatmap offers ask the model which room or storey an
 * object is in. A model that declares no `IfcSpace` and draws one storey
 * answers the same thing for every object, so a dozen readings average into
 * one colour over everything. Straight-line distance is wrong for a
 * different reason: it goes through walls.
 *
 * So the floor is rasterised and the field spreads by walking. Cells inside
 * a wall are blocked, cells inside a door are opened again because a doorway
 * is how air moves between rooms, and every sensor floods outwards at once.
 * The idea of a grid over the plan instead of a colour per object comes from
 * ProBIM's `ExportHeatmap`.
 *
 * It approximates: an object blocks by its bounding box, so a wall at an
 * angle blocks more than it should, and every model this was built against
 * is orthogonal. The grid itself, and how it is built, is `fieldGrid.ts`.
 */

import { type Vector3, type Mesh } from 'three';

import {
  gridOf,
  paintBlocks,
  seedOwners,
  floodOwners,
  fieldFrom,
} from 'src/viewer/fieldGrid';

/** How wide a cell is, in metres. A doorway is about 0.9 m, so this fits three. */
export const CELL_M = 0.25;

/** How far above the floor the plan is cut. Chest height: above the furniture and below the lintels, so a doorway reads as a gap and a desk does not. */
export const CUT_M = 1.2;

/** What stops the field. Furniture is not here: air moves over a desk. */
export const BLOCKS = new Set([
  'IfcWall',
  'IfcWallStandardCase',
  'IfcColumn',
  'IfcCurtainWall',
]);

/** What opens it again, because a doorway is how one room reaches the next. */
export const OPENS = new Set(['IfcDoor']);

/** How far to look for an owned cell around a point inside a wall. A wall is 0.2 m and a cell 0.25 m, so three reaches through the thickest of them. */
export const SEARCH_CELLS = 3;

export interface Field {
  /** The index of the owning source per cell, or -1 where none reaches. */
  owner: Int16Array;
  nx: number;
  nz: number;
  cell: number;
  minX: number;
  minZ: number;
  /** The height the plan was cut at, which a caller draws the sheet just above. */
  floorY: number;
}

/**
 * Build the grid.
 *
 * `sources` are the world positions to flood from, in the order a caller
 * wants them indexed. Returns null when there is nothing to flood from or
 * nothing to flood through, which a caller shows as no field at all.
 */
export function buildField(
  meshes: Iterable<Mesh>,
  sources: Vector3[],
  floorY: number,
): Field | null {
  const all = [...meshes];
  if (sources.length === 0 || all.length === 0) return null;

  const grid = gridOf(all, CELL_M);
  if (!grid) return null;

  const blocked = new Uint8Array(grid.nx * grid.nz);
  paintBlocks(all, blocked, grid, floorY + CUT_M, BLOCKS, OPENS);

  const seeded = seedOwners(sources, blocked, grid);
  if (!seeded) return null;
  floodOwners(seeded.owner, seeded.queue, blocked, grid);

  return fieldFrom(grid, seeded.owner, floorY);
}

/**
 * Which source covers a point of the plan, as an index, or -1.
 *
 * Rings outward when the point itself is unowned, because plenty of things
 * sit inside a wall: a sensor is mounted on one and a wall's own cells are
 * blocked. Without this a sensor would not be in its own region.
 */
export function sourceAt(field: Field, x: number, z: number): number {
  const cx = Math.floor((x - field.minX) / field.cell);
  const cz = Math.floor((z - field.minZ) / field.cell);

  for (let ring = 0; ring <= SEARCH_CELLS; ring += 1) {
    for (let dx = -ring; dx <= ring; dx += 1) {
      for (let dz = -ring; dz <= ring; dz += 1) {
        // Only the edge of each ring, so the nearest owned cell wins.
        const onEdge =
          ring === 0 || Math.abs(dx) === ring || Math.abs(dz) === ring;
        const ix = cx + dx;
        const iz = cz + dz;
        const inGrid = ix >= 0 && iz >= 0 && ix < field.nx && iz < field.nz;
        if (onEdge && inGrid) {
          const index = field.owner[iz * field.nx + ix];
          if (index >= 0) return index;
        }
      }
    }
  }
  return -1;
}
