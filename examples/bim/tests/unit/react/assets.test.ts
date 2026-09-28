/**
 * Tests for finding the building models a user has.
 *
 * The `readIfcName` cases are copied from the real models in the shared
 * library: a name on the project and a misspelt one on the building, an
 * escaped Danish letter, and a server that ignores the byte range it was
 * asked for.
 */

import { IFC_HEAD_BYTES } from 'src/core';
import {
  contentsUrl,
  formatSize,
  pairModels,
  readableName,
  readIfcName,
  uniqueNames,
  type BimModel,
  type LibraryEntry,
} from 'src/react/assets';

/** Building_1911_AK_v2.ifc, as written. */
const PAEDAGOGISK = `DATA;
#1= IFCPROJECT('15LR9Aj8fA4eCrdnAwudiM',#18,'34372',$,$,'P\\X\\E6dagogisk Center','Udbudsprojekt',(#22),#306726);
#2= IFCBUILDING('15LR9Aj8fA4eCrdnAwudiN',#18,'P\\X\\E6dagosik Center',$,$,#30,$,'P\\X\\E6dagosik Center',.ELEMENT.,$,$,#31);`;

test('a name two files give is left out for both', () => {
  // Both substation models are "SWiM district cooling substation", and their
  // file names are what tells them apart.
  const titles = uniqueNames(
    new Map([
      ['substation_ok.ifc', 'SWiM district cooling substation'],
      ['substation_faults.ifc', 'SWiM district cooling substation'],
      ['Building_1911_AK_v2.ifc', 'Pædagogisk Center'],
      ['Building_1912_AK_v4.ifc', null],
    ]),
  );
  expect([...titles]).toEqual([
    ['Building_1911_AK_v2.ifc', 'Pædagogisk Center'],
  ]);
});

/** Two IFC files as the contents API lists them. */
const ENTRIES: LibraryEntry[] = [
  {
    name: 'Building_1911_AK_v2.ifc',
    path: 'common/models/Building_1911_AK_v2.ifc',
    size: 10,
  },
  {
    name: 'Building_1912_AK_v4.ifc',
    path: 'common/models/Building_1912_AK_v4.ifc',
    size: 20,
  },
];

test('a model is shown by the name its file gives, or by its file name', () => {
  const models: BimModel[] = pairModels(
    ENTRIES,
    new Map([['Building_1911_AK_v2.ifc', 'Pædagogisk Center']]),
  );
  expect(models.map((model) => model.title)).toEqual([
    'Building 1912 AK v4',
    'Pædagogisk Center',
  ]);
  // The list is in the order of what it shows, and each entry still carries
  // its file name, because the geometry beside a model is found by it and a
  // name must not be able to break that.
  expect(models.map((model) => model.name)).toEqual([
    'Building_1912_AK_v4',
    'Building_1911_AK_v2',
  ]);
});

test('each model is paired with the geometry, tree and manifest beside it', () => {
  const [model] = pairModels([
    { name: 'a.ifc', path: 'm/a.ifc', size: 1 },
    { name: 'a.glb', path: 'm/a.glb' },
    { name: 'a.json', path: 'm/a.json' },
    { name: 'a.manifest.json', path: 'm/a.manifest.json' },
  ]);
  expect(model.geometryPath).toBe('m/a.glb');
  expect(model.treePath).toBe('m/a.json');
  // Ending in .json as well, and not taken for the tree.
  expect(model.manifestPath).toBe('m/a.manifest.json');
});

test('the listing and file addresses are built under the library', () => {
  expect(contentsUrl('http://host/jane', 'common/models')).toBe(
    'http://host/jane/api/contents/common/models',
  );
  expect(contentsUrl('http://host/jane/', 'common/models')).toBe(
    'http://host/jane/api/contents/common/models',
  );
});

test('a path with spaces and brackets is percent-encoded segment by segment', () => {
  expect(contentsUrl('https://h/jane', 'a b/[x].ifc')).toBe(
    'https://h/jane/api/contents/a%20b/%5Bx%5D.ifc',
  );
});

test('a size reads in the unit a person expects', () => {
  expect(formatSize(undefined)).toBe('');
  expect(formatSize(11 * 1024)).toBe('11 KB');
  expect(formatSize(2048)).toBe('2 KB');
  expect(formatSize(24.2 * 1024 * 1024)).toBe('24.2 MB');
  expect(formatSize(3 * 1024 * 1024)).toBe('3.0 MB');
});

test('a file name reads with spaces for its separators and keeps its case', () => {
  expect(readableName('Building_1912_AK_v4')).toBe('Building 1912 AK v4');
  expect(readableName('L187x_AK__v_done')).toBe('L187x AK v done');
});

/** Swap `globalThis.fetch` for a stand-in, then restore it. */
async function withFetch<T>(
  handler: typeof fetch,
  run: () => Promise<T>,
): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

/** A response whose body arrives in the chunks given. */
function streamed(chunks: string[], status = 206) {
  let cancelled = false;
  let index = 0;
  const encoder = new TextEncoder();
  return {
    ok: status >= 200 && status < 300,
    status,
    get cancelled() {
      return cancelled;
    },
    body: {
      getReader: () => ({
        read: async () => {
          if (index >= chunks.length) return { done: true, value: undefined };
          const value = encoder.encode(chunks[index]);
          index += 1;
          return { done: false, value };
        },
        cancel: async () => {
          cancelled = true;
        },
      }),
    },
  } as unknown as Response & { cancelled: boolean };
}

test('only the start of the file is asked for', async () => {
  let asked: { url: RequestInfo | URL; init?: RequestInit } | undefined;
  await withFetch(
    async (url: RequestInfo | URL, init?: RequestInit) => {
      asked = { url, init };
      return streamed([PAEDAGOGISK]);
    },
    () =>
      readIfcName('http://host/jane/', 'common/models/Building_1911_AK_v2.ifc'),
  );
  expect(asked?.url).toBe(
    'http://host/jane/files/common/models/Building_1911_AK_v2.ifc',
  );
  expect((asked?.init?.headers as Record<string, string>).Range).toBe(
    `bytes=0-${IFC_HEAD_BYTES - 1}`,
  );
  expect(asked?.init?.credentials).toBe('include');
});

test('the name is read from the start of the file', async () => {
  const name = await withFetch(
    async () => streamed([PAEDAGOGISK]),
    () =>
      readIfcName('http://host/jane/', 'common/models/Building_1911_AK_v2.ifc'),
  );
  expect(name).toBe('Pædagogisk Center');
});

test('a server that sends the whole file is read only as far as the limit', async () => {
  // A server that ignores the range answers 200 with everything. The name is
  // in the first chunk, and the rest of a 64 MB model must not be downloaded.
  const filler = 'x'.repeat(40 * 1024);
  const response = streamed([PAEDAGOGISK, filler, filler, filler, filler], 200);
  const name = await withFetch(
    async () => response,
    () => readIfcName('http://host/jane/', 'common/models/a.ifc'),
  );
  expect(name).toBe('Pædagogisk Center');
  expect(response.cancelled).toBe(true);
});

test('a response with no stream is read from its buffer, to the limit', async () => {
  // Not every fetch gives a readable body. Without one the bytes come from
  // the buffer, cut at the same limit.
  const bytes = new TextEncoder().encode(PAEDAGOGISK + 'x'.repeat(100 * 1024));
  const name = await withFetch(
    async () =>
      ({
        ok: true,
        status: 200,
        body: null,
        arrayBuffer: async () => bytes.buffer,
      }) as unknown as Response,
    () => readIfcName('http://host/jane/', 'common/models/a.ifc'),
  );
  expect(name).toBe('Pædagogisk Center');
});

test('a name that cannot be read is null, and never a failure', async () => {
  const cases: Array<typeof fetch> = [
    async () => ({ ok: false, status: 404 }) as Response,
    async () => {
      throw new TypeError('network down');
    },
  ];
  await Promise.all(
    cases.map(async (handler) => {
      const name = await withFetch(handler, () =>
        readIfcName('http://host/jane/', 'x.ifc'),
      );
      expect(name).toBeNull();
    }),
  );
});
