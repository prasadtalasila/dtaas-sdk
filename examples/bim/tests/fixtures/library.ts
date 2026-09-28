/**
 * Shared fixtures for the BuildingsPage integration tests: the library's base
 * URL, a manifest with one live-bound sensor, and a `fetch` stub that serves
 * IFC and manifest bytes the way a workspace does.
 *
 * The host's `contents` API is always given to `BuildingModels` in these
 * tests, so directory listing never goes through `fetch`; only `files/<path>`
 * requests (an IFC head, or a manifest beside it) need a stub, and this is
 * that stub.
 */

import { TEMPLATE } from 'tests/unit/react/buildingModels.fixtures';

/** `fakeHostServices()`'s default library URL. */
export const LIBRARY_BASE_URL = 'https://dtaas.example/lib';

/** The MQTT topic hospital-a's one binding listens on. */
export const HOSPITAL_A_TOPIC = 'hosp/r204/temp';

/** One live-bound sensor on hospital-a, read by the readings integration test. */
export const HOSPITAL_A_MANIFEST = {
  model: {
    source: 'hospital-a.ifc',
    source_sha256: 'unknown',
    converter: 'test',
  },
  bindings: [
    {
      selector: { globalId: 'r204TempSensor00000001' },
      label: 'Room 204 temperature',
      source: { live: { transport: 'mqtt', topic: HOSPITAL_A_TOPIC } },
      display: { unit: '°C', ramp: [18, 26] },
    },
  ],
};

/**
 * The library's contents: three IFC files across two folders, and the one
 * manifest beside hospital-a. Seeds both `fakeHostServices({ files })`, so
 * `host.contents.list` finds them, and `stubLibraryFetch`, so reading an IFC
 * head or the manifest over `fetch` finds the same bytes.
 */
export const LIBRARY_FILES: Record<string, string> = {
  'common/models/hospital-a.ifc': TEMPLATE,
  'common/models/hospital-a.manifest.json': JSON.stringify(HOSPITAL_A_MANIFEST),
  'common/models/office-b.ifc': TEMPLATE,
  'projects/aarhus/tower.ifc': TEMPLATE,
};

/** Just enough of a `Response` for the page: jsdom in Jest has none. */
function respond(
  body: string,
  { status = 200, type = '' }: { status?: number; type?: string } = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(type ? { 'content-type': type } : {}),
    body: null,
    json: async () => JSON.parse(body),
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  } as unknown as Response;
}

/** A `.json` file is served as JSON; an IFC file needs no content type at all. */
const contentTypeOf = (path: string) =>
  path.endsWith('.json') ? 'application/json' : '';

/**
 * Point `globalThis.fetch` at `files/<path>` under `LIBRARY_BASE_URL`,
 * answering from `files`. Anything else, including the `api/contents/`
 * listing endpoint the page never calls when a host `list` is given, answers
 * HTTP 404.
 */
export function stubLibraryFetch(
  files: Record<string, string> = LIBRARY_FILES,
): void {
  const prefix = `${LIBRARY_BASE_URL}/files/`;
  globalThis.fetch = jest.fn(async (url: RequestInfo | URL) => {
    const address = String(url);
    if (!address.startsWith(prefix)) return respond('', { status: 404 });
    const path = decodeURIComponent(address.slice(prefix.length));
    const body = files[path];
    return body === undefined
      ? respond('', { status: 404 })
      : respond(body, { type: contentTypeOf(path) });
  }) as typeof fetch;
}
