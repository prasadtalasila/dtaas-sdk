/**
 * Integration test for the manifest-to-visualisation migration: a real
 * manifest fixture, turned into an asset the SDK schema accepts, saved and
 * loaded back through a host exactly as the client would.
 */

import { fakeHostServices } from '@into-cps-association/dtaas-sdk/testing';
import { parseVisualisationAsset } from '@into-cps-association/dtaas-sdk/schema';
import type { DigitalTwinSummary } from '@into-cps-association/dtaas-sdk';
import { manifestToVisualisation, readManifest } from 'src/schema';
import fixture from 'tests/fixtures/substation.manifest.json';

const dt: DigitalTwinSummary = {
  name: 'substation',
  path: 'digital_twins/substation',
  files: ['substation.ifc'],
};

test('a manifest migrates to an asset the host can save and load back unchanged', async () => {
  const read = readManifest(fixture);
  if (!read.ok) throw new Error(JSON.stringify(read.problems));

  const { asset } = manifestToVisualisation(read.manifest, {
    name: 'substation',
    brokerUrl: 'wss://broker.example/ws',
  });
  expect(parseVisualisationAsset(asset).success).toBe(true);

  const host = fakeHostServices();
  await host.viz.save(dt, asset);

  await expect(host.viz.load(dt)).resolves.toEqual(asset);
});
