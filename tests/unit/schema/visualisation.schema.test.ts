import {
  parseVisualisationAsset,
  visualisationAssetSchema,
} from 'src/schema/visualisation.schema';
import junction7 from 'tests/fixtures/junction7.visualisation.json';

const clone = () => JSON.parse(JSON.stringify(junction7));

const issuePaths = (value: unknown) => {
  const result = visualisationAssetSchema.safeParse(value);
  return result.success ? [] : result.error.issues.map((i) => i.path);
};

describe('visualisationAssetSchema', () => {
  it('accepts the junction-7 example from the report', () => {
    expect(parseVisualisationAsset(junction7).success).toBe(true);
  });

  it('defaults missing transports, anchors and encodings to empty lists', () => {
    const asset = {
      schemaVersion: '1.0',
      name: 'photo-only',
      layout: { type: 'single', panes: ['photo'] },
      substrates: { photo: { adapter: 'image', source: 'lib://p.jpg' } },
    };
    const result = parseVisualisationAsset(asset);
    expect(result.success && result.data.encodings).toEqual([]);
  });

  it('rejects schema version 2.0', () => {
    expect(issuePaths({ ...clone(), schemaVersion: '2.0' })).toEqual([
      ['schemaVersion'],
    ]);
  });

  it('rejects a layout pane without a substrate', () => {
    const asset = clone();
    asset.layout.panes.push('missing');
    expect(issuePaths(asset)).toEqual([['layout', 'panes', 3]]);
  });

  it('rejects an encoding on an unknown substrate', () => {
    const asset = clone();
    asset.encodings[1].substrate = 'nowhere';
    expect(issuePaths(asset)).toEqual([['encodings', 1, 'substrate']]);
  });

  it('rejects an anchor whose homography does not exist', () => {
    const asset = clone();
    asset.anchors[0].homographyId = 'h9';
    expect(issuePaths(asset)).toEqual([['anchors', 0, 'homographyId']]);
  });

  it('accepts a binding that names a preset instead of an encoding', () => {
    const asset = clone();
    asset.encodings[0] = {
      target: 'junction7/armA/queueLen',
      substrate: 'photo',
      preset: 'traffic.queue',
    };
    expect(issuePaths(asset)).toEqual([]);
  });

  it.each([
    ['neither', { target: 't', substrate: 'photo' }],
    [
      'both',
      {
        target: 't',
        substrate: 'photo',
        preset: 'p',
        encoding: { type: 'label' },
      },
    ],
  ])('rejects a binding with %s encoding and preset', (_, binding) => {
    const asset = clone();
    asset.encodings = [binding];
    expect(issuePaths(asset)).toEqual([['encodings', 0]]);
  });
});
