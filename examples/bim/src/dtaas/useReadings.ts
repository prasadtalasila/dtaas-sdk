import { useEffect, useMemo, useState } from 'react';
import type {
  SignalSample,
  SignalsService,
} from '@into-cps-association/dtaas-sdk';
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
  { value, ts }: SignalSample,
) => {
  if (typeof value !== 'number' || targets.length === 0) return previous;
  const next = new Map(previous);
  targets.forEach((binding) => {
    const globalId = objectOf(binding);
    if (globalId !== undefined) next.set(globalId, { value, receivedAt: ts });
  });
  return next;
};

/**
 * Reset `readings` when the bound topics change.
 *
 * Done during render, not in the effect below: `react-hooks/set-state-in-effect`
 * refuses a synchronous `setState` at the top of an effect body, and this is
 * the pattern React's own docs recommend for state that must reset when a
 * prop changes (https://react.dev/learn/you-might-not-need-an-effect).
 */
const useResetOnTopicsChange = (topics: string[]) => {
  const [readings, setReadings] = useState(() => new Map<string, Reading>());
  const [seenTopics, setSeenTopics] = useState(topics);
  if (seenTopics !== topics) {
    setSeenTopics(topics);
    setReadings(new Map());
  }
  return [readings, setReadings] as const;
};

/** Latest measured value per GlobalId; a binding's MQTT topic is its signal path. */
const useReadings = (
  signals: SignalsService,
  bindings: Binding[],
): LiveReadings => {
  const topics = useMemo(() => topicsOf(bindings), [bindings]);
  const [readings, setReadings] = useResetOnTopicsChange(topics);
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
