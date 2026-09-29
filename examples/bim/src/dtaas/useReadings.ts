import { useEffect, useMemo, useState } from 'react';
import type { Sampled, SignalsService } from '@into-cps-association/dtaas-sdk';
import {
  bindingsByTopic,
  objectOf,
  topicsOf,
  type Binding,
  type FeedState,
  type Reading,
} from 'src/core';

export interface LiveReadings {
  readonly readings: Map<string, Reading>;
  readonly feed: FeedState;
}

const withSample = (
  previous: Map<string, Reading>,
  targets: readonly Binding[],
  { value, ts }: Sampled,
) => {
  if (typeof value !== 'number' || targets.length === 0) return previous;
  const next = new Map(previous);
  targets.forEach((binding) => {
    const globalId = objectOf(binding);
    if (globalId !== undefined) next.set(globalId, { value, receivedAt: ts });
  });
  return next;
};

/** Each bound object's latest stored value, so a card is not blank until the next sample. */
const storedReadings = (signals: SignalsService, bindings: Binding[]) => {
  let readings = new Map<string, Reading>();
  bindingsByTopic(bindings).forEach((targets, topic) => {
    const stored = signals.valueAt(topic, 'measured');
    if (stored) readings = withSample(readings, targets, stored);
  });
  return readings;
};

/**
 * Start `readings` again from the store when the bound topics change.
 *
 * Done during render, not in the effect below: `react-hooks/set-state-in-effect`
 * refuses a synchronous `setState` at the top of an effect body, and this is
 * the pattern React's own docs recommend for state that must reset when a
 * prop changes (https://react.dev/learn/you-might-not-need-an-effect).
 * `topics` changes with `bindings`, so every resubscription starts here.
 */
const useResetOnTopicsChange = (
  signals: SignalsService,
  bindings: Binding[],
  topics: string[],
) => {
  const [readings, setReadings] = useState(() =>
    storedReadings(signals, bindings),
  );
  const [seen, setSeen] = useState({ signals, topics });
  if (seen.signals !== signals || seen.topics !== topics) {
    setSeen({ signals, topics });
    setReadings(storedReadings(signals, bindings));
  }
  return [readings, setReadings] as const;
};

/** Latest measured value per GlobalId; a binding's MQTT topic is its signal path. */
const useReadings = (
  signals: SignalsService,
  bindings: Binding[],
): LiveReadings => {
  const topics = useMemo(() => topicsOf(bindings), [bindings]);
  const [readings, setReadings] = useResetOnTopicsChange(
    signals,
    bindings,
    topics,
  );
  const feed = signals.connection.use(topics);
  useEffect(() => {
    if (topics.length === 0) return undefined;
    const byTopic = bindingsByTopic(bindings);
    return signals.subscribe(topics, 'measured', (sample) =>
      setReadings((previous) =>
        withSample(previous, byTopic.get(sample.signalPath) ?? [], sample),
      ),
    );
  }, [signals, bindings, topics, setReadings]);
  return { readings, feed };
};

export default useReadings;
