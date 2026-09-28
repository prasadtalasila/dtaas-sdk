import { parseVisualisationAsset } from '@into-cps-association/dtaas-sdk/schema';
import { manifestToVisualisation, readManifest } from 'src/schema';
import fixture from 'tests/fixtures/substation.manifest.json';

const manifest = () => {
  const result = readManifest(fixture);
  if (!result.ok) throw new Error(JSON.stringify(result.problems));
  return result.manifest;
};
const options = { name: 'substation', brokerUrl: 'wss://broker.example/ws' };

describe('manifestToVisualisation', () => {
  it('produces an asset the SDK schema accepts', () => {
    const { asset } = manifestToVisualisation(manifest(), options);
    expect(parseVisualisationAsset(asset).success).toBe(true);
    expect(asset.substrates.building).toEqual({
      adapter: 'aec',
      source: 'substation.glb',
    });
    expect(asset.layout).toEqual({ type: 'single', panes: ['building'] });
  });

  it('anchors every GlobalId binding with a live topic', () => {
    const { asset } = manifestToVisualisation(manifest(), options);
    expect(asset.anchors).toEqual([
      expect.objectContaining({
        signalPath: 'swim/hx1/supply',
        kind: 'ifc-guid',
        ref: '0_sgz7bzz4Jh2ckU1ehFe$',
      }),
      expect.objectContaining({
        signalPath: 'swim/hx1/supply',
        kind: 'ifc-guid',
        ref: '1yETHMphv6LwABqR4Pbs5g',
      }),
    ]);
  });

  it('declares one mqtt transport with each topic once', () => {
    const { asset } = manifestToVisualisation(manifest(), options);
    expect(asset.transports).toEqual([
      {
        adapter: 'mqtt',
        url: 'wss://broker.example/ws',
        topics: ['swim/hx1/supply'],
        channel: 'measured',
      },
    ]);
  });

  it('writes one colour-scale encoding per topic from the ramp', () => {
    const { asset } = manifestToVisualisation(manifest(), options);
    expect(asset.encodings).toEqual([
      {
        target: 'swim/hx1/supply',
        substrate: 'building',
        encoding: {
          type: 'colorScale',
          domain: [4, 16],
          scheme: 'bim.cold-warm',
          channel: 'measured',
          clamp: true,
        },
      },
    ]);
  });

  it('returns the bindings it could not migrate, with reasons', () => {
    const { skipped } = manifestToVisualisation(manifest(), options);
    expect(skipped.map((s) => s.reason)).toEqual([
      'no GlobalId: ifc-guid anchors need one',
      'no live topic: history-only bindings have nothing to anchor',
    ]);
  });

  it('declares no transport when nothing is live', () => {
    const m = { ...manifest(), bindings: [] };
    expect(manifestToVisualisation(m, options).asset.transports).toEqual([]);
  });
});
