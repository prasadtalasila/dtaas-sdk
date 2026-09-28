import type { HostServices } from '@into-cps-association/dtaas-sdk';
import type { BimModel } from 'src/react/assets';

/** Stores a browser conversion beside its IFC so the next visit loads it. */
const persistGeometry =
  (host: HostServices, directory: string) =>
  async (model: BimModel, glb: Uint8Array): Promise<void> => {
    try {
      await host.contents.put(`${directory}/${model.name}.glb`, glb, {
        mimeType: 'model/gltf-binary',
      });
    } catch (error) {
      host.logger.warn(
        'bim: could not store converted geometry',
        model.name,
        error,
      );
      throw error;
    }
  };

export default persistGeometry;
