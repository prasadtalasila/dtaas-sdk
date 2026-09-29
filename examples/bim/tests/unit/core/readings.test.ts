import {
  ageOf,
  ageText,
  isLive,
  DEFAULT_STALE_AFTER_S,
  type Reading,
} from 'src/core';
import { NOW, seconds } from 'tests/fixtures/readings';

test('ageOf falls back to the current time when none is given', () => {
  const recent: Reading = { value: 1, receivedAt: Date.now() };
  expect(ageOf(recent)).toBeGreaterThanOrEqual(0);
});

test('a reading that never arrived has no age', () => {
  expect(ageOf(undefined, NOW)).toBeNull();
  expect(ageText(undefined, 'live', DEFAULT_STALE_AFTER_S, NOW)).toBe(
    'no message yet',
  );
});

test('a recent reading on a live feed is current', () => {
  expect(isLive(seconds(5), 'live', DEFAULT_STALE_AFTER_S, NOW)).toBe(true);
});

test('a recent reading on a dead feed is not current', () => {
  // A number nobody can date is worse than no number.
  expect(isLive(seconds(1), 'down', DEFAULT_STALE_AFTER_S, NOW)).toBe(false);
});

test('an old reading on a live feed is not current', () => {
  expect(
    isLive(
      seconds(DEFAULT_STALE_AFTER_S + 1),
      'live',
      DEFAULT_STALE_AFTER_S,
      NOW,
    ),
  ).toBe(false);
});

test('the boundary counts as current, one second past it does not', () => {
  expect(
    isLive(seconds(DEFAULT_STALE_AFTER_S), 'live', DEFAULT_STALE_AFTER_S, NOW),
  ).toBe(true);
  expect(
    isLive(
      seconds(DEFAULT_STALE_AFTER_S + 0.1),
      'live',
      DEFAULT_STALE_AFTER_S,
      NOW,
    ),
  ).toBe(false);
});

test('age reads in seconds while it is short and in minutes once it is not', () => {
  expect(ageText(seconds(5), 'live', DEFAULT_STALE_AFTER_S, NOW)).toBe(
    'updated 5 s ago',
  );
  expect(ageText(seconds(600), 'down', DEFAULT_STALE_AFTER_S, NOW)).toMatch(
    /^last message 10 min ago/,
  );
});

test('a stale reading says so instead of looking updated', () => {
  expect(ageText(seconds(120), 'live', DEFAULT_STALE_AFTER_S, NOW)).toMatch(
    /not live$/,
  );
});
