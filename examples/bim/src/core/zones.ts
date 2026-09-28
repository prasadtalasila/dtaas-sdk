/**
 * Averaging the current readings of a set of bindings by zone.
 *
 * Split out of `readings.ts` to keep that file under the project's line
 * limit; the zone average is one coherent piece of behaviour with its own
 * accumulator state.
 */

import { displayOf, objectOf, type Binding } from 'src/core/binding';
import {
  isLive,
  DEFAULT_STALE_AFTER_S,
  type FeedState,
  type HeatScope,
  type Reading,
} from 'src/core/readings';

export interface Zones {
  /** The mean reading in each zone. */
  meanByZone: Map<string, number>;
  /** The range the colours span, from the manifest and not from the readings. */
  low: number;
  high: number;
  /** How many readings were current enough to count. */
  counted: number;
}

interface ZoneTotal {
  total: number;
  count: number;
}

interface CurrentZoneReading {
  zone: string;
  reading: Reading;
  ramp: [number, number] | undefined;
}

/** What every zone lookup in one pass shares, bundled to keep call sites short. */
interface ZoneContext {
  readings: Map<string, Reading>;
  zoneAt: (globalId: string) => string | undefined;
  feed: FeedState;
  staleAfter: number;
  now: number;
}

/** The current reading for one binding, and its zone, or undefined to skip it. */
function currentZoneReading(
  binding: Binding,
  ctx: ZoneContext,
): CurrentZoneReading | undefined {
  const globalId = objectOf(binding);
  const reading = globalId ? ctx.readings.get(globalId) : undefined;
  if (
    !globalId ||
    !isLive(reading, ctx.feed, ctx.staleAfter, ctx.now) ||
    reading === undefined
  ) {
    return undefined;
  }
  const zone = ctx.zoneAt(globalId);
  if (zone === undefined) return undefined;
  return { zone, reading, ramp: displayOf(binding).ramp };
}

/** Fold one reading's value into its zone's running total. */
function addToZone(
  totals: Map<string, ZoneTotal>,
  zone: string,
  value: number,
): void {
  const seen = totals.get(zone) ?? { total: 0, count: 0 };
  totals.set(zone, { total: seen.total + value, count: seen.count + 1 });
}

interface ZoneAccumulator {
  totals: Map<string, ZoneTotal>;
  counted: number;
  range: [number, number] | undefined;
}

function accumulateZones(
  bindings: Binding[],
  ctx: ZoneContext,
): ZoneAccumulator {
  const totals = new Map<string, ZoneTotal>();
  let counted = 0;
  let range: [number, number] | undefined;

  for (const binding of bindings) {
    const found = currentZoneReading(binding, ctx);
    if (found) {
      // Several sensors in one zone average, which is what a zone reading is.
      range ??= found.ramp;
      addToZone(totals, found.zone, found.reading.value);
      counted += 1;
    }
  }

  return { totals, counted, range };
}

/**
 * Average the current readings by zone.
 *
 * The range comes from the manifest instead of from the readings, so a colour
 * means the same temperature from one minute to the next; a range that
 * rescaled itself would make a steady building look like a changing one.
 *
 * Returns null when nothing is current, which is what makes the colouring
 * disappear when a broker stops instead of freeze on its last values.
 */
export function zonesOf(
  bindings: Binding[],
  readings: Map<string, Reading>,
  scope: HeatScope,
  zoneAt: (globalId: string) => string | undefined,
  feed: FeedState,
  staleAfter = DEFAULT_STALE_AFTER_S,
  now = Date.now(),
): Zones | null {
  if (scope === 'off') return null;

  const ctx: ZoneContext = { readings, zoneAt, feed, staleAfter, now };
  const { totals, counted, range } = accumulateZones(bindings, ctx);
  if (counted === 0) return null;

  const meanByZone = new Map<string, number>();
  for (const [zone, { total, count }] of totals)
    meanByZone.set(zone, total / count);

  const [low, high] = range ?? [0, 100];
  return { meanByZone, low, high, counted };
}
