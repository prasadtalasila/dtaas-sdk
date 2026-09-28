import { rampColour, RAMP_STOPS } from 'src/core';

test('the ramp runs cold, light, warm across its range', () => {
  expect(rampColour(4, 4, 16)).toBe(RAMP_STOPS.cold);
  expect(rampColour(10, 4, 16)).toBe(RAMP_STOPS.middle);
  expect(rampColour(16, 4, 16)).toBe(RAMP_STOPS.warm);
});

test('a value outside the range is clamped, not extrapolated', () => {
  // An implausible reading should look like the end of the scale, not like a
  // colour the legend never showed.
  expect(rampColour(-50, 4, 16)).toBe(RAMP_STOPS.cold);
  expect(rampColour(500, 4, 16)).toBe(RAMP_STOPS.warm);
});

test('a range of no width does not divide by zero, and lands at the warm end', () => {
  expect(typeof rampColour(7, 7, 7)).toBe('number');
  expect(rampColour(20, 7, 7)).toBe(RAMP_STOPS.warm);
});

test('every colour is a 24 bit number', () => {
  for (let v = 0; v <= 20; v += 1) {
    const colour = rampColour(v, 4, 16);
    expect(colour).toBeGreaterThanOrEqual(0);
    expect(colour).toBeLessThanOrEqual(0xffffff);
  }
});
