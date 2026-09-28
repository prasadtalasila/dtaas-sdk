import type { HostServices } from '@into-cps-association/dtaas-sdk';
import type { Converted } from 'src/converter';

const converted: Converted = {
  schema: 'IFC4',
  objects: [
    {
      globalId: '0_sgz7bzz4Jh2ckU1ehFe$',
      ifcClass: 'IfcWall',
      name: 'North Wall',
      positions: new Float32Array([0, 0, 0]),
      normals: new Float32Array([0, 1, 0]),
      indices: new Uint32Array([0]),
      colour: [1, 1, 1, 1],
    },
    {
      // No name: the mesh falls back to the GlobalId, as most objects do.
      globalId: '1yETHMphv6LwABqR4Pbs5g',
      ifcClass: 'IfcSlab',
      positions: new Float32Array([0, 0, 0]),
      normals: new Float32Array([0, 1, 0]),
      indices: new Uint32Array([0]),
      colour: [1, 1, 1, 1],
    },
  ],
  failed: 0,
};

const exported = new Uint8Array([1, 2, 3]);

jest.mock('src/converter', () => ({
  convertIfc: jest.fn(),
}));
jest.mock('src/react/exportGlb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// eslint-disable-next-line import/first -- imported after the mocks they use
import { convertIfc } from 'src/converter';
// eslint-disable-next-line import/first -- imported after the mocks it uses
import exportGlb from 'src/react/exportGlb';
// eslint-disable-next-line import/first -- the module under test
import converters from 'src/dtaas/converters';

describe('bim.ifc-to-glb', () => {
  const [spec] = converters;

  it('describes an IFC to GLB converter', () => {
    expect(spec).toMatchObject({
      id: 'bim.ifc-to-glb',
      from: ['.ifc'],
      to: 'glb',
    });
  });

  it('loads a converter function', async () => {
    const module = await spec.load();
    expect(typeof module.default).toBe('function');
  });

  it('converts IFC bytes to GLB bytes, carrying converter metadata', async () => {
    (convertIfc as jest.Mock).mockResolvedValue(converted);
    (exportGlb as jest.Mock).mockResolvedValue(exported);

    const module = await spec.load();
    const output = await module.default(
      { name: 'x.ifc', bytes: new Uint8Array() },
      {} as HostServices,
    );

    expect(output).toEqual({
      format: 'glb',
      bytes: exported,
      metadata: { schema: 'IFC4', objects: 2, failed: 0 },
    });
  });
});
