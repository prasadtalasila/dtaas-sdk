/**
 * Reading one placed geometry into flat arrays, and joining several into one.
 *
 * An IFC object may be several placed geometries, a wall and its cladding for
 * instance. web-ifc hands each one back in its own local space plus the
 * placement that puts it in the building; this file applies that placement
 * and joins the pieces into the one mesh a person can click.
 */
import { type IfcAPI, type IfcGeometry, type PlacedGeometry } from 'web-ifc';

export interface Piece {
  positions: number[];
  normals: number[];
  indices: number[];
  colour: [number, number, number, number];
}

/**
 * Apply the sRGB transfer function to one channel.
 *
 * A colour picked by an architect, and the one web-ifc reads out of
 * `IfcSurfaceStyleRendering`, is an sRGB value. A renderer adds light in
 * linear values, and glTF requires a base colour to be linear for that
 * reason. Handing raw sRGB numbers to a renderer instead makes every surface
 * too light: the greys of a real model came out at #c0c0c0 where the GLB of
 * the same file gives #868686.
 *
 * The exact curve instead of the `value ** 2.2` approximation, because the
 * approximation is wrong in the dark end.
 */
function toLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Multiply a vertex by web-ifc's flat 4x4 placement, column major. */
function place(
  m: ArrayLike<number>,
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

/** Rotate a direction. A normal is a direction, so it takes no translation. */
function turn(
  m: ArrayLike<number>,
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  return [
    m[0] * x + m[4] * y + m[8] * z,
    m[1] * x + m[5] * y + m[9] * z,
    m[2] * x + m[6] * y + m[10] * z,
  ];
}

/**
 * Place and rotate an interleaved position/normal buffer into world space.
 *
 * web-ifc's flat transformation already places the object in a Y-up world,
 * the same one the Python converter writes into its GLB. Rotating it again
 * for the Z-up to Y-up change laid the whole building on its side: the
 * bounding boxes of the two converters now agree to the centimetre.
 */
function placedVertices(
  vertices: Float32Array,
  matrix: ArrayLike<number>,
): { positions: number[]; normals: number[] } {
  // web-ifc interleaves position and normal, six numbers per vertex.
  const positions: number[] = [];
  const normals: number[] = [];
  for (let i = 0; i < vertices.length; i += 6) {
    const p = place(matrix, vertices[i], vertices[i + 1], vertices[i + 2]);
    const n = turn(matrix, vertices[i + 3], vertices[i + 4], vertices[i + 5]);
    positions.push(p[0], p[1], p[2]);
    normals.push(n[0], n[1], n[2]);
  }
  return { positions, normals };
}

function geometryArrays(
  api: IfcAPI,
  geometry: IfcGeometry,
): { vertices: Float32Array; indices: Uint32Array } {
  return {
    vertices: api.GetVertexArray(
      geometry.GetVertexData(),
      geometry.GetVertexDataSize(),
    ),
    indices: api.GetIndexArray(
      geometry.GetIndexData(),
      geometry.GetIndexDataSize(),
    ),
  };
}

/** Alpha is a coverage fraction and not a colour, so it stays as it is. */
function colourOf(placed: PlacedGeometry): [number, number, number, number] {
  const { x, y, z, w } = placed.color;
  return [toLinear(x), toLinear(y), toLinear(z), w];
}

/** Read one placed geometry into flat arrays, already in world space and Y up. */
export function readPiece(
  api: IfcAPI,
  model: number,
  placed: PlacedGeometry,
): Piece | null {
  const geometry = api.GetGeometry(model, placed.geometryExpressID);
  try {
    const { vertices, indices } = geometryArrays(api, geometry);
    if (vertices.length === 0 || indices.length === 0) return null;

    const { positions, normals } = placedVertices(
      vertices,
      placed.flatTransformation,
    );
    return {
      positions,
      normals,
      indices: Array.from(indices),
      colour: colourOf(placed),
    };
  } finally {
    geometry.delete();
  }
}

/**
 * Join several placed geometries into one mesh, offsetting each piece's
 * indices past the vertices already pushed.
 */
export function joinPieces(pieces: Piece[]): {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
} {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (const piece of pieces) {
    const offset = positions.length / 3;
    positions.push(...piece.positions);
    normals.push(...piece.normals);
    for (const index of piece.indices) indices.push(index + offset);
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
  };
}
