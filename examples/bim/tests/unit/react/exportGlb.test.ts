/** @jest-environment node */
/**
 * Tests for serialising a model to glTF.
 *
 * three's `GLTFExporter` reads the bytes back out of a `Blob` through
 * `FileReader`, which the DOM defines and Node does not. The polyfill below
 * is only as much of it as the exporter calls: `readAsArrayBuffer`, driven by
 * `Blob.arrayBuffer()`, which Node does have.
 */

import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import exportGlb from 'src/react/exportGlb';

class NodeFileReader {
  result: ArrayBuffer | null = null;

  onloadend: (() => void) | null = null;

  readAsArrayBuffer(blob: Blob): void {
    blob
      .arrayBuffer()
      .then((buffer) => {
        this.result = buffer;
        this.onloadend?.();
      })
      .catch(() => {
        this.onloadend?.();
      });
  }
}

(globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReader;

const GLTF_MAGIC = [0x67, 0x6c, 0x54, 0x46];

test('a model exports to bytes starting with the glTF binary magic', async () => {
  const model = new Group();
  model.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial()));

  const bytes = await exportGlb(model);

  expect(Array.from(bytes.slice(0, 4))).toEqual(GLTF_MAGIC);
});
