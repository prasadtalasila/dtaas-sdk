import {
  zoneOf,
  zonesOf,
  availableScopes,
  DEFAULT_STALE_AFTER_S,
  type Binding,
  type HeatScope,
} from 'src/core';
import { binding, NOW, seconds } from 'tests/fixtures/readings';

describe('the scopes worth offering', () => {
  const where: Record<string, { room: string; storey: string }> = {
    a: { room: 'R1', storey: 'L1' },
    b: { room: 'R2', storey: 'L2' },
    c: { room: 'R1', storey: 'L1' },
  };
  const at = (id: string, scope: HeatScope) => {
    if (scope === 'room') return where[id]?.room;
    if (scope === 'storey') return where[id]?.storey;
    if (scope === 'sensor') return where[id] === undefined ? undefined : id;
    return undefined;
  };
  const bind = (id: string) => binding(id, [0, 1], 'C');

  test('offers a scope that puts the sensors in more than one group', () => {
    // Per Sensor divides whenever there is more than one, since every sensor
    // is its own group.
    expect(availableScopes([bind('a'), bind('b')], at)).toEqual([
      'off',
      'sensor',
      'room',
      'storey',
      'building',
    ]);
  });

  test('skips a scope that puts every sensor in the same group', () => {
    // The case this got wrong: a model declaring ten storeys with all ten of
    // its sensors on one of them can be grouped by storey and gains nothing.
    // Two sensors in one room on one storey. Neither of those divides them,
    // and Per Sensor still does.
    expect(availableScopes([bind('a'), bind('c')], at)).toEqual([
      'off',
      'sensor',
      'building',
    ]);
  });

  test('offers off and building whatever the readings look like', () => {
    // One group is what Building means, instead of a failure of it.
    expect(availableScopes([], at)).toEqual(['off', 'building']);
  });

  test('ignores a sensor the model knows nothing about', () => {
    expect(availableScopes([bind('a'), bind('unknown')], at)).toEqual([
      'off',
      'building',
    ]);
  });

  test('one sensor is not enough for Per Sensor, since one group is the whole model', () => {
    expect(availableScopes([bind('a')], at)).toEqual(['off', 'building']);
  });

  test('a binding with no GlobalId is skipped without asking the zone function', () => {
    const nodeBinding: Binding = {
      selector: { nodeName: 'Pump-2' },
      label: 'Pump-2',
      source: { live: { transport: 'mqtt', topic: 't/pump2' } },
      display: { unit: 'C', ramp: [0, 1] },
    };
    expect(availableScopes([nodeBinding], at)).toEqual(['off', 'building']);
  });
});

test('every object is in the building, whatever else it is in', () => {
  expect(zoneOf('building', undefined)).toBe('building');
  expect(zoneOf('room', { storey: 'L1' })).toBeUndefined();
  expect(zoneOf('storey', { storey: 'L1' })).toBe('L1');
});

test('off and sensor put nothing in a zone of its own', () => {
  expect(zoneOf('off', { room: 'R1', storey: 'L1' })).toBeUndefined();
  expect(zoneOf('sensor', { room: 'R1', storey: 'L1' })).toBeUndefined();
});

test('nothing known about an object leaves it out of a room or a storey', () => {
  expect(zoneOf('room', undefined)).toBeUndefined();
  expect(zoneOf('storey', undefined)).toBeUndefined();
});

test('several sensors in one zone average', () => {
  // That is what a zone reading is.
  const readings = new Map([
    ['a', { value: 10, receivedAt: NOW }],
    ['b', { value: 20, receivedAt: NOW }],
  ]);
  const zones = zonesOf(
    [binding('a'), binding('b')],
    readings,
    'storey',
    () => 'L1',
    'live',
    DEFAULT_STALE_AFTER_S,
    NOW,
  );

  expect(zones?.meanByZone.get('L1')).toBe(15);
  expect(zones?.counted).toBe(2);
});

test('the range comes from the manifest, not from the readings', () => {
  // A range that rescaled itself would make a steady building look like a
  // changing one.
  const readings = new Map([['a', { value: 100, receivedAt: NOW }]]);
  const zones = zonesOf(
    [binding('a', [4, 16])],
    readings,
    'building',
    () => 'building',
    'live',
    DEFAULT_STALE_AFTER_S,
    NOW,
  );

  expect(zones?.low).toBe(4);
  expect(zones?.high).toBe(16);
});

test('nothing current means no zones at all', () => {
  // This is what makes the colouring disappear when a broker stops, instead
  // of freeze on its last values.
  const readings = new Map([['a', seconds(600)]]);

  expect(
    zonesOf(
      [binding('a')],
      readings,
      'building',
      () => 'building',
      'live',
      DEFAULT_STALE_AFTER_S,
      NOW,
    ),
  ).toBeNull();
  expect(
    zonesOf(
      [binding('a')],
      new Map([['a', seconds(1)]]),
      'building',
      () => 'building',
      'down',
      DEFAULT_STALE_AFTER_S,
      NOW,
    ),
  ).toBeNull();
});

test('the off scope produces nothing without looking at any reading', () => {
  expect(
    zonesOf(
      [binding('a')],
      new Map([['a', seconds(1)]]),
      'off',
      () => 'anything',
      'live',
      DEFAULT_STALE_AFTER_S,
      NOW,
    ),
  ).toBeNull();
});

test('a sensor whose object is in no zone is left out instead of guessed', () => {
  const readings = new Map([
    ['a', { value: 10, receivedAt: NOW }],
    ['b', { value: 30, receivedAt: NOW }],
  ]);
  const zones = zonesOf(
    [binding('a'), binding('b')],
    readings,
    'room',
    (id) => (id === 'a' ? 'R1' : undefined),
    'live',
    DEFAULT_STALE_AFTER_S,
    NOW,
  );

  expect(zones?.counted).toBe(1);
  expect(zones?.meanByZone.get('R1')).toBe(10);
});
