/**
 * Where the WebAssembly parser comes from.
 *
 * `browserCarriesTheParser` decides whether the copy inlined into this
 * package should be used. In a browser it must be: nothing else serves the
 * file, and fetching it from another origin is what an air-gapped install
 * cannot do. Under Node it must not be. The loader web-ifc uses there opens
 * what it is given as a path on disk, so a blob URL fails, and the file is
 * already beside the module anyway. That is the case the tests run in.
 */
import { WEB_IFC_WASM_BASE64 } from 'src/converter/generated/wasm';

export function browserCarriesTheParser(): boolean {
  return (
    typeof Blob === 'function' &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function' &&
    // `process` is how a Node runtime announces itself, and it is read
    // through globalThis so this file needs no Node type definitions.
    (globalThis as { process?: unknown }).process === undefined
  );
}

/**
 * The parser carried in this package, as a URL a loader can fetch.
 *
 * Made once and kept, because a blob URL is a resource the page holds until
 * it is revoked and converting three models should not make three of them.
 */
let carried: string | undefined;

export function carriedWasmUrl(): string {
  if (carried) return carried;
  const binary = atob(WEB_IFC_WASM_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  carried = URL.createObjectURL(
    new Blob([bytes], { type: 'application/wasm' }),
  );
  return carried;
}
