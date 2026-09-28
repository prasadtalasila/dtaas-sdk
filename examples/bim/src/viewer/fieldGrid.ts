/**
 * The rasterised grid `buildField` floods: its shape, what blocks it, and
 * how ownership spreads outward from each source.
 *
 * Split out of `field.ts` to keep that file within the project's line
 * limit: none of this is part of the public shape, only how it is built.
 * Takes its constants as parameters instead of importing them from
 * `field.ts`, so the two files import in one direction only.
 */

import { Box3, type Vector3, type Mesh } from 'three';

/** How many cells around a sensor are seeded, since a sensor sits on a wall and its own cell is usually inside it. */
const SEED_CELLS = 2;

/** The grid's shape, and how a world point maps into it. */
export interface Grid {
  nx: number;
  nz: number;
  cell: number;
  minX: number;
  minZ: number;
  at: (x: number, z: number) => readonly [number, number];
}

/** The grid's extent, sized to the model's own bounds. Null when there is nothing to bound. */
export function gridOf(meshes: Mesh[], cell: number): Grid | null {
  const bounds = new Box3();
  for (const mesh of meshes) bounds.expandByObject(mesh);
  if (!Number.isFinite(bounds.min.x)) return null;

  const minX = bounds.min.x;
  const minZ = bounds.min.z;
  const nx = Math.max(1, Math.ceil((bounds.max.x - minX) / cell));
  const nz = Math.max(1, Math.ceil((bounds.max.z - minZ) / cell));
  const at = (x: number, z: number) =>
    [Math.floor((x - minX) / cell), Math.floor((z - minZ) / cell)] as const;
  return {
    nx,
    nz,
    cell,
    minX,
    minZ,
    at,
  };
}

/** Mark every cell a box covers with `value`, clipped to the grid. */
function paint(
  box: Box3,
  blocked: Uint8Array,
  grid: Grid,
  value: number,
): void {
  const [ax, az] = grid.at(box.min.x, box.min.z);
  const [bx, bz] = grid.at(box.max.x, box.max.z);
  for (let ix = ax; ix <= bx; ix += 1) {
    for (let iz = az; iz <= bz; iz += 1) {
      if (ix >= 0 && iz >= 0 && ix < grid.nx && iz < grid.nz)
        blocked[iz * grid.nx + ix] = value;
    }
  }
}

/** Walls first and doors after, so a doorway is a hole in the wall it is cut into and not the other way round. */
export function paintBlocks(
  meshes: Mesh[],
  blocked: Uint8Array,
  grid: Grid,
  cut: number,
  blocks: Set<string>,
  opens: Set<string>,
): void {
  const box = new Box3();
  for (const mesh of meshes) {
    if (blocks.has(mesh.userData.ifcClass as string)) {
      box.setFromObject(mesh);
      if (box.min.y < cut && box.max.y > cut) paint(box, blocked, grid, 1);
    }
  }
  for (const mesh of meshes) {
    if (opens.has(mesh.userData.ifcClass as string)) {
      box.setFromObject(mesh);
      paint(box, blocked, grid, 0);
    }
  }
}

/** Seed one source's own cells into `owner`. */
function seedSource(
  source: Vector3,
  index: number,
  blocked: Uint8Array,
  owner: Int16Array,
  queue: number[],
  grid: Grid,
): void {
  const { nx, nz } = grid;
  const [cx, cz] = grid.at(source.x, source.z);
  for (let dx = -SEED_CELLS; dx <= SEED_CELLS; dx += 1) {
    for (let dz = -SEED_CELLS; dz <= SEED_CELLS; dz += 1) {
      const ix = cx + dx;
      const iz = cz + dz;
      if (ix >= 0 && iz >= 0 && ix < nx && iz < nz) {
        const i = iz * nx + ix;
        if (!blocked[i] && owner[i] === -1) {
          owner[i] = index;
          queue.push(i);
        }
      }
    }
  }
}

/**
 * Seed each source's own cells, so each cell later ends up owned by
 * whichever walk reaches it first.
 */
export function seedOwners(
  sources: Vector3[],
  blocked: Uint8Array,
  grid: Grid,
): { owner: Int16Array; queue: number[] } | null {
  const owner = new Int16Array(grid.nx * grid.nz).fill(-1);
  const queue: number[] = [];
  sources.forEach((source, index) =>
    seedSource(source, index, blocked, owner, queue, grid),
  );
  return queue.length === 0 ? null : { owner, queue };
}

/** The four cells that share an edge with one cell. */
const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Give cell `i`'s owner to every unowned neighbour it reaches. */
function expandFrom(
  i: number,
  ix: number,
  iz: number,
  owner: Int16Array,
  queue: number[],
  blocked: Uint8Array,
  grid: Grid,
): void {
  const { nx, nz } = grid;
  for (const [dx, dz] of NEIGHBOURS) {
    const jx = ix + dx;
    const jz = iz + dz;
    if (jx >= 0 && jz >= 0 && jx < nx && jz < nz) {
      const j = jz * nx + jx;
      if (!blocked[j] && owner[j] === -1) {
        owner[j] = owner[i];
        queue.push(j);
      }
    }
  }
}

/** Widen the seeded queue one ring at a time until every reachable cell is owned. */
export function floodOwners(
  owner: Int16Array,
  queue: number[],
  blocked: Uint8Array,
  grid: Grid,
): void {
  for (let head = 0; head < queue.length; head += 1) {
    const i = queue[head];
    const ix = i % grid.nx;
    const iz = Math.floor(i / grid.nx);
    expandFrom(i, ix, iz, owner, queue, blocked, grid);
  }
}

/** Assemble the finished field from the grid and the flooded owners. */
export function fieldFrom(grid: Grid, owner: Int16Array, floorY: number) {
  const { nx, nz, cell, minX, minZ } = grid;
  return {
    owner,
    nx,
    nz,
    cell,
    minX,
    minZ,
    floorY,
  };
}
