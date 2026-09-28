/** The identity and the triangles of one object. */
export interface ConvertedObject {
  /** The IFC GlobalId, which survives a re-export and a mesh name does not. */
  globalId: string;
  /** The entity type, for example `IfcWall`. */
  ifcClass: string;
  name?: string;
  /** World space vertices, metres, Y up, three numbers per vertex. */
  positions: Float32Array;
  /** World space normals, three per vertex, matching `positions`. */
  normals: Float32Array;
  indices: Uint32Array;
  /** The colour the model itself declares, linear RGBA. */
  colour: [number, number, number, number];
}

export interface Converted {
  /** The schema the file declares, for example `IFC4`. */
  schema: string;
  objects: ConvertedObject[];
  /**
   * Objects the kernel could not triangulate.
   *
   * Reported instead of hidden. Some shapes defeat any kernel, and a viewer
   * that silently draws less than the file holds gives no way to tell.
   */
  failed: number;
}

export interface ConvertOptions {
  /**
   * Where the WebAssembly module is fetched from, as a directory ending in a
   * slash.
   *
   * Left unset, the copy carried inside this package is used, which is what
   * makes a consumer need nothing but `npm install`. Set it only to serve the
   * file from somewhere else on purpose.
   */
  wasmPath?: string;
  /** Called with how many objects are done, so a caller can show progress. */
  onProgress?: (done: number) => void;
}
