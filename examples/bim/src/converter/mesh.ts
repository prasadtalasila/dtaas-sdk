/**
 * Turning one web-ifc mesh into the object shape this package hands back.
 *
 * Split out of `convertIfc` because the callback `StreamAllMeshes` takes has
 * to do three things: read the line for its GlobalId, read every placed
 * geometry, and join them. Kept as its own function that returns `null`
 * instead of a boolean and an out parameter, so the caller only has to ask
 * "did I get an object".
 */
import { type FlatMesh, type IfcAPI } from 'web-ifc';

import { joinPieces, readPiece, type Piece } from 'src/converter/pieces';
import { type ConvertedObject } from 'src/converter/types';

interface Line {
  GlobalId?: { value?: string };
  Name?: { value?: string };
}

function readPieces(api: IfcAPI, model: number, mesh: FlatMesh): Piece[] {
  const pieces: Piece[] = [];
  for (let i = 0; i < mesh.geometries.size(); i += 1) {
    const piece = readPiece(api, model, mesh.geometries.get(i));
    if (piece) pieces.push(piece);
  }
  return pieces;
}

/** Read one mesh, or return `null` for one that cannot be bound or drawn. */
export function toObject(
  api: IfcAPI,
  model: number,
  mesh: FlatMesh,
): ConvertedObject | null {
  const line = api.GetLine(model, mesh.expressID, false) as Line | null;
  const globalId = line?.GlobalId?.value;
  // Without a GlobalId nothing can be bound to it, and binding is the whole
  // purpose.
  if (!globalId) return null;

  const pieces = readPieces(api, model, mesh);
  if (pieces.length === 0) return null;

  const { positions, normals, indices } = joinPieces(pieces);
  return {
    globalId,
    // The mesh carries the express id, not the entity type, so the type is
    // asked for separately and turned into the name a person reads.
    ifcClass:
      api.GetNameFromTypeCode(api.GetLineType(model, mesh.expressID)) ||
      'IfcProduct',
    name: line?.Name?.value,
    positions,
    normals,
    indices,
    colour: pieces[0].colour,
  };
}

export default toObject;
