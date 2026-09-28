/**
 * Turning an IFC file into geometry a browser can draw.
 *
 * Why this runs in the browser
 * ----------------------------
 * IFC is a text exchange format holding parametric solids: a wall is a
 * profile swept along a path with holes subtracted, not a list of triangles.
 * Producing the triangles needs a geometry kernel. The one used here is
 * [web-ifc](https://github.com/ThatOpen/engine_web-ifc), compiled to
 * WebAssembly, so the conversion happens on the machine that is looking at
 * the model and the platform needs no converter service.
 *
 * What comes out
 * --------------
 * Plain typed arrays, in metres, Y up. Nothing here imports three.js or any
 * other renderer: the caller decides what to build from the numbers. That is
 * what lets this be tested in Node, where there is no canvas.
 *
 * What it does not do
 * -------------------
 * It does not write a GLB. Storing the result is the caller's decision and a
 * different problem: the caller knows where its files live.
 */
import { IfcAPI } from 'web-ifc';

import { toObject } from 'src/converter/mesh';
import {
  type Converted,
  type ConvertOptions,
} from 'src/converter/converter.types';
import { browserCarriesTheParser, carriedWasmUrl } from 'src/converter/wasm';

async function openApi(options: ConvertOptions): Promise<IfcAPI> {
  const api = new IfcAPI();
  if (options.wasmPath) api.SetWasmPath(options.wasmPath, true);
  // Otherwise the parser comes from inside this package where that is
  // possible, so nothing is fetched from another origin and an air-gapped
  // install works unchanged.
  const carry = !options.wasmPath && browserCarriesTheParser();
  await (carry ? api.Init(() => carriedWasmUrl()) : api.Init());
  return api;
}

/**
 * Convert an IFC file.
 *
 * The bytes are read once and never held twice: the model is closed before
 * returning, so a browser tab that converts a sixty megabyte file does not
 * keep the parser's copy of it afterwards.
 */
export async function convertIfc(
  bytes: Uint8Array,
  options: ConvertOptions = {},
): Promise<Converted> {
  const api = await openApi(options);
  const model = api.OpenModel(bytes);
  const converted: Converted = { schema: '', objects: [], failed: 0 };

  try {
    api.StreamAllMeshes(model, (mesh) => {
      const object = toObject(api, model, mesh);
      if (!object) {
        converted.failed += 1;
        return;
      }
      converted.objects.push(object);
      options.onProgress?.(converted.objects.length);
    });
    converted.schema = api.GetModelSchema(model);
    return converted;
  } finally {
    api.CloseModel(model);
  }
}

export default convertIfc;
