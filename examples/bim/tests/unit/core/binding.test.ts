import {
  objectOf,
  topicOf,
  displayOf,
  idOf,
  GLOBAL_ID_PATTERN,
  type Binding,
} from 'src/core';

/** A binding as `ifc_explorer.manifest` writes it. */
const FULL: Binding = {
  selector: { globalId: '0_sgz7bzz4Jh2ckU1ehFe$' },
  label: 'HX-1 temperature TS-01',
  source: {
    live: {
      transport: 'mqtt',
      topic: 'swim/DemoBuilding/B1/temperature/TS-01',
    },
    history: { bucket: 'swim', measurement: 'temperature' },
  },
  display: { unit: '°C', ramp: [4, 16] },
  id: 'TS-01',
};

test('reads the object, the topic and the display from where the file puts them', () => {
  expect(objectOf(FULL)).toBe('0_sgz7bzz4Jh2ckU1ehFe$');
  expect(topicOf(FULL)).toBe('swim/DemoBuilding/B1/temperature/TS-01');
  expect(displayOf(FULL)).toEqual({ unit: '°C', ramp: [4, 16] });
  expect(idOf(FULL)).toBe('TS-01');
});

test('a binding with only history has no topic, instead of throwing', () => {
  // Legal: it exists for the panel behind a click and never reaches a marker.
  const historyOnly = { ...FULL, source: { history: FULL.source.history } };
  expect(topicOf(historyOnly)).toBeUndefined();
});

test('a selector that is not a GlobalId gives no object', () => {
  expect(
    objectOf({ ...FULL, selector: { nodeName: 'Wall-12' } }),
  ).toBeUndefined();
});

test('the label stands in when a manifest carries no id of ours', () => {
  // `id` is this project's addition, so a manifest from elsewhere lacks it.
  const { id: _dropped, ...theirs } = FULL;
  expect(idOf(theirs)).toBe('HX-1 temperature TS-01');
});

test('display is an object even when the binding has none', () => {
  // So a caller can read `.unit` without guarding first.
  expect(displayOf({ ...FULL, display: undefined as never })).toEqual({});
});

describe('GLOBAL_ID_PATTERN', () => {
  it('matches 22 characters of the base64 variant IFC uses', () => {
    expect(GLOBAL_ID_PATTERN.test('0_sgz7bzz4Jh2ckU1ehFe$')).toBe(true);
  });

  it('rejects 21 characters and a hyphen', () => {
    expect(GLOBAL_ID_PATTERN.test('0_sgz7bzz4Jh2ckU1ehFe')).toBe(false);
    expect(GLOBAL_ID_PATTERN.test('0_sgz7bzz4Jh2ckU1ehF-e')).toBe(false);
  });
});
