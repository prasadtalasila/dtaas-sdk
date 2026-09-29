/**
 * Shared fixtures for the readings, zones and scene-view unit tests: a fixed
 * clock, a reading of a given age, and a live-bound sensor binding.
 */

import type { Binding, Reading } from 'src/core';

/** The fixed "now" every reading's age is measured against. */
export const NOW = 1_800_000_000_000;

/** A reading of 20 that arrived `n` seconds before `NOW`. */
export const seconds = (n: number): Reading => ({
  value: 20,
  receivedAt: NOW - n * 1000,
});

/** A binding of `globalId` to its own MQTT topic, with the given ramp. */
export function binding(
  globalId: string,
  ramp: [number, number] = [4, 16],
  unit = '°C',
): Binding {
  return {
    selector: { globalId },
    label: globalId,
    source: { live: { transport: 'mqtt', topic: `t/${globalId}` } },
    display: { unit, ramp },
  };
}
