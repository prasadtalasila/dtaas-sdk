import {
  alertsOf,
  alertCounts,
  MEASURED_KIND,
  type Binding,
  type Reading,
} from 'src/core';

const NOW = 1_800_000_000_000;

const binding: Binding = {
  selector: { globalId: 'ts01' },
  label: 'TS-01 room temperature',
  id: 'TS-01',
  source: { live: { transport: 'mqtt', topic: 't/ts01' } },
  display: { unit: 'C', ramp: [10, 50] },
};

/** A reading that arrived just now, so it is live unless a test ages it. */
const reading = (value: number, extra: Partial<Reading> = {}): Reading => ({
  value,
  receivedAt: NOW,
  unit: 'C',
  ...extra,
});

const labels = (alerts: { label: string }[]) =>
  alerts.map((alert) => alert.label);

describe('a sensor that is not speaking', () => {
  test('says so when no message has ever arrived', () => {
    const alerts = alertsOf(binding, undefined, 'live', 30, NOW);

    expect(labels(alerts)).toEqual(['Never Reported']);
    expect(alerts[0].level).toBe('warn');
  });

  test('says so when the last message is older than the stale window', () => {
    const old = { ...reading(21), receivedAt: NOW - 120_000 };

    expect(labels(alertsOf(binding, old, 'live', 30, NOW))).toEqual([
      'Not Reporting',
    ]);
  });

  test('says so when the broker is down, however recent the value', () => {
    expect(labels(alertsOf(binding, reading(21), 'down', 30, NOW))).toEqual([
      'Not Reporting',
    ]);
  });

  test('a live reading inside its range raises nothing', () => {
    expect(alertsOf(binding, reading(21), 'live', 30, NOW)).toEqual([]);
  });
});

describe('the declared range', () => {
  test('a value above the high bound is an alert naming the bounds', () => {
    const alerts = alertsOf(binding, reading(92), 'live', 30, NOW);

    expect(labels(alerts)).toEqual(['Above Range']);
    expect(alerts[0].detail).toMatch(/10 to 50 C/);
  });

  test('a value below the low bound is an alert', () => {
    expect(labels(alertsOf(binding, reading(-4), 'live', 30, NOW))).toEqual([
      'Below Range',
    ]);
  });

  test('the bounds themselves are inside the range', () => {
    expect(alertsOf(binding, reading(10), 'live', 30, NOW)).toEqual([]);
    expect(alertsOf(binding, reading(50), 'live', 30, NOW)).toEqual([]);
  });

  test('a sensor whose manifest declares no ramp cannot be out of range', () => {
    // A malformed or legacy binding that never went through schema
    // validation: alertsOf must still not invent an out-of-range alert.
    const noRamp = { ...binding, display: { unit: 'C' } } as Binding;

    expect(alertsOf(noRamp, reading(999), 'live', 30, NOW)).toEqual([]);
  });

  test('a stale value is reported as silence and not as an excursion', () => {
    // Both at once reads as a live alarm on a sensor that is not reporting,
    // which is the opposite of what is happening.
    const old = { ...reading(92), receivedAt: NOW - 120_000 };

    expect(labels(alertsOf(binding, old, 'live', 30, NOW))).toEqual([
      'Not Reporting',
    ]);
  });
});

describe('a unit the payload disagrees with', () => {
  test('is named, with both units', () => {
    const alerts = alertsOf(
      binding,
      reading(21, { unit: 'F' }),
      'live',
      30,
      NOW,
    );

    expect(labels(alerts)).toEqual(['Unit Differs']);
    expect(alerts[0].detail).toMatch(/F.*C|C.*F/);
  });

  test('a payload that declares no unit is not a disagreement', () => {
    const noUnit = { value: 21, receivedAt: NOW };

    expect(alertsOf(binding, noUnit, 'live', 30, NOW)).toEqual([]);
  });
});

describe('a value that was not measured', () => {
  test('a sample raises nothing, since that is a reading off the instrument', () => {
    const alerts = alertsOf(
      binding,
      reading(21, { kind: MEASURED_KIND }),
      'live',
      30,
      NOW,
    );

    expect(alerts).toEqual([]);
  });

  test('any other kind is noted, with the word the payload used', () => {
    const alerts = alertsOf(
      binding,
      reading(21, { kind: 'prediction' }),
      'live',
      30,
      NOW,
    );

    expect(labels(alerts)).toEqual(['Prediction']);
    expect(alerts[0].level).toBe('note');
    expect(alerts[0].detail).toMatch(/prediction/);
  });

  test('a kind nobody has defined yet still shows, instead of falling into other', () => {
    // A publisher that starts sending a new kind should show that kind. A
    // vocabulary fixed here would hide it.
    const alerts = alertsOf(
      binding,
      reading(21, { kind: 'simulation' }),
      'live',
      30,
      NOW,
    );

    expect(labels(alerts)).toEqual(['Simulation']);
  });

  test('a payload with no kind says nothing about how the value was produced', () => {
    expect(alertsOf(binding, reading(21), 'live', 30, NOW)).toEqual([]);
  });
});

describe('alertCounts', () => {
  const objectOf = (b: Binding) => b.selector.globalId;
  const second: Binding = {
    ...binding,
    selector: { globalId: 'ts02' },
    id: 'TS-02',
  };

  test('counts a sensor once, however many alerts it carries', () => {
    const readings = new Map([
      ['ts01', reading(92, { unit: 'F', kind: 'prediction' })],
    ]);
    const counts = alertCounts([binding], readings, objectOf, 'live', 30, NOW);

    expect(counts).toEqual({ warn: 1, note: 0 });
  });

  test('a note only counts as a note when nothing worse applies', () => {
    const readings = new Map([
      ['ts01', reading(21, { kind: 'prediction' })],
      ['ts02', reading(92)],
    ]);
    const counts = alertCounts(
      [binding, second],
      readings,
      objectOf,
      'live',
      30,
      NOW,
    );

    expect(counts).toEqual({ warn: 1, note: 1 });
  });

  test('every sensor healthy counts nothing', () => {
    const readings = new Map([
      ['ts01', reading(21)],
      ['ts02', reading(22)],
    ]);

    expect(
      alertCounts([binding, second], readings, objectOf, 'live', 30, NOW),
    ).toEqual({
      warn: 0,
      note: 0,
    });
  });

  test('no bindings counts nothing instead of throwing', () => {
    expect(alertCounts([], new Map(), objectOf, 'live', 30, NOW)).toEqual({
      warn: 0,
      note: 0,
    });
  });
});
