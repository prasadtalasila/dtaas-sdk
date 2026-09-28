import { parseVisualisationAsset } from '@into-cps-association/dtaas-sdk/schema';
import {
  manifestToVisualisation,
  readManifest,
  type Manifest,
} from 'src/schema';
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

  it('the substrate loads the raw source when no converted geometry exists', () => {
    const m: Manifest = {
      model: { source: 'raw.ifc', source_sha256: 'unknown', converter: 'test' },
      bindings: [],
    };
    const { asset } = manifestToVisualisation(m, options);
    expect(asset.substrates.building.source).toBe('raw.ifc');
  });

  it('falls back to a default colour domain when a binding declares no ramp', () => {
    const m: Manifest = {
      model: manifest().model,
      bindings: [
        {
          selector: { globalId: '0'.repeat(22) },
          label: 'No ramp',
          source: { live: { transport: 'mqtt', topic: 't/no-ramp' } },
          // A valid manifest always declares a ramp; this stands in for one
          // that reached here despite that, so the fallback still has a test.
          display: {
            unit: '°C',
          } as unknown as Manifest['bindings'][number]['display'],
        },
      ],
    };
    const { asset } = manifestToVisualisation(m, options);
    expect(asset.encodings[0].encoding).toMatchObject({ domain: [0, 1] });
  });
});
