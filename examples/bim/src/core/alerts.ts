/**
 * What is wrong with a sensor, said in words a person can act on.
 *
 * A card that shows a number and nothing else leaves the reader to notice
 * that 92 degC is not a room temperature, or that the last message was an
 * hour ago. Each of those is a different problem with a different response,
 * so each is named separately here.
 *
 * Everything below is derived from data that already arrived: the bounds come
 * from the manifest and the kind and the unit come from the payload. Nothing
 * here holds a threshold of its own, so a building with different limits gets
 * different alerts without a line of this file changing. Nothing imports a
 * renderer, so this runs where there is no canvas.
 */

import { displayOf, type Binding } from 'src/core/binding';
import {
  ageText,
  isLive,
  DEFAULT_STALE_AFTER_S,
  type FeedState,
  type Reading,
} from 'src/core/readings';

/**
 * How much attention an alert asks for.
 *
 * `warn` is something to act on: the sensor is silent, or the value is
 * outside what the model says it should be. `note` is context that changes
 * how the number should be read but is not itself a fault.
 */
export type AlertLevel = 'warn' | 'note';

export interface Alert {
  level: AlertLevel;
  /** Two or three words, for a chip. */
  label: string;
  /** One sentence saying what it means and where the claim comes from. */
  detail: string;
}

/**
 * The one kind the project data schema calls a direct reading.
 *
 * Anything else is derived, and the word is printed as it arrived instead of
 * being mapped to a vocabulary invented here, because a publisher that starts
 * sending a new kind should show that kind instead of falling into an "other"
 * bucket nobody can interpret.
 */
export const MEASURED_KIND = 'sample';

function silenceAlert(
  reading: Reading | undefined,
  feed: FeedState,
  staleAfter: number,
  now: number,
): Alert | undefined {
  if (isLive(reading, feed, staleAfter, now)) return undefined;
  return {
    level: 'warn',
    label: reading === undefined ? 'Never Reported' : 'Not Reporting',
    detail:
      reading === undefined
        ? 'No message has arrived on this topic since the page opened.'
        : `The sensor has gone quiet: ${ageText(reading, feed, staleAfter, now)}.`,
  };
}

function rangeAlert(
  binding: Binding,
  reading: Reading | undefined,
  feed: FeedState,
  staleAfter: number,
  now: number,
): Alert | undefined {
  const { ramp, unit: declared } = displayOf(binding);
  if (reading === undefined || ramp === undefined) return undefined;
  // An old reading that was out of range is already covered by the silence
  // alert, so only a current value is checked against the declared bounds.
  if (!isLive(reading, feed, staleAfter, now)) return undefined;
  const [low, high] = ramp;
  if (reading.value >= low && reading.value <= high) return undefined;
  const bounds =
    `${reading.value} is outside ${low} to ${high} ${declared ?? ''}`.trim();
  return {
    level: 'warn',
    label: reading.value > high ? 'Above Range' : 'Below Range',
    detail: `${bounds}, the range this sensor declares in the model.`,
  };
}

function unitAlert(
  binding: Binding,
  reading: Reading | undefined,
): Alert | undefined {
  const declared = displayOf(binding).unit;
  if (
    reading?.unit === undefined ||
    declared === undefined ||
    reading.unit === declared
  ) {
    return undefined;
  }
  return {
    level: 'warn',
    label: 'Unit Differs',
    detail:
      `The payload says ${reading.unit} and the manifest says ${declared}, ` +
      'so one of the two is wrong about what this number measures.',
  };
}

function kindAlert(reading: Reading | undefined): Alert | undefined {
  if (reading?.kind === undefined || reading.kind === MEASURED_KIND)
    return undefined;
  return {
    level: 'note',
    label: titleOf(reading.kind),
    detail: `The payload declares this value as ${reading.kind}, not as a ${MEASURED_KIND} read off the instrument.`,
  };
}

/** The alerts that apply to one sensor, most urgent first. */
export function alertsOf(
  binding: Binding,
  reading: Reading | undefined,
  feed: FeedState,
  staleAfter = DEFAULT_STALE_AFTER_S,
  now = Date.now(),
): Alert[] {
  const alerts = [
    silenceAlert(reading, feed, staleAfter, now),
    rangeAlert(binding, reading, feed, staleAfter, now),
    unitAlert(binding, reading),
    kindAlert(reading),
  ];
  return alerts.filter((alert): alert is Alert => alert !== undefined);
}

/** How many sensors carry at least one alert of each level. */
export function alertCounts(
  bindings: Binding[],
  readings: Map<string, Reading>,
  objectOfBinding: (binding: Binding) => string | undefined,
  feed: FeedState,
  staleAfter = DEFAULT_STALE_AFTER_S,
  now = Date.now(),
): { warn: number; note: number } {
  let warn = 0;
  let note = 0;
  for (const binding of bindings) {
    const globalId = objectOfBinding(binding);
    const alerts = alertsOf(
      binding,
      globalId === undefined ? undefined : readings.get(globalId),
      feed,
      staleAfter,
      now,
    );
    if (alerts.some((alert) => alert.level === 'warn')) warn += 1;
    else if (alerts.length > 0) note += 1;
  }
  return { warn, note };
}

/** A payload word shown as a label: `prediction` becomes `Prediction`. */
function titleOf(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
