import { fakeHostServices } from '@into-cps-association/dtaas-sdk/testing';
import type { BimModel } from 'src/react/assets';
import persistGeometry from 'src/dtaas/persistGeometry';

const model: BimModel = {
  name: 'Hospital',
  title: 'Hospital',
  ifcPath: 'projects/aarhus/Hospital.ifc',
};

describe('persistGeometry', () => {
  it('stores the glb beside the ifc, with the gltf-binary mime type', async () => {
    const host = fakeHostServices();
    const put = jest.spyOn(host.contents, 'put');
    const glb = new Uint8Array([1, 2, 3]);

    await persistGeometry(host, 'projects/aarhus')(model, glb);

    expect(put).toHaveBeenCalledWith('projects/aarhus/Hospital.glb', glb, {
      mimeType: 'model/gltf-binary',
    });
  });

  it('logs a warning through the host logger and rethrows on rejection', async () => {
    const host = fakeHostServices();
    const error = new Error('nope');
    jest.spyOn(host.contents, 'put').mockRejectedValue(error);

    await expect(
      persistGeometry(host, 'projects/aarhus')(model, new Uint8Array()),
    ).rejects.toThrow(error);

    expect(host.recorded.logs).toContainEqual({
      level: 'warn',
      args: ['bim: could not store converted geometry', 'Hospital', error],
    });
  });
});
