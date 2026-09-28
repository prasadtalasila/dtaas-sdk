/**
 * What a viewer knows about a reading: how old it is, and which scopes it
 * lets a heatmap offer.
 *
 * A stale number shown as current is worse than no number at all, so every
 * reading carries when it arrived and every answer here depends on that.
 * Nothing imports a renderer: a caller supplies the readings and the zone
 * each belongs to, and gets back numbers, so this runs where there is no
 * canvas. Averaging readings by zone is `zones.ts`, split out to keep this
 * file within the project's line limit.
 */

import { objectOf, type Binding } from 'src/core/binding';

/** A value that arrived, and when. */
export interface Reading {
  value: number;
  /** Milliseconds since the epoch, as `Date.now()` gives them. */
  receivedAt: number;
  /** The unit the payload itself declared, when it declared one. */
  unit?: string;
  /**
   * What the payload calls this value: a sample read off the instrument, an
   * average over an interval, a prediction, the output of a simulation. The
   * word is carried through as it arrived, so a viewer can say which of those
   * a number is instead of presenting all four as a measurement.
   */
  kind?: string;
}

/** Whether the transport is connected, which no age can tell on its own. */
export type FeedState = 'live' | 'connecting' | 'down';

/** How old a reading may be before it stops counting as current, in seconds. */
export const DEFAULT_STALE_AFTER_S = 30;

/** Under this many seconds an age reads better in seconds than in minutes. */
const MINUTES_ABOVE_S = 90;

/** How long ago a reading arrived, in seconds, or null when none has. */
export function ageOf(
  reading: Reading | undefined,
  now = Date.now(),
): number | null {
  if (!reading) return null;
  return (now - reading.receivedAt) / 1000;
}

/**
 * Whether a reading counts as current.
 *
 * Both halves matter. A recent reading on a dead connection is a number
 * nobody can date, and a live connection with nothing arriving is silence.
 */
export function isLive(
  reading: Reading | undefined,
  feed: FeedState,
  staleAfter = DEFAULT_STALE_AFTER_S,
  now = Date.now(),
): boolean {
  const age = ageOf(reading, now);
  return feed === 'live' && age !== null && age <= staleAfter;
}

/** The line under a value that says how old it is, in words. */
export function ageText(
  reading: Reading | undefined,
  feed: FeedState,
  staleAfter = DEFAULT_STALE_AFTER_S,
  now = Date.now(),
): string {
  const age = ageOf(reading, now);
  if (age === null) return 'no message yet';

  const seconds = Math.max(0, Math.round(age));
  const when =
    seconds < MINUTES_ABOVE_S
      ? `${seconds} s ago`
      : `${Math.round(seconds / 60)} min ago`;
  return isLive(reading, feed, staleAfter, now)
    ? `updated ${when}`
    : `last message ${when}, not live`;
}

/** What a heatmap averages over. */
export type HeatScope = 'off' | 'sensor' | 'room' | 'storey' | 'building';

/** The order the scopes are offered in, coarsest last. */
export const ALL_SCOPES: HeatScope[] = [
  'off',
  'sensor',
  'room',
  'storey',
  'building',
];

/** Which zone an object belongs to, at one scope. */
export function zoneOf(
  scope: HeatScope,
  where: { room?: string; storey?: string } | undefined,
): string | undefined {
  if (scope === 'building') return 'building';
  if (scope === 'room') return where?.room;
  if (scope === 'storey') return where?.storey;
  return undefined;
}

/**
 * The scopes worth offering, given where the sensors actually are.
 *
 * The question is not whether the model declares storeys, but whether the
 * sensors sit on more than one: a scope that puts every sensor in the same
 * group paints the whole model one colour, which is the building mean under
 * another name, and cycling should never land on it.
 *
 * Off and Building are always offered. Building is one group by definition,
 * and that is its meaning instead of a failure of it.
 */
export function availableScopes(
  bindings: Binding[],
  zoneAt: (globalId: string, scope: HeatScope) => string | undefined,
): HeatScope[] {
  return ALL_SCOPES.filter((scope) => {
    if (scope === 'off' || scope === 'building') return true;
    const groups = new Set<string>();
    for (const binding of bindings) {
      const globalId = objectOf(binding);
      const zone = globalId === undefined ? undefined : zoneAt(globalId, scope);
      if (zone !== undefined) groups.add(zone);
    }
    return groups.size > 1;
  });
}
