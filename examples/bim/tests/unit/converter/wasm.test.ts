/**
 * Direct tests for where the WebAssembly parser comes from: the Node/browser
 * detection, and that the carried copy is blobbed once and reused after.
 *
 * `convertIfc.test.ts` runs under Node, where `browserCarriesTheParser` is
 * always false, so nothing there ever reaches `carriedWasmUrl`.
 */

import { browserCarriesTheParser, carriedWasmUrl } from 'src/converter/wasm';

describe('browserCarriesTheParser', () => {
  const originalProcess = globalThis.process;
  const originalCreateObjectURL = URL.createObjectURL;

  afterEach(() => {
    (globalThis as { process?: unknown }).process = originalProcess;
    URL.createObjectURL = originalCreateObjectURL;
  });

  test('is false wherever a Node process global is present', () => {
    expect(browserCarriesTheParser()).toBe(false);
  });

  test('is true in a browser-shaped environment, with no process global', () => {
    // jsdom does not implement createObjectURL itself.
    URL.createObjectURL = jest.fn() as typeof URL.createObjectURL;
    delete (globalThis as { process?: unknown }).process;

    expect(browserCarriesTheParser()).toBe(true);
  });
});

test('carriedWasmUrl blobs the carried copy once and reuses it after', () => {
  const original = URL.createObjectURL;
  const createObjectURL = jest.fn(() => 'blob:fake-wasm');
  URL.createObjectURL = createObjectURL as typeof URL.createObjectURL;

  try {
    expect(carriedWasmUrl()).toBe('blob:fake-wasm');
    expect(carriedWasmUrl()).toBe('blob:fake-wasm');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  } finally {
    URL.createObjectURL = original;
  }
});
