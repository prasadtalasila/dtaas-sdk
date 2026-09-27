import type { SignalsService } from 'src/host/visualisation.types';
import type { TbEntity } from 'src/visualisation/digitalTwin.types';
import type {
  Channel,
  Sampled,
  SignalSample,
  SignalSink,
} from 'src/visualisation/signal.types';
import createFakePlayhead, {
  type FakePlayhead,
} from 'src/testing/fakePlayhead';

export interface FakeSignalsOptions {
  /** Clock used while the playhead is live. Defaults to `Date.now`. */
  readonly now?: () => number;
  readonly entities?: readonly TbEntity[];
}

export interface FakeSignals extends SignalsService {
  readonly playhead: FakePlayhead;
  /** Store samples and deliver them to matching subscribers. */
  emit(...samples: SignalSample[]): void;
  /** Every sample emitted so far, in emission order. */
  samples(): SignalSample[];
}

interface Subscription {
  readonly paths: ReadonlySet<string>;
  readonly channel: Channel;
  readonly sink: SignalSink;
}

const toSampled = ({ value, ts, quality }: SignalSample): Sampled =>
  quality === undefined ? { value, ts } : { value, ts, quality };

const latestAtOrBefore = (samples: SignalSample[], t: number) =>
  samples
    .filter((s) => s.ts <= t)
    .reduce<SignalSample | undefined>(
      (best, s) => (best === undefined || s.ts >= best.ts ? s : best),
      undefined,
    );

const createRegistry = (entities: readonly TbEntity[]) => ({
  search: async (query: string) =>
    entities.filter((e) =>
      `${e.name} ${e.label ?? ''}`.toLowerCase().includes(query.toLowerCase()),
    ),
  get: async (id: string) => {
    const entity = entities.find((e) => e.id === id);
    if (!entity) throw new Error(`No such entity: ${id}`);
    return entity;
  },
});

/** An in-memory temporal store: what the common core provides to kits. */
const createFakeSignals = (options: FakeSignalsOptions = {}): FakeSignals => {
  const all: SignalSample[] = [];
  const subscriptions = new Set<Subscription>();
  const playhead = createFakePlayhead(options.now ?? Date.now);
  const matching = (paths: string[], channel: Channel) =>
    all.filter((s) => s.channel === channel && paths.includes(s.signalPath));
  const deliver = (sample: SignalSample) =>
    subscriptions.forEach((sub) => {
      if (sub.channel === sample.channel && sub.paths.has(sample.signalPath)) {
        sub.sink(sample);
      }
    });
  return {
    playhead,
    registry: createRegistry(options.entities ?? []),
    samples: () => [...all],
    emit: (...samples) => {
      all.push(...samples);
      samples.forEach(deliver);
      playhead.notify();
    },
    subscribe: (paths, channel, sink) => {
      const subscription = { paths: new Set(paths), channel, sink };
      subscriptions.add(subscription);
      return () => subscriptions.delete(subscription);
    },
    valueAt: (path, channel, t = playhead.get()) => {
      const found = latestAtOrBefore(matching([path], channel), t);
      return found && toSampled(found);
    },
    range: async (paths, channel, from, to) =>
      matching(paths, channel)
        .filter((s) => s.ts >= from && s.ts <= to)
        .sort((a, b) => a.ts - b.ts),
  };
};

export default createFakeSignals;
